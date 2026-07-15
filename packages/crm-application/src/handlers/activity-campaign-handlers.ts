import type { CommandHandler } from "@afh/application";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  Activity,
  Campaign,
  CampaignStatus,
  CommunicationRecord,
} from "@afh/crm";
import { CrmEventTypes } from "@afh/crm";
import {
  CrmCommandTypes,
  CrmPolicyActions,
  CrmRuleSetCodes,
  CrmSubjectTypes,
  CrmWorkflowCodes,
} from "../constants.js";
import type {
  CreateCampaignPayload,
  LogActivityPayload,
  RecordCommunicationPayload,
  UpdateCampaignPayload,
} from "../commands/commands.js";
import {
  createCampaignCommandValidator,
  logActivityCommandValidator,
  recordCommunicationCommandValidator,
  updateCampaignCommandValidator,
} from "../validators/validators.js";
import type { CrmHandlerDeps } from "./deps.js";
import {
  buildCrmEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  invokeCrmRules,
  newEntityId,
  recordCrmAudit,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

function mapCampaignStatus(projection: string): CampaignStatus {
  const known: CampaignStatus[] = [
    "draft",
    "scheduled",
    "active",
    "paused",
    "completed",
    "cancelled",
  ];
  return (known.includes(projection as CampaignStatus)
    ? projection
    : "draft") as CampaignStatus;
}

export function createLogActivityHandler(
  deps: CrmHandlerDeps,
): CommandHandler<LogActivityPayload, { activityId: string }> {
  return {
    commandType: CrmCommandTypes.LogActivity,
    authorize(command) {
      return companyResource(
        "activity",
        CrmPolicyActions.ActivityLog,
        command.payload.companyId,
      );
    },
    validate() {
      return logActivityCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const activity: Activity = {
        id,
        companyId: scope.value,
        activityType: p.activityType,
        subject: p.subject,
        notes: p.notes ?? null,
        outcome: p.outcome ?? null,
        leadId: p.leadId ?? null,
        contactId: p.contactId ?? null,
        accountId: p.accountId ?? null,
        opportunityId: p.opportunityId ?? null,
        ownerUserId: p.ownerUserId ?? ctx.userId,
        dueAt: p.dueAt ?? null,
        completedAt: p.completedAt ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.activities.save(activity);
      if (!saved.ok) return saved;

      const event = buildCrmEvent({
        eventType: CrmEventTypes.ActivityLogged,
        aggregateType: "activity",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { activityId: id, companyId: scope.value },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.LogActivity,
        entityType: "activity",
        entityId: id,
        outcome: "success",
        details: { activityType: p.activityType },
      });

      return ok({ activityId: id });
    },
  };
}

export function createRecordCommunicationHandler(
  deps: CrmHandlerDeps,
): CommandHandler<RecordCommunicationPayload, { communicationId: string }> {
  return {
    commandType: CrmCommandTypes.RecordCommunication,
    authorize(command) {
      return companyResource(
        "communication",
        CrmPolicyActions.CommunicationRecord,
        command.payload.companyId,
      );
    },
    validate() {
      return recordCommunicationCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const record: CommunicationRecord = {
        id,
        companyId: scope.value,
        channel: {
          channel: p.channel,
          label: p.channelLabel ?? null,
        },
        direction: p.direction,
        subject: p.subject ?? null,
        summary: p.summary ?? null,
        leadId: p.leadId ?? null,
        contactId: p.contactId ?? null,
        accountId: p.accountId ?? null,
        notificationId: p.notificationId ?? null,
        conversation: p.conversationId
          ? { conversationId: p.conversationId, companyId: scope.value }
          : null,
        occurredAt: p.occurredAt ?? now,
        createdAt: now,
      };

      const saved = await deps.communications.save(record);
      if (!saved.ok) return saved;

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.RecordCommunication,
        entityType: "communication",
        entityId: id,
        outcome: "success",
        details: { channel: p.channel, direction: p.direction },
      });

      return ok({ communicationId: id });
    },
  };
}

