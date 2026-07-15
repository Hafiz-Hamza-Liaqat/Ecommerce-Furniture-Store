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

export const ProjectsPolicyActions = {
  ProjectCreate: "project.create",
  ProjectUpdate: "project.update",
  ProjectArchive: "project.archive",
  ProjectRead: "project.read",
  TaskCreate: "task.create",
  TaskUpdate: "task.update",
  TaskAssign: "task.assign",
  TaskComplete: "task.complete",
  TaskRead: "task.read",
  MilestoneCreate: "milestone.create",
  MilestoneUpdate: "milestone.update",
  MilestoneRead: "milestone.read",
  ResourceAssign: "resource.assign",
  ResourceRelease: "resource.release",
  ResourceRead: "resource.read",
  TeamRead: "team.read",
  ScheduleUpdate: "schedule.update",
  ScheduleRead: "schedule.read",
  WorkItemRead: "work_item.read",
  SummaryRead: "project.summary.read",
} as const;

export const ProjectsApprovalTypes = {
  ProjectArchive: "projects.project_archive",
  ResourceAssign: "projects.resource_assign",
} as const;
