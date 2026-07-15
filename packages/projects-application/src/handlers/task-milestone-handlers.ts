import type { CommandHandler } from "@afh/application";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type { Milestone, MilestoneStatus, Task, TaskStatus } from "@afh/projects";
import { ProjectEventTypes } from "@afh/projects";
import {
  ProjectsCommandTypes,
  ProjectsPolicyActions,
  ProjectsRuleSetCodes,
  ProjectsSubjectTypes,
  ProjectsWorkflowCodes,
} from "../constants.js";
import type {
  AssignTaskPayload,
  CompleteTaskPayload,
  CreateMilestonePayload,
  CreateTaskPayload,
  UpdateMilestonePayload,
  UpdateTaskPayload,
} from "../commands/commands.js";
import {
  assignTaskCommandValidator,
  completeTaskCommandValidator,
  createMilestoneCommandValidator,
  createTaskCommandValidator,
  updateMilestoneCommandValidator,
  updateTaskCommandValidator,
} from "../validators/validators.js";
import type { ProjectHandlerDeps } from "./deps.js";
import {
  buildProjectEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  invokeProjectRules,
  newEntityId,
  recordProjectAudit,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

function mapTaskStatus(projection: string): TaskStatus {
  const known: TaskStatus[] = [
    "draft",
    "ready",
    "in_progress",
    "blocked",
    "completed",
    "cancelled",
  ];
  return (known.includes(projection as TaskStatus)
    ? projection
    : "draft") as TaskStatus;
}

function mapMilestoneStatus(projection: string): MilestoneStatus {
  const known: MilestoneStatus[] = [
    "planned",
    "active",
    "completed",
    "missed",
    "cancelled",
  ];
  return (known.includes(projection as MilestoneStatus)
    ? projection
    : "planned") as MilestoneStatus;
}

export function createCreateTaskHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<CreateTaskPayload, { taskId: string }> {
  return {
    commandType: ProjectsCommandTypes.CreateTask,
    authorize(command) {
      return companyResource(
        "task",
        ProjectsPolicyActions.TaskCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createTaskCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const workload = await invokeProjectRules(
        ctx,
        ProjectsRuleSetCodes.WorkloadBalancing,
        {
          companyId: scope.value,
          projectId: command.payload.projectId ?? null,
        },
      );
      if (!workload.ok) return workload;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: ProjectsWorkflowCodes.Task,
        subjectType: ProjectsSubjectTypes.Task,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const task: Task = {
        id,
        companyId: scope.value,
        projectId: p.projectId ?? null,
        parentTaskId: p.parentTaskId ?? null,
        code: p.code ?? null,
        title: p.title,
        description: p.description ?? null,
        status: mapTaskStatus(started.value.statusProjection),
        priority: p.priority ?? "normal",
        assigneeUserId: null,
        assigneeTeamId: null,
        dueAt: p.dueAt ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.tasks.save(task);
      if (!saved.ok) return saved;

      const event = buildProjectEvent({
        eventType: ProjectEventTypes.TaskCreated,
        aggregateType: "task",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          taskId: id,
          companyId: scope.value,
          projectId: p.projectId ?? null,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.CreateTask,
        entityType: "task",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ taskId: id });
    },
  };
}

export function createUpdateTaskHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<UpdateTaskPayload, { taskId: string }> {
  return {
    commandType: ProjectsCommandTypes.UpdateTask,
    authorize(command) {
      return companyResource(
        "task",
        ProjectsPolicyActions.TaskUpdate,
        command.payload.companyId,
        command.payload.taskId,
      );
    },
    validate() {
      return updateTaskCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.tasks.findById({
        companyId: scope.value,
        id: command.payload.taskId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Task not found", { code: "task_not_found" }),
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
        status = mapTaskStatus(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const updated: Task = {
        ...existing.value,
        title: p.title ?? existing.value.title,
        description:
          p.description !== undefined
            ? p.description
            : existing.value.description,
        priority: p.priority ?? existing.value.priority,
        dueAt: p.dueAt !== undefined ? p.dueAt : existing.value.dueAt,
        status,
        updatedAt: now,
      };

      const saved = await deps.tasks.save(updated);
      if (!saved.ok) return saved;

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.UpdateTask,
        entityType: "task",
        entityId: updated.id,
        outcome: "success",
      });

      return ok({ taskId: updated.id });
    },
  };
}

export function createAssignTaskHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<AssignTaskPayload, { taskId: string }> {
  return {
    commandType: ProjectsCommandTypes.AssignTask,
    authorize(command) {
      return companyResource(
        "task",
        ProjectsPolicyActions.TaskAssign,
        command.payload.companyId,
        command.payload.taskId,
      );
    },
    validate() {
      return assignTaskCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.tasks.findById({
        companyId: scope.value,
        id: command.payload.taskId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Task not found", { code: "task_not_found" }),
        );
      }

      const allocation = await invokeProjectRules(
        ctx,
        ProjectsRuleSetCodes.ResourceAllocation,
        {
          companyId: scope.value,
          taskId: command.payload.taskId,
          assigneeUserId: command.payload.assigneeUserId ?? null,
          assigneeTeamId: command.payload.assigneeTeamId ?? null,
        },
      );
      if (!allocation.ok) return allocation;

      const now = ctx.clock.now().toISOString();
      const p = command.payload;
      const updated: Task = {
        ...existing.value,
        assigneeUserId: p.assigneeUserId ?? null,
        assigneeTeamId: p.assigneeTeamId ?? null,
        updatedAt: now,
      };

      const saved = await deps.tasks.save(updated);
      if (!saved.ok) return saved;

      const event = buildProjectEvent({
        eventType: ProjectEventTypes.TaskAssigned,
        aggregateType: "task",
        aggregateId: updated.id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          taskId: updated.id,
          companyId: scope.value,
          assigneeUserId: updated.assigneeUserId,
          assigneeTeamId: updated.assigneeTeamId,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.AssignTask,
        entityType: "task",
        entityId: updated.id,
        outcome: "success",
      });

      return ok({ taskId: updated.id });
    },
  };
}

export function createCompleteTaskHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<CompleteTaskPayload, { taskId: string }> {
  return {
    commandType: ProjectsCommandTypes.CompleteTask,
    authorize(command) {
      return companyResource(
        "task",
        ProjectsPolicyActions.TaskComplete,
        command.payload.companyId,
        command.payload.taskId,
      );
    },
    validate() {
      return completeTaskCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.tasks.findById({
        companyId: scope.value,
        id: command.payload.taskId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Task not found", { code: "task_not_found" }),
        );
      }
      if (existing.value.status === "completed") {
        return fail(
          new ConflictError("Task already completed", {
            code: "task_already_completed",
          }),
        );
      }

      const p = command.payload;
      let status: TaskStatus = "completed";

      if (p.workflowInstanceId) {
        const wf = workflowOrFail(ctx);
        if (!wf.ok) return wf;
        const transitioned = await wf.value.transition({
          instanceId: p.workflowInstanceId,
          transitionCode: p.transitionCode ?? "complete",
          actorUserId: ctx.userId,
        });
        if (!transitioned.ok) return transitioned;
        status = mapTaskStatus(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const updated: Task = {
        ...existing.value,
        status,
        updatedAt: now,
      };

      const saved = await deps.tasks.save(updated);
      if (!saved.ok) return saved;

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.CompleteTask,
        entityType: "task",
        entityId: updated.id,
        outcome: "success",
      });

      return ok({ taskId: updated.id });
    },
  };
}

export function createCreateMilestoneHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<CreateMilestonePayload, { milestoneId: string }> {
  return {
    commandType: ProjectsCommandTypes.CreateMilestone,
    authorize(command) {
      return companyResource(
        "milestone",
        ProjectsPolicyActions.MilestoneCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createMilestoneCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const scheduling = await invokeProjectRules(
        ctx,
        ProjectsRuleSetCodes.Scheduling,
        {
          companyId: scope.value,
          projectId: command.payload.projectId,
          dueAt: command.payload.dueAt ?? null,
        },
      );
      if (!scheduling.ok) return scheduling;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: ProjectsWorkflowCodes.Milestone,
        subjectType: ProjectsSubjectTypes.Milestone,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const milestone: Milestone = {
        id,
        companyId: scope.value,
        projectId: p.projectId,
        code: p.code ?? null,
        name: p.name,
        status: mapMilestoneStatus(started.value.statusProjection),
        due: p.dueAt
          ? { dueAt: p.dueAt, timezone: p.timezone ?? null }
          : null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.milestones.save(milestone);
      if (!saved.ok) return saved;

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.CreateMilestone,
        entityType: "milestone",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ milestoneId: id });
    },
  };
}

export function createUpdateMilestoneHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<UpdateMilestonePayload, { milestoneId: string }> {
  return {
    commandType: ProjectsCommandTypes.UpdateMilestone,
    authorize(command) {
      return companyResource(
        "milestone",
        ProjectsPolicyActions.MilestoneUpdate,
        command.payload.companyId,
        command.payload.milestoneId,
      );
    },
    validate() {
      return updateMilestoneCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.milestones.findById({
        companyId: scope.value,
        id: command.payload.milestoneId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Milestone not found", {
            code: "milestone_not_found",
          }),
        );
      }

      const p = command.payload;
      let status = existing.value.status;
      let completedAt = existing.value.completedAt;

      if (p.transitionCode && p.workflowInstanceId) {
        const wf = workflowOrFail(ctx);
        if (!wf.ok) return wf;
        const transitioned = await wf.value.transition({
          instanceId: p.workflowInstanceId,
          transitionCode: p.transitionCode,
          actorUserId: ctx.userId,
        });
        if (!transitioned.ok) return transitioned;
        status = mapMilestoneStatus(transitioned.value.statusProjection);
        if (status === "completed" && !completedAt) {
          completedAt = ctx.clock.now().toISOString();
        }
      }

      const now = ctx.clock.now().toISOString();
      const updated: Milestone = {
        ...existing.value,
        name: p.name ?? existing.value.name,
        code: p.code !== undefined ? p.code : existing.value.code,
        due:
          p.dueAt !== undefined
            ? p.dueAt
              ? { dueAt: p.dueAt, timezone: p.timezone ?? null }
              : null
            : existing.value.due,
        status,
        completedAt,
        updatedAt: now,
      };

      const saved = await deps.milestones.save(updated);
      if (!saved.ok) return saved;

      if (status === "completed" && existing.value.status !== "completed") {
        const event = buildProjectEvent({
          eventType: ProjectEventTypes.MilestoneCompleted,
          aggregateType: "milestone",
          aggregateId: updated.id,
          companyId: scope.value,
          correlationId: ctx.correlationId,
          causationId: commandCausationId(command),
          clock: ctx.clock,
          payload: {
            milestoneId: updated.id,
            companyId: scope.value,
            projectId: updated.projectId,
          },
        });
        const enqueued = await enqueueDomainEvent(deps.outbox, event);
        if (!enqueued.ok) return enqueued;
      }

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.UpdateMilestone,
        entityType: "milestone",
        entityId: updated.id,
        outcome: "success",
      });

      return ok({ milestoneId: updated.id });
    },
  };
}
