/**
 * RC7.2f — Projects List* sort/filter allow-lists (validators + handlers).
 */

export const PROJECT_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "name",
  "code",
  "status",
  "projectType",
]);

export const PROJECT_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "code",
  "name",
  "projectType",
  "classification",
  "customerId",
  "organizationId",
  "ownerUserId",
]);

export const TASK_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "title",
  "code",
  "status",
  "priority",
  "dueAt",
]);

export const TASK_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "priority",
  "code",
  "title",
  "projectId",
  "assigneeUserId",
  "assigneeTeamId",
]);

export const MILESTONE_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "name",
  "code",
  "status",
]);

export const MILESTONE_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "code",
  "name",
  "projectId",
]);
