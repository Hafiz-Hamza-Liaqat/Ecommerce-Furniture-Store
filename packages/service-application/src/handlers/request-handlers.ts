import type { CommandHandler } from "@afh/application";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type { ServiceRequest, ServiceStatus } from "@afh/service";
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
  CloseServiceRequestPayload,
  CreateServiceRequestPayload,
  UpdateServiceRequestPayload,
} from "../commands/commands.js";
import {
  closeServiceRequestCommandValidator,
  createServiceRequestCommandValidator,
  updateServiceRequestCommandValidator,
} from "../validators/validators.js";
import type { ServiceHandlerDeps } from "./deps.js";
import {
  approvalOrNull,
  buildServiceEvent,
  commandCausationId,
  companyResource,
  loadRecordForAuthorization,
  enqueueDomainEvent,
  invokeServiceRules,
  newEntityId,
  recordServiceAudit,
  requireApproval,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

function mapServiceStatus(projection: string): ServiceStatus {
  const known: ServiceStatus[] = [
    "draft",
    "open",
    "in_progress",
    "waiting",
    "completed",
    "cancelled",
    "closed",
  ];
  return (known.includes(projection as ServiceStatus)
    ? projection
    : "draft") as ServiceStatus;
}

export function createCreateServiceRequestHandler(
  deps: ServiceHandlerDeps,
): CommandHandler<CreateServiceRequestPayload, { serviceRequestId: string }> {
  return {
    commandType: ServiceCommandTypes.CreateServiceRequest,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "service_request",
        ServicePolicyActions.ServiceRequestCreate,
        p.companyId,
        null,
        {
          ownerUserId: p.requestedByUserId ?? null,
          attributes: {
            customerId: p.customerId ?? null,
            projectId: p.projectId ?? null,
            salesOrderId: p.salesOrderId ?? null,
            crmContactId: p.crmContactId ?? null,
            crmAccountId: p.crmAccountId ?? null,
          },
        },
      );
    },
    validate() {
      return createServiceRequestCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const sla = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.SlaEvaluation,
        {
          companyId: scope.value,
          priority: command.payload.priority ?? "normal",
          number: command.payload.number,
        },
      );
      if (!sla.ok) return sla;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: ServiceWorkflowCodes.ServiceRequest,
        subjectType: ServiceSubjectTypes.ServiceRequest,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const request: ServiceRequest = {
        id,
        companyId: scope.value,
        number: p.number,
        title: p.title,
        description: p.description ?? null,
        status: mapServiceStatus(started.value.statusProjection),
        priority: p.priority ?? "normal",
        category: p.categoryId
          ? {
              categoryId: p.categoryId,
              code: p.categoryCode ?? null,
              name: p.categoryName ?? null,
            }
          : null,
        customerId: p.customerId ?? null,
        crmContactId: p.crmContactId ?? null,
        crmAccountId: p.crmAccountId ?? null,
        projectId: p.projectId ?? null,
        salesOrderId: p.salesOrderId ?? null,
        siteAddressId: p.siteAddressId ?? null,
        requestedByUserId: p.requestedByUserId ?? ctx.userId,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.serviceRequests.save(request);
      if (!saved.ok) return saved;

      const event = buildServiceEvent({
        eventType: ServiceEventTypes.ServiceRequestCreated,
        aggregateType: "service_request",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { serviceRequestId: id, companyId: scope.value },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordServiceAudit(deps.audit, ctx, {
        action: ServiceCommandTypes.CreateServiceRequest,
        entityType: "service_request",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ serviceRequestId: id });
    },
  };
}

export function createUpdateServiceRequestHandler(
  deps: ServiceHandlerDeps,
): CommandHandler<UpdateServiceRequestPayload, { serviceRequestId: string }> {
  return {
    commandType: ServiceCommandTypes.UpdateServiceRequest,
    async authorize(command) {
      const p = command.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.serviceRequests.findById({
          companyId: p.companyId,
          id: p.serviceRequestId,
        }),
      );
      return companyResource(
        "service_request",
        ServicePolicyActions.ServiceRequestUpdate,
        p.companyId,
        p.serviceRequestId,
        {
          ownerUserId: record?.requestedByUserId ?? null,
          attributes: {
            customerId: record?.customerId ?? null,
            projectId: record?.projectId ?? null,
            salesOrderId: record?.salesOrderId ?? null,
            crmContactId: record?.crmContactId ?? null,
            crmAccountId: record?.crmAccountId ?? null,
          },
        },
      );
    },
    validate() {
      return updateServiceRequestCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.serviceRequests.findById({
        companyId: scope.value,
        id: command.payload.serviceRequestId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Service request not found", {
            code: "service_request_not_found",
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
        status = mapServiceStatus(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const category =
        p.categoryId !== undefined
          ? p.categoryId
            ? {
                categoryId: p.categoryId,
                code: p.categoryCode ?? null,
                name: p.categoryName ?? null,
              }
            : null
          : existing.value.category;

      const updated: ServiceRequest = {
        ...existing.value,
        title: p.title ?? existing.value.title,
        description:
          p.description !== undefined
            ? p.description
            : existing.value.description,
        priority: p.priority ?? existing.value.priority,
        category,
        customerId:
          p.customerId !== undefined ? p.customerId : existing.value.customerId,
        crmContactId:
          p.crmContactId !== undefined
            ? p.crmContactId
            : existing.value.crmContactId,
        crmAccountId:
          p.crmAccountId !== undefined
            ? p.crmAccountId
            : existing.value.crmAccountId,
        projectId:
          p.projectId !== undefined ? p.projectId : existing.value.projectId,
        salesOrderId:
          p.salesOrderId !== undefined
            ? p.salesOrderId
            : existing.value.salesOrderId,
        siteAddressId:
          p.siteAddressId !== undefined
            ? p.siteAddressId
            : existing.value.siteAddressId,
        status,
        updatedAt: now,
      };

      const saved = await deps.serviceRequests.save(updated);
      if (!saved.ok) return saved;

      await recordServiceAudit(deps.audit, ctx, {
        action: ServiceCommandTypes.UpdateServiceRequest,
        entityType: "service_request",
        entityId: updated.id,
        outcome: "success",
        details: { transitionCode: p.transitionCode ?? null },
      });

      return ok({ serviceRequestId: updated.id });
    },
  };
}

export function createCloseServiceRequestHandler(
  deps: ServiceHandlerDeps,
): CommandHandler<
  CloseServiceRequestPayload,
  {
    serviceRequestId: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: ServiceCommandTypes.CloseServiceRequest,
    async authorize(command) {
      const p = command.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.serviceRequests.findById({
          companyId: p.companyId,
          id: p.serviceRequestId,
        }),
      );
      return companyResource(
        "service_request",
        ServicePolicyActions.ServiceRequestClose,
        p.companyId,
        p.serviceRequestId,
        {
          ownerUserId: record?.requestedByUserId ?? null,
          attributes: {
            customerId: record?.customerId ?? null,
            projectId: record?.projectId ?? null,
          },
        },
      );
    },
    validate() {
      return closeServiceRequestCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.serviceRequests.findById({
        companyId: scope.value,
        id: command.payload.serviceRequestId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Service request not found", {
            code: "service_request_not_found",
          }),
        );
      }
      if (
        existing.value.status === "closed" ||
        existing.value.status === "completed"
      ) {
        return fail(
          new ConflictError("Service request already closed", {
            code: "service_request_already_closed",
          }),
        );
      }

      const p = command.payload;

      const sla = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.SlaEvaluation,
        {
          companyId: scope.value,
          serviceRequestId: p.serviceRequestId,
          action: "close",
        },
      );
      if (!sla.ok) return sla;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError(
              "ApprovalEngine required for service request close",
              { code: "approval_not_wired" },
            ),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: ServiceApprovalTypes.CloseServiceRequest,
          subjectType: ServiceSubjectTypes.ServiceRequest,
          subjectId: p.serviceRequestId,
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordServiceAudit(deps.audit, ctx, {
          action: ServiceCommandTypes.CloseServiceRequest,
          entityType: "service_request",
          entityId: p.serviceRequestId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          serviceRequestId: p.serviceRequestId,
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;
      if (!p.workflowInstanceId?.trim()) {
        return fail(
          new ConflictError("workflowInstanceId is required to close", {
            code: "workflow_instance_required",
          }),
        );
      }

      const transitioned = await wf.value.transition({
        instanceId: p.workflowInstanceId,
        transitionCode: p.transitionCode ?? "close",
        actorUserId: ctx.userId,
      });
      if (!transitioned.ok) return transitioned;

      const now = ctx.clock.now().toISOString();
      const updated: ServiceRequest = {
        ...existing.value,
        status: mapServiceStatus(transitioned.value.statusProjection),
        updatedAt: now,
      };

      const saved = await deps.serviceRequests.save(updated);
      if (!saved.ok) return saved;

      const event = buildServiceEvent({
        eventType: ServiceEventTypes.ServiceCompleted,
        aggregateType: "service_request",
        aggregateId: updated.id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          serviceRequestId: updated.id,
          companyId: scope.value,
          workOrderId: p.workOrderId ?? null,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordServiceAudit(deps.audit, ctx, {
        action: ServiceCommandTypes.CloseServiceRequest,
        entityType: "service_request",
        entityId: updated.id,
        outcome: "success",
        details: { workflowInstanceId: p.workflowInstanceId },
      });

      return ok({ serviceRequestId: updated.id, pendingApproval: false });
    },
  };
}
