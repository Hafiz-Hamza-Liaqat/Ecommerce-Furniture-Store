import type { CommandHandler } from "@afh/application";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type { Resource, Schedule, WorkAssignment } from "@afh/projects";
import { ProjectEventTypes } from "@afh/projects";
import {
  ProjectsApprovalTypes,
  ProjectsCommandTypes,
  ProjectsPolicyActions,
  ProjectsRuleSetCodes,
  ProjectsSubjectTypes,
} from "../constants.js";
import type {
  AssignResourcePayload,
  ReleaseResourcePayload,
  UpdateSchedulePayload,
} from "../commands/commands.js";
import {
  assignResourceCommandValidator,
  releaseResourceCommandValidator,
  updateScheduleCommandValidator,
} from "../validators/validators.js";
import type { ProjectHandlerDeps } from "./deps.js";
import {
  approvalOrNull,
  buildProjectEvent,
  commandCausationId,
  companyResource,
  loadRecordForAuthorization,
  enqueueDomainEvent,
  invokeProjectRules,
  newEntityId,
  recordProjectAudit,
  requireApproval,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

export function createAssignResourceHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<
  AssignResourcePayload,
  {
    resourceId: string;
    assignmentId?: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: ProjectsCommandTypes.AssignResource,
    async authorize(command) {
      const p = command.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.resources.findById({ companyId: p.companyId, id: p.resourceId }),
      );
      return companyResource(
        "resource",
        ProjectsPolicyActions.ResourceAssign,
        p.companyId,
        p.resourceId,
        {
          ownerUserId: record?.human?.userId ?? null,
          attributes: {
            projectId: p.projectId ?? null,
            workItemId: p.workItemId ?? null,
            resourceKind: record?.kind ?? null,
          },
        },
      );
    },
    validate() {
      return assignResourceCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.resources.findById({
        companyId: scope.value,
        id: command.payload.resourceId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Resource not found", {
            code: "resource_not_found",
          }),
        );
      }

      const p = command.payload;
      const allocation = await invokeProjectRules(
        ctx,
        ProjectsRuleSetCodes.ResourceAllocation,
        {
          companyId: scope.value,
          resourceId: p.resourceId,
          projectId: p.projectId ?? null,
          workItemId: p.workItemId ?? null,
        },
      );
      if (!allocation.ok) return allocation;

      const utilization = await invokeProjectRules(
        ctx,
        ProjectsRuleSetCodes.Utilization,
        {
          companyId: scope.value,
          resourceId: p.resourceId,
        },
      );
      if (!utilization.ok) return utilization;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError("ApprovalEngine required for resource assign", {
              code: "approval_not_wired",
            }),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: ProjectsApprovalTypes.ResourceAssign,
          subjectType: ProjectsSubjectTypes.Resource,
          subjectId: p.resourceId,
          payload: {
            projectId: p.projectId ?? null,
            workItemId: p.workItemId ?? null,
          },
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordProjectAudit(deps.audit, ctx, {
          action: ProjectsCommandTypes.AssignResource,
          entityType: "resource",
          entityId: p.resourceId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          resourceId: p.resourceId,
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const now = ctx.clock.now().toISOString();
      const assignmentId = newEntityId();

      if (p.workItemId) {
        const workItem = await deps.workItems.findById({
          companyId: scope.value,
          id: p.workItemId,
        });
        if (!workItem.ok) return workItem;
        if (!workItem.value) {
          return fail(
            new NotFoundError("Work item not found", {
              code: "work_item_not_found",
            }),
          );
        }

        const assignment: WorkAssignment = {
          id: assignmentId,
          companyId: scope.value,
          workItemId: p.workItemId,
          assigneeType: p.assigneeType ?? "resource",
          assigneeId: p.assigneeId ?? p.resourceId,
          assignedAt: now,
          unassignedAt: null,
        };
        const savedAssignment = await deps.workItems.saveAssignment(assignment);
        if (!savedAssignment.ok) return savedAssignment;

        const updatedWorkItem = {
          ...workItem.value,
          resourceId: p.resourceId,
          status:
            workItem.value.status === "open"
              ? ("assigned" as const)
              : workItem.value.status,
          updatedAt: now,
        };
        const savedWorkItem = await deps.workItems.save(updatedWorkItem);
        if (!savedWorkItem.ok) return savedWorkItem;
      }

      const resource: Resource = {
        ...existing.value,
        status: "assigned",
        updatedAt: now,
      };
      const saved = await deps.resources.save(resource);
      if (!saved.ok) return saved;

      const event = buildProjectEvent({
        eventType: ProjectEventTypes.ResourceAssigned,
        aggregateType: "resource",
        aggregateId: p.resourceId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          resourceId: p.resourceId,
          companyId: scope.value,
          projectId: p.projectId ?? null,
          workItemId: p.workItemId ?? null,
          assignmentId: p.workItemId ? assignmentId : null,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.AssignResource,
        entityType: "resource",
        entityId: p.resourceId,
        outcome: "success",
        details: { assignmentId: p.workItemId ? assignmentId : null },
      });

      return ok({
        resourceId: p.resourceId,
        ...(p.workItemId ? { assignmentId } : {}),
        pendingApproval: false,
      });
    },
  };
}

