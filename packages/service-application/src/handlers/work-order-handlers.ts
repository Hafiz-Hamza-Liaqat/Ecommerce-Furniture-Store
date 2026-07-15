import type { CommandHandler } from "@afh/application";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type { WorkOrder, WorkOrderStatus } from "@afh/service";
import { ServiceEventTypes } from "@afh/service";
import {
  ServiceApprovalTypes,
  ServiceCommandTypes,
  ServicePolicyActions,
  ServiceRuleSetCodes,
  ServiceSubjectTypes,
  ServiceWorkflowCodes,
} from "../constants.js";
import type {
  CompleteWorkOrderPayload,
  CreateWorkOrderPayload,
  UpdateWorkOrderPayload,
} from "../commands/commands.js";
import {
  completeWorkOrderCommandValidator,
  createWorkOrderCommandValidator,
  updateWorkOrderCommandValidator,
} from "../validators/validators.js";
import type { ServiceHandlerDeps } from "./deps.js";
import {
  approvalOrNull,
  buildServiceEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  invokeServiceRules,
  newEntityId,
  recordServiceAudit,
  requireApproval,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

function mapWorkOrderStatus(projection: string): WorkOrderStatus {
  const known: WorkOrderStatus[] = [
    "draft",
    "planned",
    "in_progress",
    "completed",
    "cancelled",
  ];
  return (known.includes(projection as WorkOrderStatus)
    ? projection
    : "draft") as WorkOrderStatus;
}

export function createCreateWorkOrderHandler(
  deps: ServiceHandlerDeps,
): CommandHandler<CreateWorkOrderPayload, { workOrderId: string }> {
  return {
    commandType: ServiceCommandTypes.CreateWorkOrder,
    authorize(command) {
      return companyResource(
        "work_order",
        ServicePolicyActions.WorkOrderCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createWorkOrderCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;

      if (p.serviceRequestId) {
        const request = await deps.serviceRequests.findById({
          companyId: scope.value,
          id: p.serviceRequestId,
        });
        if (!request.ok) return request;
        if (!request.value) {
          return fail(
            new NotFoundError("Service request not found", {
              code: "service_request_not_found",
            }),
          );
        }
      }

      const dispatch = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.Dispatch,
        {
          companyId: scope.value,
          serviceRequestId: p.serviceRequestId ?? null,
          number: p.number,
          action: "create_work_order",
        },
      );
      if (!dispatch.ok) return dispatch;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: ServiceWorkflowCodes.WorkOrder,
        subjectType: ServiceSubjectTypes.WorkOrder,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const workOrder: WorkOrder = {
        id,
        companyId: scope.value,
        number: p.number,
        status: mapWorkOrderStatus(started.value.statusProjection),
        serviceRequestId: p.serviceRequestId ?? null,
        workType: p.workTypeId
          ? {
              workTypeId: p.workTypeId,
              code: p.workTypeCode ?? null,
              name: p.workTypeName ?? null,
            }
          : null,
        projectId: p.projectId ?? null,
        siteAddressId: p.siteAddressId ?? null,
        notes: p.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.workOrders.save(workOrder);
      if (!saved.ok) return saved;

      const event = buildServiceEvent({
        eventType: ServiceEventTypes.WorkOrderCreated,
        aggregateType: "work_order",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          workOrderId: id,
          companyId: scope.value,
          serviceRequestId: p.serviceRequestId ?? null,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordServiceAudit(deps.audit, ctx, {
        action: ServiceCommandTypes.CreateWorkOrder,
        entityType: "work_order",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ workOrderId: id });
    },
  };
}

export function createUpdateWorkOrderHandler(
  deps: ServiceHandlerDeps,
): CommandHandler<UpdateWorkOrderPayload, { workOrderId: string }> {
  return {
    commandType: ServiceCommandTypes.UpdateWorkOrder,
    authorize(command) {
      return companyResource(
        "work_order",
        ServicePolicyActions.WorkOrderUpdate,
        command.payload.companyId,
        command.payload.workOrderId,
      );
    },
    validate() {
      return updateWorkOrderCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.workOrders.findById({
        companyId: scope.value,
        id: command.payload.workOrderId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Work order not found", {
            code: "work_order_not_found",
          }),
        );
      }

      const p = command.payload;
      let status = existing.value.status;

      if (p.transitionCode && p.workflowInstanceId) {
        const wf = workflowOrFail(ctx);
        if (!wf.ok) return wf;
        const transitioned = await wf.value.transition({
          instanceId: p.workflowInstanceId,
          transitionCode: p.transitionCode,
          actorUserId: ctx.userId,
        });
        if (!transitioned.ok) return transitioned;
        status = mapWorkOrderStatus(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const workType =
        p.workTypeId !== undefined
          ? p.workTypeId
            ? {
                workTypeId: p.workTypeId,
                code: p.workTypeCode ?? null,
                name: p.workTypeName ?? null,
              }
            : null
          : existing.value.workType;

      const updated: WorkOrder = {
        ...existing.value,
        notes: p.notes !== undefined ? p.notes : existing.value.notes,
        workType,
        projectId:
          p.projectId !== undefined ? p.projectId : existing.value.projectId,
        siteAddressId:
          p.siteAddressId !== undefined
            ? p.siteAddressId
            : existing.value.siteAddressId,
        status,
        updatedAt: now,
      };

      const saved = await deps.workOrders.save(updated);
      if (!saved.ok) return saved;

      await recordServiceAudit(deps.audit, ctx, {
        action: ServiceCommandTypes.UpdateWorkOrder,
        entityType: "work_order",
        entityId: updated.id,
        outcome: "success",
        details: { transitionCode: p.transitionCode ?? null },
      });

      return ok({ workOrderId: updated.id });
    },
  };
}

export function createCompleteWorkOrderHandler(
  deps: ServiceHandlerDeps,
): CommandHandler<
  CompleteWorkOrderPayload,
  {
    workOrderId: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: ServiceCommandTypes.CompleteWorkOrder,
    authorize(command) {
      return companyResource(
        "work_order",
        ServicePolicyActions.WorkOrderComplete,
        command.payload.companyId,
        command.payload.workOrderId,
      );
    },
    validate() {
      return completeWorkOrderCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.workOrders.findById({
        companyId: scope.value,
        id: command.payload.workOrderId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Work order not found", {
            code: "work_order_not_found",
          }),
        );
      }
      if (existing.value.status === "completed") {
        return fail(
          new ConflictError("Work order already completed", {
            code: "work_order_already_completed",
          }),
        );
      }

      const p = command.payload;

      const sla = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.SlaEvaluation,
        {
          companyId: scope.value,
          workOrderId: p.workOrderId,
          action: "complete",
        },
      );
      if (!sla.ok) return sla;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError(
              "ApprovalEngine required for work order complete",
              { code: "approval_not_wired" },
            ),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: ServiceApprovalTypes.CompleteWorkOrder,
          subjectType: ServiceSubjectTypes.WorkOrder,
          subjectId: p.workOrderId,
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordServiceAudit(deps.audit, ctx, {
          action: ServiceCommandTypes.CompleteWorkOrder,
          entityType: "work_order",
          entityId: p.workOrderId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          workOrderId: p.workOrderId,
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;
      if (!p.workflowInstanceId?.trim()) {
        return fail(
          new ConflictError("workflowInstanceId is required to complete", {
            code: "workflow_instance_required",
          }),
        );
      }

      const transitioned = await wf.value.transition({
        instanceId: p.workflowInstanceId,
        transitionCode: p.transitionCode ?? "complete",
        actorUserId: ctx.userId,
      });
      if (!transitioned.ok) return transitioned;

      const now = ctx.clock.now().toISOString();
      const updated: WorkOrder = {
        ...existing.value,
        status: mapWorkOrderStatus(transitioned.value.statusProjection),
        updatedAt: now,
      };

      const saved = await deps.workOrders.save(updated);
      if (!saved.ok) return saved;

      await recordServiceAudit(deps.audit, ctx, {
        action: ServiceCommandTypes.CompleteWorkOrder,
        entityType: "work_order",
        entityId: updated.id,
        outcome: "success",
        details: { workflowInstanceId: p.workflowInstanceId },
      });

      return ok({ workOrderId: updated.id, pendingApproval: false });
    },
  };
}
