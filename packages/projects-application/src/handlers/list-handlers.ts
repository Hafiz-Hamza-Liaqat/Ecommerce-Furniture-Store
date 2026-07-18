/**
 * RC7.2f — Projects List* query handlers.
 * Authorization totals and paging via buildAuthorizedListPage (ADR D56).
 * Projects remains owner of aggregates/repositories; this file only adds List*.
 * In scope: ListProject, ListTask, ListMilestone — Resource/Schedule/WorkItem stay out.
 */

import type { QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { Page } from "@afh/shared-kernel";
import type { Milestone, Project, Task } from "@afh/projects";
import { ProjectsPolicyActions, ProjectsQueryTypes } from "../constants.js";
import type {
  ListMilestonePayload,
  ListProjectPayload,
  ListTaskPayload,
} from "../queries/queries.js";
import {
  listMilestoneQueryValidator,
  listProjectQueryValidator,
  listTaskQueryValidator,
} from "../validators/validators.js";
import type { ProjectHandlerDeps } from "./deps.js";
import { companyResource, requireCompanyId } from "../support/support.js";
import { createProjectsListCandidateFetcher } from "./list-support.js";

export {
  PROJECT_FILTER_FIELDS,
  PROJECT_SORT_FIELDS,
  TASK_FILTER_FIELDS,
  TASK_SORT_FIELDS,
  MILESTONE_FILTER_FIELDS,
  MILESTONE_SORT_FIELDS,
} from "../list-fields.js";

export function createListProjectHandler(
  deps: ProjectHandlerDeps,
): QueryHandler<ListProjectPayload, Page<Project>> {
  return {
    queryType: ProjectsQueryTypes.ListProject,
    authorize(query, ctx) {
      return companyResource(
        "project",
        ProjectsPolicyActions.ProjectRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, ProjectsPolicyActions.ProjectRead),
      );
    },
    validate() {
      return listProjectQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Project>({
        ctx,
        action: ProjectsPolicyActions.ProjectRead,
        resourceType: "project",
        request,
        toScope: (p) => ({
          id: p.id,
          companyId: p.companyId,
          ownerUserId: p.ownerUserId,
          organizationId: p.organizationId,
          attributes: {
            customerId: p.customerId,
          },
        }),
        fetchCandidates: createProjectsListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.projects.listByCompany(companyId, page),
          request,
          searchFields: ["name", "code"],
        }),
      });
    },
  };
}

export function createListTaskHandler(
  deps: ProjectHandlerDeps,
): QueryHandler<ListTaskPayload, Page<Task>> {
  return {
    queryType: ProjectsQueryTypes.ListTask,
    authorize(query, ctx) {
      return companyResource(
        "task",
        ProjectsPolicyActions.TaskRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, ProjectsPolicyActions.TaskRead),
      );
    },
    validate() {
      return listTaskQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Task>({
        ctx,
        action: ProjectsPolicyActions.TaskRead,
        resourceType: "task",
        request,
        toScope: (t) => ({
          id: t.id,
          companyId: t.companyId,
          ownerUserId: t.assigneeUserId,
          attributes: {
            projectId: t.projectId,
            assigneeTeamId: t.assigneeTeamId,
          },
        }),
        fetchCandidates: createProjectsListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.tasks.listByCompany(companyId, page),
          request,
          searchFields: ["title", "code"],
        }),
      });
    },
  };
}

export function createListMilestoneHandler(
  deps: ProjectHandlerDeps,
): QueryHandler<ListMilestonePayload, Page<Milestone>> {
  return {
    queryType: ProjectsQueryTypes.ListMilestone,
    authorize(query, ctx) {
      return companyResource(
        "milestone",
        ProjectsPolicyActions.MilestoneRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, ProjectsPolicyActions.MilestoneRead),
      );
    },
    validate() {
      return listMilestoneQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Milestone>({
        ctx,
        action: ProjectsPolicyActions.MilestoneRead,
        resourceType: "milestone",
        request,
        toScope: (m) => ({
          id: m.id,
          companyId: m.companyId,
          attributes: {
            projectId: m.projectId,
          },
        }),
        fetchCandidates: createProjectsListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.milestones.listByCompany(companyId, page),
          request,
          searchFields: ["name", "code"],
        }),
      });
    },
  };
}