export function createReleaseResourceHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<ReleaseResourcePayload, { resourceId: string }> {
  return {
    commandType: ProjectsCommandTypes.ReleaseResource,
    async authorize(command) {
      const p = command.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.resources.findById({ companyId: p.companyId, id: p.resourceId }),
      );
      return companyResource(
        "resource",
        ProjectsPolicyActions.ResourceRelease,
        p.companyId,
        p.resourceId,
        {
          ownerUserId: record?.human?.userId ?? null,
          attributes: { resourceKind: record?.kind ?? null },
        },
      );
    },
    validate() {
      return releaseResourceCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.resources.findById({
        companyId: scope.value,
        id: command.payload.resourceId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Resource not found", {
            code: "resource_not_found",
          }),
        );
      }

      const utilization = await invokeProjectRules(
        ctx,
        ProjectsRuleSetCodes.Utilization,
        {
          companyId: scope.value,
          resourceId: command.payload.resourceId,
          kind: "release",
        },
      );
      if (!utilization.ok) return utilization;

      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      if (p.workItemId) {
        const workItem = await deps.workItems.findById({
          companyId: scope.value,
          id: p.workItemId,
        });
        if (!workItem.ok) return workItem;
        if (workItem.value) {
          const updatedWorkItem = {
            ...workItem.value,
            resourceId: null,
            updatedAt: now,
          };
          const savedWorkItem = await deps.workItems.save(updatedWorkItem);
          if (!savedWorkItem.ok) return savedWorkItem;

          if (p.assignmentId) {
            const releaseAssignment: WorkAssignment = {
              id: p.assignmentId,
              companyId: scope.value,
              workItemId: p.workItemId,
              assigneeType: "resource",
              assigneeId: p.resourceId,
              assignedAt: now,
              unassignedAt: now,
            };
            const savedAssignment =
              await deps.workItems.saveAssignment(releaseAssignment);
            if (!savedAssignment.ok) return savedAssignment;
          }
        }
      }

      const resource: Resource = {
        ...existing.value,
        status: "available",
        updatedAt: now,
      };
      const saved = await deps.resources.save(resource);
      if (!saved.ok) return saved;

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.ReleaseResource,
        entityType: "resource",
        entityId: p.resourceId,
        outcome: "success",
        details: {
          workItemId: p.workItemId ?? null,
          assignmentId: p.assignmentId ?? null,
        },
      });

      return ok({ resourceId: p.resourceId });
    },
  };
}

export function createUpdateScheduleHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<UpdateSchedulePayload, { scheduleId: string }> {
  return {
    commandType: ProjectsCommandTypes.UpdateSchedule,
    async authorize(command) {
      const p = command.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.schedules.findById({ companyId: p.companyId, id: p.scheduleId }),
      );
      return companyResource(
        "schedule",
        ProjectsPolicyActions.ScheduleUpdate,
        p.companyId,
        p.scheduleId,
        {
          attributes: {
            projectId: record?.projectId ?? null,
            calendarId: record?.calendar?.calendarId ?? null,
          },
        },
      );
    },
    validate() {
      return updateScheduleCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.schedules.findById({
        companyId: scope.value,
        id: command.payload.scheduleId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Schedule not found", {
            code: "schedule_not_found",
          }),
        );
      }

      const p = command.payload;
      const scheduling = await invokeProjectRules(
        ctx,
        ProjectsRuleSetCodes.Scheduling,
        {
          companyId: scope.value,
          scheduleId: p.scheduleId,
          startAt: p.startAt ?? null,
          endAt: p.endAt ?? null,
        },
      );
      if (!scheduling.ok) return scheduling;

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
        const projection = transitioned.value.statusProjection;
        if (
          projection === "draft" ||
          projection === "published" ||
          projection === "archived"
        ) {
          status = projection;
        }
      }

      const now = ctx.clock.now().toISOString();
      const updated: Schedule = {
        ...existing.value,
        name: p.name ?? existing.value.name,
        code: p.code !== undefined ? p.code : existing.value.code,
        projectId:
          p.projectId !== undefined ? p.projectId : existing.value.projectId,
        calendar:
          p.calendarId !== undefined
            ? p.calendarId
              ? {
                  calendarId: p.calendarId,
                  companyId: scope.value,
                  timezone: p.timezone ?? null,
                }
              : null
            : existing.value.calendar,
        window:
          p.startAt !== undefined || p.endAt !== undefined
            ? {
                startAt: p.startAt ?? existing.value.window?.startAt ?? now,
                endAt: p.endAt ?? existing.value.window?.endAt ?? now,
                timezone: p.timezone ?? existing.value.window?.timezone ?? null,
              }
            : existing.value.window,
        status,
        updatedAt: now,
      };

      const saved = await deps.schedules.save(updated);
      if (!saved.ok) return saved;

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.UpdateSchedule,
        entityType: "schedule",
        entityId: updated.id,
        outcome: "success",
      });

      return ok({ scheduleId: updated.id });
    },
  };
}
