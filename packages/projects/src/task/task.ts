/**
 * Task contracts — no execution workflow.
 */

export type TaskStatus =
  | "draft"
  | "ready"
  | "in_progress"
  | "blocked"
  | "completed"
  | "cancelled";

export type TaskPriority = "low" | "normal" | "high" | "critical";

export type Task = {
  readonly id: string;
  readonly companyId: string;
  readonly projectId: string | null;
  readonly parentTaskId: string | null;
  readonly code: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assigneeUserId: string | null;
  readonly assigneeTeamId: string | null;
  readonly dueAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type TaskReference = {
  readonly taskId: string;
  readonly companyId: string;
  readonly projectId: string | null;
};
