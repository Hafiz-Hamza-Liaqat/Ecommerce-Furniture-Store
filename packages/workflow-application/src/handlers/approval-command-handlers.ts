/**
 * Thin approval operator command handlers — delegate to ApprovalEngine.
 */

import type { CommandHandler } from "@afh/application";
import {
  NotFoundError,
  ValidationError,
  fail,
} from "@afh/shared-kernel";
import type {
  ApprovalDefinitionRecord,
  ApprovalRequestRecord,
} from "@afh/platform";
import {
  ApprovalCommandTypes,
  ApprovalPolicyActions,
} from "../constants.js";
import type {
  ClaimApprovalRequestPayload,
  DecideApprovalRequestPayload,
  DelegateApprovalRequestPayload,
  RegisterApprovalDefinitionPayload,
  SubmitApprovalRequestPayload,
} from "../commands/commands.js";
import {
  claimApprovalRequestValidator,
  decideApprovalRequestValidator,
  delegateApprovalRequestValidator,
  registerApprovalDefinitionValidator,
  submitApprovalRequestValidator,
} from "../validators/validators.js";
import {
  approvalOrFail,
  companyResource,
  requireCompanyId,
  requireOptionalCompanyId,
} from "../support/support.js";

export function createRegisterApprovalDefinitionHandler(): CommandHandler<
  RegisterApprovalDefinitionPayload,
  ApprovalDefinitionRecord
> {
  return {
    commandType: ApprovalCommandTypes.RegisterDefinition,
    authorize(command, ctx) {
      return companyResource(
        "approval_definition",
        ApprovalPolicyActions.DefinitionCreate,
        command.payload.companyId ?? ctx.companyId ?? "global",
        null,
      );
    },
    validate() {
      return registerApprovalDefinitionValidator;
    },
    async handle(command, ctx) {
      const scope = requireOptionalCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;
      const approval = approvalOrFail(ctx);
      if (!approval.ok) return approval;

      return approval.value.registerDefinition({
        companyId: scope.value,
        type: command.payload.type,
        name: command.payload.name,
      });
    },
  };
}

export function createSubmitApprovalRequestHandler(): CommandHandler<
  SubmitApprovalRequestPayload,
  ApprovalRequestRecord
> {
  return {
    commandType: ApprovalCommandTypes.SubmitRequest,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "approval_request",
        ApprovalPolicyActions.RequestSubmit,
        p.companyId,
        p.subjectId,
      );
    },
    validate() {
      return submitApprovalRequestValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;
      const approval = approvalOrFail(ctx);
      if (!approval.ok) return approval;
      if (!ctx.userId?.trim()) {
        return fail(
          new ValidationError("Authenticated user required to submit approval", {
            code: "user_required",
          }),
        );
      }

      return approval.value.submit({
        companyId: scope.value,
        branchId: command.payload.branchId ?? ctx.branchId,
        type: command.payload.type,
        subjectType: command.payload.subjectType,
        subjectId: command.payload.subjectId,
        payload: command.payload.payload ?? {},
        submittedByUserId: ctx.userId,
        escalateAfterHours: command.payload.escalateAfterHours ?? null,
      });
    },
  };
}

export function createClaimApprovalRequestHandler(): CommandHandler<
  ClaimApprovalRequestPayload,
  ApprovalRequestRecord
> {
  return {
    commandType: ApprovalCommandTypes.ClaimRequest,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "approval_request",
        ApprovalPolicyActions.RequestClaim,
        p.companyId,
        p.requestId,
      );
    },
    validate() {
      return claimApprovalRequestValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;
      const approval = approvalOrFail(ctx);
      if (!approval.ok) return approval;
      if (!ctx.userId?.trim()) {
        return fail(
          new ValidationError("Authenticated user required to claim approval", {
            code: "user_required",
          }),
        );
      }

      const existing = await approval.value.getRequest(command.payload.requestId);
      if (!existing.ok) return existing;
      if (!existing.value || existing.value.companyId !== scope.value) {
        return fail(
          new NotFoundError("Approval request not found", {
            code: "approval_not_found",
          }),
        );
      }

      return approval.value.claim(command.payload.requestId, ctx.userId);
    },
  };
}

export function createDecideApprovalRequestHandler(): CommandHandler<
  DecideApprovalRequestPayload,
  ApprovalRequestRecord
> {
  return {
    commandType: ApprovalCommandTypes.DecideRequest,
    authorize(command) {
      const p = command.payload;
      const action =
        p.decision === "approved"
          ? ApprovalPolicyActions.RequestApprove
          : ApprovalPolicyActions.RequestReject;
      return companyResource(
        "approval_request",
        action,
        p.companyId,
        p.requestId,
      );
    },
    validate() {
      return decideApprovalRequestValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;
      const approval = approvalOrFail(ctx);
      if (!approval.ok) return approval;
      if (!ctx.userId?.trim()) {
        return fail(
          new ValidationError("Authenticated user required to decide approval", {
            code: "user_required",
          }),
        );
      }

      const existing = await approval.value.getRequest(command.payload.requestId);
      if (!existing.ok) return existing;
      if (!existing.value || existing.value.companyId !== scope.value) {
        return fail(
          new NotFoundError("Approval request not found", {
            code: "approval_not_found",
          }),
        );
      }

      return approval.value.decide({
        requestId: command.payload.requestId,
        reviewerUserId: ctx.userId,
        decision: command.payload.decision,
        reason: command.payload.reason ?? null,
      });
    },
  };
}

export function createDelegateApprovalRequestHandler(): CommandHandler<
  DelegateApprovalRequestPayload,
  ApprovalRequestRecord
> {
  return {
    commandType: ApprovalCommandTypes.DelegateRequest,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "approval_request",
        ApprovalPolicyActions.RequestDelegate,
        p.companyId,
        p.requestId,
      );
    },
    validate() {
      return delegateApprovalRequestValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;
      const approval = approvalOrFail(ctx);
      if (!approval.ok) return approval;
      if (!ctx.userId?.trim()) {
        return fail(
          new ValidationError(
            "Authenticated user required to delegate approval",
            { code: "user_required" },
          ),
        );
      }

      const existing = await approval.value.getRequest(command.payload.requestId);
      if (!existing.ok) return existing;
      if (!existing.value || existing.value.companyId !== scope.value) {
        return fail(
          new NotFoundError("Approval request not found", {
            code: "approval_not_found",
          }),
        );
      }

      return approval.value.delegate({
        requestId: command.payload.requestId,
        fromUserId: ctx.userId,
        toUserId: command.payload.toUserId,
      });
    },
  };
}
