import type { CommandHandler } from "@afh/application";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type { Opportunity, OpportunityStatus } from "@afh/sales";
import { SalesEventTypes } from "@afh/sales";
import {
  SalesCommandTypes,
  SalesPolicyActions,
  SalesSubjectTypes,
  SalesWorkflowCodes,
} from "../constants.js";
import type {
  CreateOpportunityPayload,
  UpdateOpportunityPayload,
} from "../commands/commands.js";
import {
  createOpportunityCommandValidator,
  updateOpportunityCommandValidator,
} from "../validators/validators.js";
import type { SalesHandlerDeps } from "./deps.js";
import {
  buildSalesEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  loadRecordForAuthorization,
  newEntityId,
  recordSalesAudit,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

function mapStatusProjection(projection: string): OpportunityStatus {
  const known: OpportunityStatus[] = [
    "open",
    "qualified",
    "proposal",
    "won",
    "lost",
    "cancelled",
  ];
  return (known.includes(projection as OpportunityStatus)
    ? projection
    : "open") as OpportunityStatus;
}

export function createCreateOpportunityHandler(
  deps: SalesHandlerDeps,
): CommandHandler<CreateOpportunityPayload, { opportunityId: string }> {
  return {
    commandType: SalesCommandTypes.CreateOpportunity,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "opportunity",
        SalesPolicyActions.OpportunityCreate,
        p.companyId,
        null,
        {
          ownerUserId: p.salesRepUserId ?? null,
          organizationId: p.organizationId ?? null,
          attributes: {
            customerId: p.customerId ?? null,
            projectId: p.projectId ?? null,
            territoryId: p.territoryId ?? null,
          },
        },
      );
    },
    validate() {
      return createOpportunityCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: SalesWorkflowCodes.Opportunity,
        subjectType: SalesSubjectTypes.Opportunity,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const opportunity: Opportunity = {
        id,
        companyId: scope.value,
        code: p.code ?? null,
        title: p.title,
        status: mapStatusProjection(started.value.statusProjection),
        source: p.source ?? null,
        customerId: p.customerId ?? null,
        organizationId: p.organizationId ?? null,
        salesRepUserId: p.salesRepUserId ?? ctx.userId,
        territoryId: p.territoryId ?? null,
        projectId: p.projectId ?? null,
        estimatedValueRef: p.estimatedValueRef ?? null,
        currencyCode: p.currencyCode ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.opportunities.save(opportunity);
      if (!saved.ok) return saved;

      const event = buildSalesEvent({
        eventType: SalesEventTypes.OpportunityCreated,
        aggregateType: "opportunity",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { opportunityId: id, companyId: scope.value },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordSalesAudit(deps.audit, ctx, {
        action: SalesCommandTypes.CreateOpportunity,
        entityType: "opportunity",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ opportunityId: id });
    },
  };
}

export function createUpdateOpportunityHandler(
  deps: SalesHandlerDeps,
): CommandHandler<UpdateOpportunityPayload, { opportunityId: string }> {
  return {
    commandType: SalesCommandTypes.UpdateOpportunity,
    async authorize(command) {
      const p = command.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.opportunities.findById({
          companyId: p.companyId,
          id: p.opportunityId,
        }),
      );
      return companyResource(
        "opportunity",
        SalesPolicyActions.OpportunityUpdate,
        p.companyId,
        p.opportunityId,
        {
          ownerUserId: record?.salesRepUserId ?? null,
          organizationId: record?.organizationId ?? null,
          attributes: {
            customerId: record?.customerId ?? null,
            projectId: record?.projectId ?? null,
            territoryId: record?.territoryId ?? null,
          },
        },
      );
    },
    validate() {
      return updateOpportunityCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.opportunities.findById({
        companyId: scope.value,
        id: command.payload.opportunityId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Opportunity not found", {
            code: "opportunity_not_found",
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
          comment: p.transitionComment ?? null,
        });
        if (!transitioned.ok) return transitioned;
        status = mapStatusProjection(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const updated: Opportunity = {
        ...existing.value,
        title: p.title ?? existing.value.title,
        code: p.code !== undefined ? p.code : existing.value.code,
        source: p.source !== undefined ? p.source : existing.value.source,
        customerId:
          p.customerId !== undefined ? p.customerId : existing.value.customerId,
        organizationId:
          p.organizationId !== undefined
            ? p.organizationId
            : existing.value.organizationId,
        salesRepUserId:
          p.salesRepUserId !== undefined
            ? p.salesRepUserId
            : existing.value.salesRepUserId,
        territoryId:
          p.territoryId !== undefined
            ? p.territoryId
            : existing.value.territoryId,
        projectId:
          p.projectId !== undefined ? p.projectId : existing.value.projectId,
        estimatedValueRef:
          p.estimatedValueRef !== undefined
            ? p.estimatedValueRef
            : existing.value.estimatedValueRef,
        currencyCode:
          p.currencyCode !== undefined
            ? p.currencyCode
            : existing.value.currencyCode,
        status,
        updatedAt: now,
      };

      const saved = await deps.opportunities.save(updated);
      if (!saved.ok) return saved;

      await recordSalesAudit(deps.audit, ctx, {
        action: SalesCommandTypes.UpdateOpportunity,
        entityType: "opportunity",
        entityId: updated.id,
        outcome: "success",
        details: {
          transitionCode: p.transitionCode ?? null,
        },
      });

      return ok({ opportunityId: updated.id });
    },
  };
}
