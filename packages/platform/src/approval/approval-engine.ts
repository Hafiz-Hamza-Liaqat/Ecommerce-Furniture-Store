/**
 * Approval Engine — human decision gates (no business-specific flows).
 */

import {
  ConflictError,
  NotFoundError,
  ValidationError,
  fail,
  isFail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { SecurityAuditService } from "@afh/identity";
import { newId } from "../util/ids.js";
import type {
  ApprovalActionRecord,
  ApprovalDefinitionRecord,
  ApprovalRequestRecord,
  ApprovalRequestStatus,
} from "./models.js";
import type { ApprovalStore } from "./approval-store.js";
import type {
  ApprovalDecidedPayload,
  ApprovalEscalatedPayload,
  ApprovalSubmittedPayload,
} from "../events/engine-events.js";
import type { ApprovalAssignmentResolver } from "./assignment-resolver.js";

export type ApprovalEventSink = {
  emitSubmitted?(payload: ApprovalSubmittedPayload): Promise<void>;
  emitDecided?(payload: ApprovalDecidedPayload): Promise<void>;
  emitEscalated?(payload: ApprovalEscalatedPayload): Promise<void>;
};

export type EscalationHook = (request: ApprovalRequestRecord) => Promise<void>;
export type DelegationHook = (input: {
  readonly request: ApprovalRequestRecord;
  readonly fromUserId: string;
  readonly toUserId: string;
}) => Promise<void>;

export class ApprovalEngine {
  constructor(
    private readonly store: ApprovalStore,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
    private readonly events?: ApprovalEventSink,
    private readonly onEscalate?: EscalationHook,
    private readonly onDelegate?: DelegationHook,
    private readonly assignmentResolver?: ApprovalAssignmentResolver,
  ) {}

  async registerDefinition(input: {
    readonly companyId: string | null;
    readonly type: string;
    readonly name: string;
  }): Promise<Result<ApprovalDefinitionRecord, PlatformError>> {
    const existing = await this.store.getDefinitionByType(
      input.companyId,
      input.type,
    );
    if (existing) {
      return fail(
        new ConflictError("Approval type already registered", {
          code: "approval_type_exists",
        }),
      );
    }
    const definition: ApprovalDefinitionRecord = {
      id: newId("adef"),
      companyId: input.companyId,
      type: input.type,
      name: input.name,
      createdAt: this.clock.now().toISOString(),
    };
    await this.store.saveDefinition(definition);
    return ok(definition);
  }

  async submit(input: {
    readonly companyId: string;
    readonly branchId?: string | null;
    readonly type: string;
    readonly subjectType: string;
    readonly subjectId: string;
    readonly payload?: Readonly<Record<string, unknown>>;
    readonly submittedByUserId: string;
    readonly escalateAfterHours?: number | null;
  }): Promise<Result<ApprovalRequestRecord, PlatformError>> {
    const now = this.clock.now().toISOString();
    const payload = input.payload ?? {};

    let reviewerUserId: string | null = null;
    let escalateAfterHours = input.escalateAfterHours ?? null;

    if (this.assignmentResolver) {
      const resolved = await this.assignmentResolver({
        companyId: input.companyId,
        branchId: input.branchId ?? null,
        type: input.type,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        payload,
        submittedByUserId: input.submittedByUserId,
      });
      if (isFail(resolved)) {
        return resolved;
      }
      reviewerUserId = resolved.value.reviewerUserId;
      if (escalateAfterHours === null) {
        escalateAfterHours = resolved.value.escalateAfterHours;
      }
    }

    const request: ApprovalRequestRecord = {
      id: newId("areq"),
      companyId: input.companyId,
      branchId: input.branchId ?? null,
      type: input.type,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      status: reviewerUserId ? "under_review" : "submitted",
      payload,
      submittedByUserId: input.submittedByUserId,
      reviewerUserId,
      delegatedToUserId: null,
      escalateAfterHours,
      decisionReason: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.store.saveRequest(request);
    await this.#action(request.id, input.submittedByUserId, "submit", null);
    if (reviewerUserId) {
      await this.#action(request.id, "system", "claim", `assigned:${reviewerUserId}`);
    }
    await this.audit.record({
      companyId: input.companyId,
      actorUserId: input.submittedByUserId,
      action: "approval.submitted",
      entityType: "approval_request",
      entityId: request.id,
      outcome: "success",
      details: {
        type: input.type,
        reviewerUserId,
        escalateAfterHours,
      },
    });
    await this.events?.emitSubmitted?.({
      requestId: request.id,
      approvalType: input.type,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      reviewerUserId,
    });
    return ok(request);
  }

  async claim(
    requestId: string,
    reviewerUserId: string,
  ): Promise<Result<ApprovalRequestRecord, PlatformError>> {
    return this.#updateStatus(requestId, "under_review", reviewerUserId, {
      reviewerUserId,
      action: "claim",
    });
  }

  async decide(input: {
    readonly requestId: string;
    readonly reviewerUserId: string;
    readonly decision: "approved" | "rejected" | "changes_requested";
    readonly reason?: string | null;
  }): Promise<Result<ApprovalRequestRecord, PlatformError>> {
    const statusMap: Record<
      typeof input.decision,
      ApprovalRequestStatus
    > = {
      approved: "approved",
      rejected: "rejected",
      changes_requested: "changes_requested",
    };
    const actionMap = {
      approved: "approve" as const,
      rejected: "reject" as const,
      changes_requested: "request_changes" as const,
    };

    const updated = await this.#updateStatus(
      input.requestId,
      statusMap[input.decision],
      input.reviewerUserId,
      {
        reviewerUserId: input.reviewerUserId,
        action: actionMap[input.decision],
        reason: input.reason ?? null,
      },
    );
    if (isFail(updated)) return updated;

    await this.events?.emitDecided?.({
      requestId: updated.value.id,
      approvalType: updated.value.type,
      decision: input.decision,
      reviewerUserId: input.reviewerUserId,
      subjectType: updated.value.subjectType,
      subjectId: updated.value.subjectId,
    });
    return updated;
  }

  async delegate(input: {
    readonly requestId: string;
    readonly fromUserId: string;
    readonly toUserId: string;
  }): Promise<Result<ApprovalRequestRecord, PlatformError>> {
    const request = await this.store.getRequest(input.requestId);
    if (!request) {
      return fail(
        new NotFoundError("Approval request not found", {
          code: "approval_not_found",
        }),
      );
    }
    if (
      request.status !== "submitted" &&
      request.status !== "under_review"
    ) {
      return fail(
        new ValidationError("Cannot delegate closed approval", {
          code: "approval_closed",
        }),
      );
    }
    const updated: ApprovalRequestRecord = {
      ...request,
      delegatedToUserId: input.toUserId,
      reviewerUserId: input.toUserId,
      status: "under_review",
      updatedAt: this.clock.now().toISOString(),
    };
    await this.store.saveRequest(updated);
    await this.#action(
      request.id,
      input.fromUserId,
      "delegate",
      `delegated_to:${input.toUserId}`,
    );
    await this.onDelegate?.({
      request: updated,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
    });
    await this.audit.record({
      companyId: request.companyId,
      actorUserId: input.fromUserId,
      action: "approval.delegated",
      entityType: "approval_request",
      entityId: request.id,
      outcome: "success",
      details: { toUserId: input.toUserId },
    });
    return ok(updated);
  }

  async escalateDueRequests(
    companyId: string,
  ): Promise<Result<readonly ApprovalRequestRecord[], PlatformError>> {
    const candidates = await this.store.listOpen(companyId);
    const escalated: ApprovalRequestRecord[] = [];
    for (const request of candidates) {
      if (request.escalateAfterHours === null) continue;
      const created = new Date(request.createdAt).getTime();
      const deadline =
        created + request.escalateAfterHours * 60 * 60 * 1000;
      if (this.clock.now().getTime() <= deadline) continue;

      let updated = request;
      if (this.assignmentResolver) {
        const resolved = await this.assignmentResolver({
          companyId: request.companyId,
          branchId: request.branchId,
          type: request.type,
          subjectType: request.subjectType,
          subjectId: request.subjectId,
          payload: {
            ...request.payload,
            preferredReviewerUserId:
              request.payload["escalationReviewerUserId"] ??
              request.payload["preferredReviewerUserId"],
          },
          submittedByUserId: request.submittedByUserId,
          escalated: true,
        });
        if (
          resolved.ok &&
          resolved.value.reviewerUserId &&
          resolved.value.reviewerUserId !== request.reviewerUserId
        ) {
          updated = {
            ...request,
            reviewerUserId: resolved.value.reviewerUserId,
            status: "under_review",
            updatedAt: this.clock.now().toISOString(),
          };
          await this.store.saveRequest(updated);
        }
      }

      await this.#action(request.id, "system", "escalate", "sla_exceeded");
      await this.events?.emitEscalated?.({
        requestId: updated.id,
        approvalType: updated.type,
        subjectType: updated.subjectType,
        subjectId: updated.subjectId,
        escalateAfterHours: updated.escalateAfterHours ?? 0,
        reviewerUserId: updated.reviewerUserId,
      });
      await this.onEscalate?.(updated);
      await this.audit.record({
        companyId: request.companyId,
        actorUserId: null,
        action: "approval.escalated",
        entityType: "approval_request",
        entityId: request.id,
        outcome: "success",
        details: { reviewerUserId: updated.reviewerUserId },
      });
      escalated.push(updated);
    }
    return ok(escalated);
  }

  async listHistory(
    requestId: string,
  ): Promise<Result<readonly ApprovalActionRecord[], PlatformError>> {
    return ok(await this.store.listActions(requestId));
  }

  async getRequest(
    requestId: string,
  ): Promise<Result<ApprovalRequestRecord | null, PlatformError>> {
    return ok(await this.store.getRequest(requestId));
  }

  async listRequests(filter: {
    readonly companyId: string;
    readonly type?: string;
    readonly openOnly?: boolean;
  }): Promise<Result<readonly ApprovalRequestRecord[], PlatformError>> {
    return ok(await this.store.listRequests(filter));
  }

  async getDefinitionByType(
    companyId: string | null,
    type: string,
  ): Promise<Result<ApprovalDefinitionRecord | null, PlatformError>> {
    return ok(await this.store.getDefinitionByType(companyId, type));
  }

  async listDefinitions(filter?: {
    readonly companyId?: string | null;
  }): Promise<Result<readonly ApprovalDefinitionRecord[], PlatformError>> {
    return ok(await this.store.listDefinitions(filter));
  }

  async #updateStatus(
    requestId: string,
    status: ApprovalRequestStatus,
    actorUserId: string,
    meta: {
      readonly reviewerUserId?: string;
      readonly action: ApprovalActionRecord["action"];
      readonly reason?: string | null;
    },
  ): Promise<Result<ApprovalRequestRecord, PlatformError>> {
    const request = await this.store.getRequest(requestId);
    if (!request) {
      return fail(
        new NotFoundError("Approval request not found", {
          code: "approval_not_found",
        }),
      );
    }
    if (
      status !== "under_review" &&
      request.status !== "submitted" &&
      request.status !== "under_review"
    ) {
      return fail(
        new ValidationError("Approval already decided", {
          code: "approval_already_decided",
        }),
      );
    }

    const updated: ApprovalRequestRecord = {
      ...request,
      status,
      reviewerUserId: meta.reviewerUserId ?? request.reviewerUserId,
      decisionReason: meta.reason ?? request.decisionReason,
      updatedAt: this.clock.now().toISOString(),
    };
    await this.store.saveRequest(updated);
    await this.#action(
      requestId,
      actorUserId,
      meta.action,
      meta.reason ?? null,
    );
    await this.audit.record({
      companyId: request.companyId,
      actorUserId,
      action: `approval.${meta.action}`,
      entityType: "approval_request",
      entityId: requestId,
      outcome: "success",
      details: { status },
    });
    return ok(updated);
  }

  async #action(
    requestId: string,
    actorUserId: string,
    action: ApprovalActionRecord["action"],
    comment: string | null,
  ): Promise<void> {
    await this.store.appendAction({
      id: newId("aact"),
      approvalRequestId: requestId,
      actorUserId,
      action,
      comment,
      createdAt: this.clock.now().toISOString(),
    });
  }
}
