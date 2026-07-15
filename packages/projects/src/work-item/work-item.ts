/**
 * Work item foundation — no progress calculations.
 */

export type WorkItemStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type WorkItem = {
  readonly id: string;
  readonly companyId: string;
  readonly projectId: string | null;
  readonly taskId: string | null;
  readonly title: string;
  readonly status: WorkItemStatus;
  readonly resourceId: string | null;
  readonly teamId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WorkAssignment = {
  readonly id: string;
  readonly companyId: string;
  readonly workItemId: string;
  readonly assigneeType: "user" | "employee" | "team" | "resource";
  readonly assigneeId: string;
  readonly assignedAt: string;
  readonly unassignedAt: string | null;
};

/** Opaque progress snapshot reference — no percent math here */
export type ProgressReference = {
  readonly workItemId: string;
  readonly progressRef: string;
  readonly asOf: string;
};

export type CompletionReference = {
  readonly workItemId: string;
  readonly completedAt: string;
  readonly completedByUserId: string | null;
};
