/**
 * Project domain event contracts — no publishers, no Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type ProjectCreatedPayload = {
  readonly projectId: string;
  readonly companyId: string;
};

export type TaskCreatedPayload = {
  readonly taskId: string;
  readonly companyId: string;
  readonly projectId: string | null;
};

export type TaskAssignedPayload = {
  readonly taskId: string;
  readonly companyId: string;
  readonly assigneeUserId: string | null;
  readonly assigneeTeamId: string | null;
};

export type MilestoneCompletedPayload = {
  readonly milestoneId: string;
  readonly companyId: string;
  readonly projectId: string;
};

export type ResourceAssignedPayload = {
  readonly resourceId: string;
  readonly companyId: string;
  readonly projectId: string | null;
  readonly workItemId: string | null;
  readonly assignmentId: string | null;
};

export const ProjectEventTypes = {
  ProjectCreated: "projects.project.created",
  TaskCreated: "projects.task.created",
  TaskAssigned: "projects.task.assigned",
  MilestoneCompleted: "projects.milestone.completed",
  ResourceAssigned: "projects.resource.assigned",
} as const;

export type ProjectEventType =
  (typeof ProjectEventTypes)[keyof typeof ProjectEventTypes];

export type ProjectDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: ProjectEventType | string;
  };
};

export type ProjectCreatedEvent = ProjectDomainEvent<ProjectCreatedPayload>;
export type TaskCreatedEvent = ProjectDomainEvent<TaskCreatedPayload>;
export type TaskAssignedEvent = ProjectDomainEvent<TaskAssignedPayload>;
export type MilestoneCompletedEvent =
  ProjectDomainEvent<MilestoneCompletedPayload>;
export type ResourceAssignedEvent =
  ProjectDomainEvent<ResourceAssignedPayload>;
