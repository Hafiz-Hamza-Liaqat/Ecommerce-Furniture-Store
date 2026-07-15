/**
 * Projects application commands — intent only.
 */

import type {
  ProjectClassification,
  ProjectType,
  TaskPriority,
} from "@afh/projects";
import { ProjectsCommandTypes } from "../constants.js";

export type CreateProjectPayload = {
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly projectType: ProjectType;
  readonly classification: ProjectClassification;
  readonly customerId?: string | null;
  readonly organizationId?: string | null;
  readonly siteAddressId?: string | null;
  readonly ownerUserId?: string | null;
};

export type UpdateProjectPayload = {
  readonly companyId: string;
  readonly projectId: string;
  readonly code?: string | null;
  readonly name?: string | null;
  readonly projectType?: ProjectType | null;
  readonly classification?: ProjectClassification | null;
  readonly customerId?: string | null;
  readonly organizationId?: string | null;
  readonly siteAddressId?: string | null;
  readonly ownerUserId?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type ArchiveProjectPayload = {
  readonly companyId: string;
  readonly projectId: string;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  readonly requireApproval?: boolean;
};

export type CreateTaskPayload = {
  readonly companyId: string;
  readonly title: string;
  readonly projectId?: string | null;
  readonly parentTaskId?: string | null;
  readonly code?: string | null;
  readonly description?: string | null;
  readonly priority?: TaskPriority;
  readonly dueAt?: string | null;
};

export type UpdateTaskPayload = {
  readonly companyId: string;
  readonly taskId: string;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly priority?: TaskPriority | null;
  readonly dueAt?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type AssignTaskPayload = {
  readonly companyId: string;
  readonly taskId: string;
  readonly assigneeUserId?: string | null;
  readonly assigneeTeamId?: string | null;
};

export type CompleteTaskPayload = {
  readonly companyId: string;
  readonly taskId: string;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type CreateMilestonePayload = {
  readonly companyId: string;
  readonly projectId: string;
  readonly name: string;
  readonly code?: string | null;
  readonly dueAt?: string | null;
  readonly timezone?: string | null;
};

export type UpdateMilestonePayload = {
  readonly companyId: string;
  readonly milestoneId: string;
  readonly name?: string | null;
  readonly code?: string | null;
  readonly dueAt?: string | null;
  readonly timezone?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type AssignResourcePayload = {
  readonly companyId: string;
  readonly resourceId: string;
  readonly projectId?: string | null;
  readonly workItemId?: string | null;
  readonly assigneeType?: "user" | "employee" | "team" | "resource";
  readonly assigneeId?: string | null;
  readonly requireApproval?: boolean;
};

export type ReleaseResourcePayload = {
  readonly companyId: string;
  readonly resourceId: string;
  readonly workItemId?: string | null;
  readonly assignmentId?: string | null;
};

export type UpdateSchedulePayload = {
  readonly companyId: string;
  readonly scheduleId: string;
  readonly name?: string | null;
  readonly code?: string | null;
  readonly projectId?: string | null;
  readonly calendarId?: string | null;
  readonly timezone?: string | null;
  readonly startAt?: string | null;
  readonly endAt?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export { ProjectsCommandTypes };
