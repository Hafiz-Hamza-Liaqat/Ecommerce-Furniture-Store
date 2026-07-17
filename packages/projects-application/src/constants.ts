/**
 * Projects application constants.
 */

export const ProjectsCommandTypes = {
  CreateProject: "projects.CreateProject",
  UpdateProject: "projects.UpdateProject",
  ArchiveProject: "projects.ArchiveProject",
  CreateTask: "projects.CreateTask",
  UpdateTask: "projects.UpdateTask",
  AssignTask: "projects.AssignTask",
  CompleteTask: "projects.CompleteTask",
  CreateMilestone: "projects.CreateMilestone",
  UpdateMilestone: "projects.UpdateMilestone",
  AssignResource: "projects.AssignResource",
  ReleaseResource: "projects.ReleaseResource",
  UpdateSchedule: "projects.UpdateSchedule",
} as const;

export const ProjectsQueryTypes = {
  GetProject: "projects.GetProject",
  GetTask: "projects.GetTask",
  GetMilestone: "projects.GetMilestone",
  GetResource: "projects.GetResource",
  GetTeam: "projects.GetTeam",
  GetSchedule: "projects.GetSchedule",
  GetWorkItem: "projects.GetWorkItem",
  GetProjectSummary: "projects.GetProjectSummary",
} as const;

export const ProjectsWorkflowCodes = {
  Project: "project_v1",
  Task: "project_task_v1",
  Milestone: "project_milestone_v1",
} as const;

export const ProjectsSubjectTypes = {
  Project: "projects.project",
  Task: "projects.task",
  Milestone: "projects.milestone",
  Resource: "projects.resource",
  Schedule: "projects.schedule",
  WorkItem: "projects.work_item",
} as const;

/** Rules remain external — scheduling, allocation, utilization, costing */
export const ProjectsRuleSetCodes = {
  Scheduling: "projects.scheduling",
  ResourceAllocation: "projects.resource_allocation",
  Utilization: "projects.utilization",
  WorkloadBalancing: "projects.workload_balancing",
  ProjectCosting: "projects.costing",
} as const;

/**
 * Canonical RC5 permission codes (`<module>.<resource>.<action>`), normalized
 * from legacy executable keys in RC5.3 per the frozen RC5.1 mapping. The seed
 * keeps granting the legacy compatibility codes as the documented overlap
 * window for rollback.
 */
export const ProjectsPolicyActions = {
  ProjectCreate: "projects.projects.create",
  ProjectUpdate: "projects.projects.update",
  ProjectArchive: "projects.projects.archive",
  ProjectRead: "projects.projects.read",
  TaskCreate: "projects.tasks.create",
  TaskUpdate: "projects.tasks.update",
  TaskAssign: "projects.tasks.assign",
  TaskComplete: "projects.tasks.complete",
  TaskRead: "projects.tasks.read",
  MilestoneCreate: "projects.milestones.create",
  MilestoneUpdate: "projects.milestones.update",
  MilestoneRead: "projects.milestones.read",
  ResourceAssign: "projects.resources.assign",
  ResourceRelease: "projects.resources.release",
  ResourceRead: "projects.resources.read",
  TeamRead: "projects.teams.read",
  ScheduleUpdate: "projects.schedules.update",
  ScheduleRead: "projects.schedules.read",
  WorkItemRead: "projects.work_items.read",
  SummaryRead: "projects.summary.read",
} as const;

export const ProjectsApprovalTypes = {
  ProjectArchive: "projects.project_archive",
  ResourceAssign: "projects.resource_assign",
} as const;
