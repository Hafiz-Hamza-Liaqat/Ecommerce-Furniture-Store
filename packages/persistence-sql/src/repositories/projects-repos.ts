/**
 * SQL adapters for Projects domain repositories.
 */

import { ok, type Clock } from "@afh/shared-kernel";
import type {
  Milestone,
  MilestoneRepository,
  Project,
  ProjectRepository,
  Resource,
  ResourceRepository,
  Schedule,
  ScheduleRepository,
  Task,
  TaskRepository,
  Team,
  TeamMembership,
  TeamRepository,
  WorkAssignment,
  WorkItem,
  WorkItemRepository,
} from "@afh/projects";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlDocumentRepository } from "../mapping/document-repository.js";

export function createSqlProjectRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ProjectRepository {
  const docs = new SqlDocumentRepository<Project>(
    client,
    "projects.project",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    remove: (key) => docs.remove(key),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlResourceRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ResourceRepository {
  const docs = new SqlDocumentRepository<Resource>(
    client,
    "projects.resource",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlTeamRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): TeamRepository {
  const docs = new SqlDocumentRepository<Team>(client, "projects.team", clock);
  const memberships = new SqlDocumentRepository<TeamMembership>(
    client,
    "projects.team_membership",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (team) => docs.save(team, team.projectId),
    saveMembership: (membership) =>
      memberships.save(membership, membership.teamId),
    listMemberships: (companyId, teamId) =>
      memberships.listByParent(companyId, teamId),
  };
}

export function createSqlTaskRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): TaskRepository {
  const docs = new SqlDocumentRepository<Task>(client, "projects.task", clock);
  return {
    findById: (key) => docs.findById(key),
    save: (task) => docs.save(task, task.projectId),
    listByProject: (companyId, projectId, page) =>
      docs.listByParentScoped(companyId, projectId, page),
    listChildren: async (companyId, parentTaskId) => {
      const listed = await docs.listByCompany(companyId);
      if (!listed.ok) return listed;
      return ok(listed.value.items.filter((t) => t.parentTaskId === parentTaskId));
    },
  };
}

export function createSqlMilestoneRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): MilestoneRepository {
  const docs = new SqlDocumentRepository<Milestone>(
    client,
    "projects.milestone",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (milestone) => docs.save(milestone, milestone.projectId),
    listByProject: (companyId, projectId, page) =>
      docs.listByParentScoped(companyId, projectId, page),
  };
}

export function createSqlScheduleRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ScheduleRepository {
  const docs = new SqlDocumentRepository<Schedule>(
    client,
    "projects.schedule",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
  };
}

export function createSqlWorkItemRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): WorkItemRepository {
  const docs = new SqlDocumentRepository<WorkItem>(
    client,
    "projects.work_item",
    clock,
  );
  const assignments = new SqlDocumentRepository<WorkAssignment>(
    client,
    "projects.work_assignment",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (workItem) => docs.save(workItem, workItem.projectId),
    saveAssignment: (assignment) =>
      assignments.save(assignment, assignment.workItemId),
    listByProject: (companyId, projectId, page) =>
      docs.listByParentScoped(companyId, projectId, page),
  };
}
