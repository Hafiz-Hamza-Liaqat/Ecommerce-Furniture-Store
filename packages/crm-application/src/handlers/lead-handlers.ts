import type { CommandHandler } from "@afh/application";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type { Lead, LeadStatus } from "@afh/crm";
import { CrmEventTypes } from "@afh/crm";
import {
  CrmApprovalTypes,
  CrmCommandTypes,
  CrmPolicyActions,
  CrmRuleSetCodes,
  CrmSubjectTypes,
  CrmWorkflowCodes,
} from "../constants.js";
import type {
  ConvertLeadPayload,
  CreateLeadPayload,
  QualifyLeadPayload,
  UpdateLeadPayload,
} from "../commands/commands.js";
import {
  convertLeadCommandValidator,
  createLeadCommandValidator,
  qualifyLeadCommandValidator,
  updateLeadCommandValidator,
} from "../validators/validators.js";
import type { CrmHandlerDeps } from "./deps.js";
import {
  approvalOrNull,
  buildCrmEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  invokeCrmRules,
  newEntityId,
  recordCrmAudit,
  requireApproval,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

function mapLeadStatus(projection: string): LeadStatus {
  const known: LeadStatus[] = [
    "new",
    "contacted",
    "qualified",
    "unqualified",
    "converted",
    "archived",
  ];
  return (known.includes(projection as LeadStatus)
    ? projection
    : "new") as LeadStatus;
}

export function createCreateLeadHandler(
  deps: CrmHandlerDeps,
): CommandHandler<CreateLeadPayload, { leadId: string }> {
  return {
    commandType: CrmCommandTypes.CreateLead,
    authorize(command) {
      return companyResource(
        "lead",
        CrmPolicyActions.LeadCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createLeadCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const scoring = await invokeCrmRules(ctx, CrmRuleSetCodes.LeadScoring, {
        companyId: scope.value,
        classification: command.payload.classification ?? null,
        sourceId: command.payload.sourceId ?? null,
      });
      if (!scoring.ok) return scoring;

      const segmentation = await invokeCrmRules(
        ctx,
        CrmRuleSetCodes.Segmentation,
        {
          companyId: scope.value,
          classification: command.payload.classification ?? null,
        },
      );
      if (!segmentation.ok) return segmentation;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: CrmWorkflowCodes.Lead,
        subjectType: CrmSubjectTypes.Lead,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const lead: Lead = {
        id,
        companyId: scope.value,
        code: p.code ?? null,
        title: p.title ?? null,
        status: mapLeadStatus(started.value.statusProjection),
        classification: p.classification ?? null,
        source: p.sourceId
          ? {
              sourceId: p.sourceId,
              code: p.sourceCode ?? null,
              name: p.sourceName ?? null,
            }
          : null,
        contactId: p.contactId ?? null,
        accountId: p.accountId ?? null,
        ownerUserId: p.ownerUserId ?? ctx.userId,
        salesCustomerId: p.salesCustomerId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.leads.save(lead);
      if (!saved.ok) return saved;

      const event = buildCrmEvent({
        eventType: CrmEventTypes.LeadCreated,
        aggregateType: "lead",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { leadId: id, companyId: scope.value },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.CreateLead,
        entityType: "lead",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ leadId: id });
    },
  };
}

export function createUpdateLeadHandler(
  deps: CrmHandlerDeps,
): CommandHandler<UpdateLeadPayload, { leadId: string }> {
  return {
    commandType: CrmCommandTypes.UpdateLead,
    authorize(command) {
      return companyResource(
        "lead",
        CrmPolicyActions.LeadUpdate,
        command.payload.companyId,
        command.payload.leadId,
      );
    },
    validate() {
      return updateLeadCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.leads.findById({
        companyId: scope.value,
        id: command.payload.leadId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Lead not found", { code: "lead_not_found" }),
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
        status = mapLeadStatus(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const source =
        p.sourceId !== undefined
          ? p.sourceId
            ? {
                sourceId: p.sourceId,
                code: p.sourceCode ?? null,
                name: p.sourceName ?? null,
              }
            : null
          : existing.value.source;

      const updated: Lead = {
        ...existing.value,
        code: p.code !== undefined ? p.code : existing.value.code,
        title: p.title !== undefined ? p.title : existing.value.title,
        classification:
          p.classification !== undefined
            ? p.classification
            : existing.value.classification,
        source,
        contactId:
          p.contactId !== undefined ? p.contactId : existing.value.contactId,
        accountId:
          p.accountId !== undefined ? p.accountId : existing.value.accountId,
        ownerUserId:
          p.ownerUserId !== undefined
            ? p.ownerUserId
            : existing.value.ownerUserId,
        salesCustomerId:
          p.salesCustomerId !== undefined
            ? p.salesCustomerId
            : existing.value.salesCustomerId,
        status,
        updatedAt: now,
      };

      const saved = await deps.leads.save(updated);
      if (!saved.ok) return saved;

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.UpdateLead,
        entityType: "lead",
        entityId: updated.id,
        outcome: "success",
        details: { transitionCode: p.transitionCode ?? null },
      });

      return ok({ leadId: updated.id });
    },
  };
}

export function createQualifyLeadHandler(
  deps: CrmHandlerDeps,
): CommandHandler<
  QualifyLeadPayload,
  {
    leadId: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: CrmCommandTypes.QualifyLead,
    authorize(command) {
      return companyResource(
        "lead",
        CrmPolicyActions.LeadQualify,
        command.payload.companyId,
        command.payload.leadId,
      );
    },
    validate() {
      return qualifyLeadCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.leads.findById({
        companyId: scope.value,
        id: command.payload.leadId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Lead not found", { code: "lead_not_found" }),
        );
      }
      if (existing.value.status === "qualified") {
        return fail(
          new ConflictError("Lead already qualified", {
            code: "lead_already_qualified",
          }),
        );
      }
      if (existing.value.status === "converted") {
        return fail(
          new ConflictError("Converted lead cannot be qualified", {
            code: "lead_already_converted",
          }),
        );
      }

      const p = command.payload;

      const qualification = await invokeCrmRules(
        ctx,
        CrmRuleSetCodes.Qualification,
        {
          companyId: scope.value,
          leadId: p.leadId,
          classification: existing.value.classification,
        },
      );
      if (!qualification.ok) return qualification;

      const scoring = await invokeCrmRules(ctx, CrmRuleSetCodes.LeadScoring, {
        companyId: scope.value,
        leadId: p.leadId,
        action: "qualify",
      });
      if (!scoring.ok) return scoring;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError("ApprovalEngine required for lead qualify", {
              code: "approval_not_wired",
            }),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: CrmApprovalTypes.QualifyLead,
          subjectType: CrmSubjectTypes.Lead,
          subjectId: p.leadId,
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordCrmAudit(deps.audit, ctx, {
          action: CrmCommandTypes.QualifyLead,
          entityType: "lead",
          entityId: p.leadId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          leadId: p.leadId,
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;
      if (!p.workflowInstanceId?.trim()) {
        return fail(
          new ConflictError("workflowInstanceId is required to qualify", {
            code: "workflow_instance_required",
          }),
        );
      }

      const transitioned = await wf.value.transition({
        instanceId: p.workflowInstanceId,
        transitionCode: p.transitionCode ?? "qualify",
        actorUserId: ctx.userId,
      });
      if (!transitioned.ok) return transitioned;

      const now = ctx.clock.now().toISOString();
      const updated: Lead = {
        ...existing.value,
        status: mapLeadStatus(transitioned.value.statusProjection),
        updatedAt: now,
      };

      const saved = await deps.leads.save(updated);
      if (!saved.ok) return saved;

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.QualifyLead,
        entityType: "lead",
        entityId: updated.id,
        outcome: "success",
        details: { workflowInstanceId: p.workflowInstanceId },
      });

      return ok({ leadId: updated.id, pendingApproval: false });
    },
  };
}

export function createConvertLeadHandler(
  deps: CrmHandlerDeps,
): CommandHandler<
  ConvertLeadPayload,
  {
    leadId: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: CrmCommandTypes.ConvertLead,
    authorize(command) {
      return companyResource(
        "lead",
        CrmPolicyActions.LeadConvert,
        command.payload.companyId,
        command.payload.leadId,
      );
    },
    validate() {
      return convertLeadCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.leads.findById({
        companyId: scope.value,
        id: command.payload.leadId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Lead not found", { code: "lead_not_found" }),
        );
      }
      if (existing.value.status === "converted") {
        return fail(
          new ConflictError("Lead already converted", {
            code: "lead_already_converted",
          }),
        );
      }

      const p = command.payload;

      const conversion = await invokeCrmRules(ctx, CrmRuleSetCodes.Conversion, {
        companyId: scope.value,
        leadId: p.leadId,
        contactId: p.contactId ?? existing.value.contactId,
        accountId: p.accountId ?? existing.value.accountId,
        opportunityId: p.opportunityId ?? null,
      });
      if (!conversion.ok) return conversion;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError("ApprovalEngine required for lead convert", {
              code: "approval_not_wired",
            }),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: CrmApprovalTypes.ConvertLead,
          subjectType: CrmSubjectTypes.Lead,
          subjectId: p.leadId,
          payload: {
            contactId: p.contactId ?? null,
            accountId: p.accountId ?? null,
            opportunityId: p.opportunityId ?? null,
          },
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordCrmAudit(deps.audit, ctx, {
          action: CrmCommandTypes.ConvertLead,
          entityType: "lead",
          entityId: p.leadId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          leadId: p.leadId,
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;
      if (!p.workflowInstanceId?.trim()) {
        return fail(
          new ConflictError("workflowInstanceId is required to convert", {
            code: "workflow_instance_required",
          }),
        );
      }

      const transitioned = await wf.value.transition({
        instanceId: p.workflowInstanceId,
        transitionCode: p.transitionCode ?? "convert",
        actorUserId: ctx.userId,
      });
      if (!transitioned.ok) return transitioned;

      const now = ctx.clock.now().toISOString();
      const contactId = p.contactId ?? existing.value.contactId;
      const accountId = p.accountId ?? existing.value.accountId;

      const updated: Lead = {
        ...existing.value,
        status: mapLeadStatus(transitioned.value.statusProjection),
        contactId,
        accountId,
        updatedAt: now,
      };

      const saved = await deps.leads.save(updated);
      if (!saved.ok) return saved;

      if (p.opportunityId) {
        const event = buildCrmEvent({
          eventType: CrmEventTypes.OpportunityLinked,
          aggregateType: "lead",
          aggregateId: updated.id,
          companyId: scope.value,
          correlationId: ctx.correlationId,
          causationId: commandCausationId(command),
          clock: ctx.clock,
          payload: {
            opportunityId: p.opportunityId,
            companyId: scope.value,
            leadId: updated.id,
            accountId,
          },
        });
        const enqueued = await enqueueDomainEvent(deps.outbox, event);
        if (!enqueued.ok) return enqueued;
      }

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.ConvertLead,
        entityType: "lead",
        entityId: updated.id,
        outcome: "success",
        details: {
          workflowInstanceId: p.workflowInstanceId,
          opportunityId: p.opportunityId ?? null,
        },
      });

      return ok({ leadId: updated.id, pendingApproval: false });
    },
  };
}
