import type { CommandHandler } from "@afh/application";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type { Project, ProjectStatus } from "@afh/projects";
import { ProjectEventTypes } from "@afh/projects";
import {
  ProjectsApprovalTypes,
  ProjectsCommandTypes,
  ProjectsPolicyActions,
  ProjectsRuleSetCodes,
  ProjectsSubjectTypes,
  ProjectsWorkflowCodes,
} from "../constants.js";
import type {
  ArchiveProjectPayload,
  CreateProjectPayload,
  UpdateProjectPayload,
} from "../commands/commands.js";
import {
  archiveProjectCommandValidator,
  createProjectCommandValidator,
  updateProjectCommandValidator,
} from "../validators/validators.js";
import type { ProjectHandlerDeps } from "./deps.js";
import {
  approvalOrNull,
  buildProjectEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  invokeProjectRules,
  newEntityId,
  recordProjectAudit,
  requireApproval,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

function mapProjectStatus(projection: string): ProjectStatus {
  const known: ProjectStatus[] = [
    "draft",
    "active",
    "on_hold",
    "completed",
    "cancelled",
    "archived",
  ];
  return (known.includes(projection as ProjectStatus)
    ? projection
    : "draft") as ProjectStatus;
}

export function createCreateProjectHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<CreateProjectPayload, { projectId: string }> {
  return {
    commandType: ProjectsCommandTypes.CreateProject,
    authorize(command) {
      return companyResource(
        "project",
        ProjectsPolicyActions.ProjectCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createProjectCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const costing = await invokeProjectRules(
        ctx,
        ProjectsRuleSetCodes.ProjectCosting,
        { companyId: scope.value, code: command.payload.code },
      );
      if (!costing.ok) return costing;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: ProjectsWorkflowCodes.Project,
        subjectType: ProjectsSubjectTypes.Project,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const project: Project = {
        id,
        companyId: scope.value,
        code: p.code,
        name: p.name,
        projectType: p.projectType,
        status: mapProjectStatus(started.value.statusProjection),
        classification: p.classification,
        customerId: p.customerId ?? null,
        organizationId: p.organizationId ?? null,
        siteAddressId: p.siteAddressId ?? null,
        ownerUserId: p.ownerUserId ?? ctx.userId,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.projects.save(project);
      if (!saved.ok) return saved;

      const event = buildProjectEvent({
        eventType: ProjectEventTypes.ProjectCreated,
        aggregateType: "project",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { projectId: id, companyId: scope.value },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.CreateProject,
        entityType: "project",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ projectId: id });
    },
  };
}

export function createUpdateProjectHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<UpdateProjectPayload, { projectId: string }> {
  return {
    commandType: ProjectsCommandTypes.UpdateProject,
    authorize(command) {
      return companyResource(
        "project",
        ProjectsPolicyActions.ProjectUpdate,
        command.payload.companyId,
        command.payload.projectId,
      );
    },
    validate() {
      return updateProjectCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.projects.findById({
        companyId: scope.value,
        id: command.payload.projectId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Project not found", { code: "project_not_found" }),
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
        status = mapProjectStatus(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const updated: Project = {
        ...existing.value,
        code: p.code ?? existing.value.code,
        name: p.name ?? existing.value.name,
        projectType: p.projectType ?? existing.value.projectType,
        classification: p.classification ?? existing.value.classification,
        customerId:
          p.customerId !== undefined ? p.customerId : existing.value.customerId,
        organizationId:
          p.organizationId !== undefined
            ? p.organizationId
            : existing.value.organizationId,
        siteAddressId:
          p.siteAddressId !== undefined
            ? p.siteAddressId
            : existing.value.siteAddressId,
        ownerUserId:
          p.ownerUserId !== undefined
            ? p.ownerUserId
            : existing.value.ownerUserId,
        status,
        updatedAt: now,
      };

      const saved = await deps.projects.save(updated);
      if (!saved.ok) return saved;

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.UpdateProject,
        entityType: "project",
        entityId: updated.id,
        outcome: "success",
        details: { transitionCode: p.transitionCode ?? null },
      });

      return ok({ projectId: updated.id });
    },
  };
}

export function createArchiveProjectHandler(
  deps: ProjectHandlerDeps,
): CommandHandler<
  ArchiveProjectPayload,
  {
    projectId: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: ProjectsCommandTypes.ArchiveProject,
    authorize(command) {
      return companyResource(
        "project",
        ProjectsPolicyActions.ProjectArchive,
        command.payload.companyId,
        command.payload.projectId,
      );
    },
    validate() {
      return archiveProjectCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.projects.findById({
        companyId: scope.value,
        id: command.payload.projectId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Project not found", { code: "project_not_found" }),
        );
      }
      if (existing.value.status === "archived") {
        return fail(
          new ConflictError("Project already archived", {
            code: "project_already_archived",
          }),
        );
      }

      const p = command.payload;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError("ApprovalEngine required for project archive", {
              code: "approval_not_wired",
            }),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: ProjectsApprovalTypes.ProjectArchive,
          subjectType: ProjectsSubjectTypes.Project,
          subjectId: p.projectId,
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordProjectAudit(deps.audit, ctx, {
          action: ProjectsCommandTypes.ArchiveProject,
          entityType: "project",
          entityId: p.projectId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          projectId: p.projectId,
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;
      if (!p.workflowInstanceId?.trim()) {
        return fail(
          new ConflictError("workflowInstanceId is required to archive", {
            code: "workflow_instance_required",
          }),
        );
      }

      const transitioned = await wf.value.transition({
        instanceId: p.workflowInstanceId,
        transitionCode: p.transitionCode ?? "archive",
        actorUserId: ctx.userId,
      });
      if (!transitioned.ok) return transitioned;

      const now = ctx.clock.now().toISOString();
      const updated: Project = {
        ...existing.value,
        status: mapProjectStatus(transitioned.value.statusProjection),
        updatedAt: now,
      };

      const saved = await deps.projects.save(updated);
      if (!saved.ok) return saved;

      await recordProjectAudit(deps.audit, ctx, {
        action: ProjectsCommandTypes.ArchiveProject,
        entityType: "project",
        entityId: updated.id,
        outcome: "success",
        details: { workflowInstanceId: p.workflowInstanceId },
      });

      return ok({ projectId: updated.id, pendingApproval: false });
    },
  };
}
