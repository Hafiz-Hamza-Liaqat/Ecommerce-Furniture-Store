import type { QueryHandler } from "@afh/application";
import type { PageRequest } from "@afh/shared-kernel";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  Milestone,
  Project,
  Resource,
  Schedule,
  Task,
  Team,
  TeamMembership,
  WorkItem,
} from "@afh/projects";
import { ProjectsPolicyActions, ProjectsQueryTypes } from "../constants.js";
import type {
  GetMilestonePayload,
  GetProjectPayload,
  GetProjectSummaryPayload,
  GetResourcePayload,
  GetSchedulePayload,
  GetTaskPayload,
  GetTeamPayload,
  GetWorkItemPayload,
  ProjectSummary,
} from "../queries/queries.js";
import {
  getMilestoneQueryValidator,
  getProjectQueryValidator,
  getProjectSummaryQueryValidator,
  getResourceQueryValidator,
  getScheduleQueryValidator,
  getTaskQueryValidator,
  getTeamQueryValidator,
  getWorkItemQueryValidator,
} from "../validators/validators.js";
import type { ProjectHandlerDeps } from "./deps.js";
import { companyResource, requireCompanyId } from "../support/support.js";

export function createGetProjectHandler(
  deps: ProjectHandlerDeps,
): QueryHandler<GetProjectPayload, Project> {
  return {
    queryType: ProjectsQueryTypes.GetProject,
    authorize(query) {
      return companyResource(
        "project",
        ProjectsPolicyActions.ProjectRead,
        query.payload.companyId,
        query.payload.projectId,
      );
    },
    validate() {
      return getProjectQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.projects.findById({
        companyId: scope.value,
        id: query.payload.projectId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Project not found", { code: "project_not_found" }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetTaskHandler(
  deps: ProjectHandlerDeps,
): QueryHandler<GetTaskPayload, Task> {
  return {
    queryType: ProjectsQueryTypes.GetTask,
    authorize(query) {
      return companyResource(
        "task",
        ProjectsPolicyActions.TaskRead,
        query.payload.companyId,
        query.payload.taskId,
      );
    },
    validate() {
      return getTaskQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.tasks.findById({
        companyId: scope.value,
        id: query.payload.taskId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Task not found", { code: "task_not_found" }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetMilestoneHandler(
  deps: ProjectHandlerDeps,
): QueryHandler<GetMilestonePayload, Milestone> {
  return {
    queryType: ProjectsQueryTypes.GetMilestone,
    authorize(query) {
      return companyResource(
        "milestone",
        ProjectsPolicyActions.MilestoneRead,
        query.payload.companyId,
        query.payload.milestoneId,
      );
    },
    validate() {
      return getMilestoneQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.milestones.findById({
        companyId: scope.value,
        id: query.payload.milestoneId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Milestone not found", {
            code: "milestone_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetResourceHandler(
  deps: ProjectHandlerDeps,
): QueryHandler<GetResourcePayload, Resource> {
  return {
    queryType: ProjectsQueryTypes.GetResource,
    authorize(query) {
      return companyResource(
        "resource",
        ProjectsPolicyActions.ResourceRead,
        query.payload.companyId,
        query.payload.resourceId,
      );
    },
    validate() {
      return getResourceQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.resources.findById({
        companyId: scope.value,
        id: query.payload.resourceId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Resource not found", {
            code: "resource_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetTeamHandler(
  deps: ProjectHandlerDeps,
): QueryHandler<
  GetTeamPayload,
  { team: Team; memberships: readonly TeamMembership[] }
> {
  return {
    queryType: ProjectsQueryTypes.GetTeam,
    authorize(query) {
      return companyResource(
        "team",
        ProjectsPolicyActions.TeamRead,
        query.payload.companyId,
        query.payload.teamId,
      );
    },
    validate() {
      return getTeamQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.teams.findById({
        companyId: scope.value,
        id: query.payload.teamId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Team not found", { code: "team_not_found" }),
        );
      }

      let memberships: readonly TeamMembership[] = [];
      if (query.payload.includeMemberships !== false) {
        const listed = await deps.teams.listMemberships(
          scope.value,
          found.value.id,
        );
        if (!listed.ok) return listed;
        memberships = listed.value;
      }

      return ok({ team: found.value, memberships });
    },
  };
}

export function createGetScheduleHandler(
  deps: ProjectHandlerDeps,
): QueryHandler<GetSchedulePayload, Schedule> {
  return {
    queryType: ProjectsQueryTypes.GetSchedule,
    authorize(query) {
      return companyResource(
        "schedule",
        ProjectsPolicyActions.ScheduleRead,
        query.payload.companyId,
        query.payload.scheduleId,
      );
    },
    validate() {
      return getScheduleQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.schedules.findById({
        companyId: scope.value,
        id: query.payload.scheduleId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Schedule not found", {
            code: "schedule_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetWorkItemHandler(
  deps: ProjectHandlerDeps,
): QueryHandler<GetWorkItemPayload, WorkItem> {
  return {
    queryType: ProjectsQueryTypes.GetWorkItem,
    authorize(query) {
      return companyResource(
        "work_item",
        ProjectsPolicyActions.WorkItemRead,
        query.payload.companyId,
        query.payload.workItemId,
      );
    },
    validate() {
      return getWorkItemQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.workItems.findById({
        companyId: scope.value,
        id: query.payload.workItemId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Work item not found", {
            code: "work_item_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetProjectSummaryHandler(
  deps: ProjectHandlerDeps,
): QueryHandler<GetProjectSummaryPayload, ProjectSummary> {
  return {
    queryType: ProjectsQueryTypes.GetProjectSummary,
    authorize(query) {
      return companyResource(
        "project",
        ProjectsPolicyActions.SummaryRead,
        query.payload.companyId,
        query.payload.projectId,
      );
    },
    validate() {
      return getProjectSummaryQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const project = await deps.projects.findById({
        companyId: scope.value,
        id: query.payload.projectId,
      });
      if (!project.ok) return project;
      if (!project.value) {
        return fail(
          new NotFoundError("Project not found", { code: "project_not_found" }),
        );
      }

      const page: PageRequest = query.payload.page ?? {
        page: 1,
        pageSize: 500,
      };

      const tasks = await deps.tasks.listByProject(
        scope.value,
        query.payload.projectId,
        page,
      );
      if (!tasks.ok) return tasks;

      const milestones = await deps.milestones.listByProject(
        scope.value,
        query.payload.projectId,
        page,
      );
      if (!milestones.ok) return milestones;

      const workItems = await deps.workItems.listByProject(
        scope.value,
        query.payload.projectId,
        page,
      );
      if (!workItems.ok) return workItems;

      return ok({
        companyId: scope.value,
        projectId: query.payload.projectId,
        taskCount: tasks.value.items.length,
        milestoneCount: milestones.value.items.length,
        workItemCount: workItems.value.items.length,
        openTaskIds: tasks.value.items
          .filter((t) => t.status !== "completed" && t.status !== "cancelled")
          .map((t) => t.id),
        completedMilestoneIds: milestones.value.items
          .filter((m) => m.status === "completed")
          .map((m) => m.id),
        openWorkItemIds: workItems.value.items
          .filter((w) => w.status !== "completed" && w.status !== "cancelled")
          .map((w) => w.id),
      });
    },
  };
}
