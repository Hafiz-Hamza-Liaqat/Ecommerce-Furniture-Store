/**
 * Milestone foundation — no scheduling engine.
 */

export type MilestoneStatus =
  | "planned"
  | "active"
  | "completed"
  | "missed"
  | "cancelled";

export type DueDateReference = {
  readonly dueAt: string;
  readonly timezone: string | null;
};

export type Milestone = {
  readonly id: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly code: string | null;
  readonly name: string;
  readonly status: MilestoneStatus;
  readonly due: DueDateReference | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};
