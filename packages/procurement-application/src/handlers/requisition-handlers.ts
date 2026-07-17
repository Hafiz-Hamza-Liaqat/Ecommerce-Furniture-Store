import type { CommandHandler } from "@afh/application";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  PurchaseRequisition,
  PurchaseRequisitionStatus,
  RequisitionLine,
} from "@afh/procurement";
import { ProcurementEventTypes } from "@afh/procurement";
import {
  ProcurementApprovalTypes,
  ProcurementCommandTypes,
  ProcurementPolicyActions,
  ProcurementRuleSetCodes,
  ProcurementSubjectTypes,
  ProcurementWorkflowCodes,
} from "../constants.js";
import type {
  CreatePurchaseRequisitionPayload,
  SubmitPurchaseRequisitionPayload,
} from "../commands/commands.js";
import {
  createPurchaseRequisitionCommandValidator,
  submitPurchaseRequisitionCommandValidator,
} from "../validators/validators.js";
import type { ProcurementHandlerDeps } from "./deps.js";
import {
  approvalOrNull,
  buildProcurementEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  invokeProcurementRules,
  newEntityId,
  recordProcurementAudit,
  requireApproval,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

function mapRequisitionStatus(projection: string): PurchaseRequisitionStatus {
  const known: PurchaseRequisitionStatus[] = [
    "draft",
    "submitted",
    "approved",
    "rejected",
    "converted",
    "cancelled",
  ];
  return (known.includes(projection as PurchaseRequisitionStatus)
    ? projection
    : "draft") as PurchaseRequisitionStatus;
}

export function createCreatePurchaseRequisitionHandler(
  deps: ProcurementHandlerDeps,
): CommandHandler<CreatePurchaseRequisitionPayload, { requisitionId: string }> {
  return {
    commandType: ProcurementCommandTypes.CreatePurchaseRequisition,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "requisition",
        ProcurementPolicyActions.RequisitionCreate,
        p.companyId,
        null,
        {
          ownerUserId: p.requestedByUserId ?? null,
          attributes: {
            projectId: p.projectId ?? null,
            warehouseId: p.warehouseId ?? null,
          },
        },
      );
    },
    validate() {
      return createPurchaseRequisitionCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const limits = await invokeProcurementRules(
        ctx,
        ProcurementRuleSetCodes.PurchasingLimits,
        {
          companyId: scope.value,
          lines: command.payload.lines,
          projectId: command.payload.projectId ?? null,
          warehouseId: command.payload.warehouseId ?? null,
        },
      );
      if (!limits.ok) return limits;

      const requisitionId = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: ProcurementWorkflowCodes.PurchaseRequisition,
        subjectType: ProcurementSubjectTypes.PurchaseRequisition,
        subjectId: requisitionId,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const requisition: PurchaseRequisition = {
        id: requisitionId,
        companyId: scope.value,
        number: p.number,
        status: mapRequisitionStatus(started.value.statusProjection),
        requestedByUserId: p.requestedByUserId ?? ctx.userId,
        projectId: p.projectId ?? null,
        warehouseId: p.warehouseId ?? null,
        notes: p.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.requisitions.save(requisition);
      if (!saved.ok) return saved;

      for (let i = 0; i < p.lines.length; i++) {
        const intent = p.lines[i]!;
        const line: RequisitionLine = {
          id: newEntityId(),
          requisitionId,
          companyId: scope.value,
          lineNumber: i + 1,
          productId: intent.productId ?? null,
          variantId: intent.variantId ?? null,
          inventoryItemId: intent.inventoryItemId ?? null,
          description: intent.description,
          quantity: intent.quantity,
          unitCode: intent.unitCode ?? null,
          neededBy: intent.neededBy ?? null,
        };
        const savedLine = await deps.requisitions.saveLine(line);
        if (!savedLine.ok) return savedLine;
      }

      const event = buildProcurementEvent({
        eventType: ProcurementEventTypes.PurchaseRequisitionCreated,
        aggregateType: "purchase_requisition",
        aggregateId: requisitionId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { requisitionId, companyId: scope.value },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordProcurementAudit(deps.audit, ctx, {
        action: ProcurementCommandTypes.CreatePurchaseRequisition,
        entityType: "purchase_requisition",
        entityId: requisitionId,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ requisitionId });
    },
  };
}

export function createSubmitPurchaseRequisitionHandler(
  deps: ProcurementHandlerDeps,
): CommandHandler<
  SubmitPurchaseRequisitionPayload,
  {
    requisitionId: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: ProcurementCommandTypes.SubmitPurchaseRequisition,
    authorize(command) {
      return companyResource(
        "requisition",
        ProcurementPolicyActions.RequisitionSubmit,
        command.payload.companyId,
        command.payload.requisitionId,
      );
    },
    validate() {
      return submitPurchaseRequisitionCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.requisitions.findById({
        companyId: scope.value,
        id: command.payload.requisitionId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Purchase requisition not found", {
            code: "requisition_not_found",
          }),
        );
      }
      if (existing.value.status !== "draft") {
        return fail(
          new ConflictError("Only draft requisitions can be submitted", {
            code: "requisition_not_draft",
          }),
        );
      }

      const thresholds = await invokeProcurementRules(
        ctx,
        ProcurementRuleSetCodes.ApprovalThresholds,
        {
          companyId: scope.value,
          requisitionId: existing.value.id,
        },
      );
      if (!thresholds.ok) return thresholds;

      const p = command.payload;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError(
              "ApprovalEngine required for requisition submit",
              { code: "approval_not_wired" },
            ),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: ProcurementApprovalTypes.PurchaseRequisitionSubmit,
          subjectType: ProcurementSubjectTypes.PurchaseRequisition,
          subjectId: p.requisitionId,
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordProcurementAudit(deps.audit, ctx, {
          action: ProcurementCommandTypes.SubmitPurchaseRequisition,
          entityType: "purchase_requisition",
          entityId: p.requisitionId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          requisitionId: p.requisitionId,
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;
      if (!p.workflowInstanceId?.trim()) {
        return fail(
          new ConflictError(
            "workflowInstanceId is required to submit requisition",
            { code: "workflow_instance_required" },
          ),
        );
      }

      const transitioned = await wf.value.transition({
        instanceId: p.workflowInstanceId,
        transitionCode: p.transitionCode ?? "submit",
        actorUserId: ctx.userId,
      });
      if (!transitioned.ok) return transitioned;

      const now = ctx.clock.now().toISOString();
      const updated: PurchaseRequisition = {
        ...existing.value,
        status: mapRequisitionStatus(transitioned.value.statusProjection),
        updatedAt: now,
      };

      const saved = await deps.requisitions.save(updated);
      if (!saved.ok) return saved;

      await recordProcurementAudit(deps.audit, ctx, {
        action: ProcurementCommandTypes.SubmitPurchaseRequisition,
        entityType: "purchase_requisition",
        entityId: updated.id,
        outcome: "success",
        details: { workflowInstanceId: p.workflowInstanceId },
      });

      return ok({
        requisitionId: updated.id,
        pendingApproval: false,
      });
    },
  };
}