export function createCreateCampaignHandler(
  deps: CrmHandlerDeps,
): CommandHandler<CreateCampaignPayload, { campaignId: string }> {
  return {
    commandType: CrmCommandTypes.CreateCampaign,
    authorize(command) {
      return companyResource(
        "campaign",
        CrmPolicyActions.CampaignCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createCampaignCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const evaluation = await invokeCrmRules(
        ctx,
        CrmRuleSetCodes.CampaignEvaluation,
        {
          companyId: scope.value,
          name: command.payload.name,
          audienceId: command.payload.audienceId ?? null,
        },
      );
      if (!evaluation.ok) return evaluation;

      const segmentation = await invokeCrmRules(
        ctx,
        CrmRuleSetCodes.Segmentation,
        {
          companyId: scope.value,
          audienceId: command.payload.audienceId ?? null,
          action: "campaign",
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
        definitionCode: CrmWorkflowCodes.Campaign,
        subjectType: CrmSubjectTypes.Campaign,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const campaign: Campaign = {
        id,
        companyId: scope.value,
        code: p.code ?? null,
        name: p.name,
        status: mapCampaignStatus(started.value.statusProjection),
        audience: p.audienceId
          ? {
              audienceId: p.audienceId,
              code: p.audienceCode ?? null,
              name: p.audienceName ?? null,
            }
          : null,
        startAt: p.startAt ?? null,
        endAt: p.endAt ?? null,
        ownerUserId: p.ownerUserId ?? ctx.userId,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.campaigns.save(campaign);
      if (!saved.ok) return saved;

      const event = buildCrmEvent({
        eventType: CrmEventTypes.CampaignCreated,
        aggregateType: "campaign",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { campaignId: id, companyId: scope.value },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.CreateCampaign,
        entityType: "campaign",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ campaignId: id });
    },
  };
}

export function createUpdateCampaignHandler(
  deps: CrmHandlerDeps,
): CommandHandler<UpdateCampaignPayload, { campaignId: string }> {
  return {
    commandType: CrmCommandTypes.UpdateCampaign,
    authorize(command) {
      return companyResource(
        "campaign",
        CrmPolicyActions.CampaignUpdate,
        command.payload.companyId,
        command.payload.campaignId,
      );
    },
    validate() {
      return updateCampaignCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.campaigns.findById({
        companyId: scope.value,
        id: command.payload.campaignId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Campaign not found", {
            code: "campaign_not_found",
          }),
        );
      }

      const p = command.payload;

      const evaluation = await invokeCrmRules(
        ctx,
        CrmRuleSetCodes.CampaignEvaluation,
        {
          companyId: scope.value,
          campaignId: p.campaignId,
          action: "update",
        },
      );
      if (!evaluation.ok) return evaluation;

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
        status = mapCampaignStatus(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const audience =
        p.audienceId !== undefined
          ? p.audienceId
            ? {
                audienceId: p.audienceId,
                code: p.audienceCode ?? null,
                name: p.audienceName ?? null,
              }
            : null
          : existing.value.audience;

      const updated: Campaign = {
        ...existing.value,
        name: p.name ?? existing.value.name,
        code: p.code !== undefined ? p.code : existing.value.code,
        audience,
        startAt: p.startAt !== undefined ? p.startAt : existing.value.startAt,
        endAt: p.endAt !== undefined ? p.endAt : existing.value.endAt,
        ownerUserId:
          p.ownerUserId !== undefined
            ? p.ownerUserId
            : existing.value.ownerUserId,
        status,
        updatedAt: now,
      };

      const saved = await deps.campaigns.save(updated);
      if (!saved.ok) return saved;

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.UpdateCampaign,
        entityType: "campaign",
        entityId: updated.id,
        outcome: "success",
        details: { transitionCode: p.transitionCode ?? null },
      });

      return ok({ campaignId: updated.id });
    },
  };
}
