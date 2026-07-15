/**
 * Activity models — no scheduling engine.
 */

export type ActivityType =
  | "call"
  | "meeting"
  | "email"
  | "task"
  | "note"
  | "visit"
  | "other";

export type ActivityOutcome =
  | "completed"
  | "no_answer"
  | "rescheduled"
  | "cancelled"
  | "other";

export type Activity = {
  readonly id: string;
  readonly companyId: string;
  readonly activityType: ActivityType;
  readonly subject: string;
  readonly notes: string | null;
  readonly outcome: ActivityOutcome | null;
  readonly leadId: string | null;
  readonly contactId: string | null;
  readonly accountId: string | null;
  readonly opportunityId: string | null;
  readonly ownerUserId: string | null;
  readonly dueAt: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ActivityReference = {
  readonly activityId: string;
  readonly companyId: string;
};
