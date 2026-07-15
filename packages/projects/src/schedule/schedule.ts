/**
 * Schedule contracts — no scheduling algorithms.
 */

export type ScheduleStatus = "draft" | "published" | "archived";

export type CalendarReference = {
  readonly calendarId: string;
  readonly companyId: string;
  readonly timezone: string | null;
};

export type TimeWindow = {
  readonly startAt: string;
  readonly endAt: string;
  readonly timezone: string | null;
};

export type DependencyKind =
  | "finish_to_start"
  | "start_to_start"
  | "finish_to_finish"
  | "start_to_finish"
  | "other";

export type DependencyReference = {
  readonly dependencyId: string;
  readonly fromSubjectType: string;
  readonly fromSubjectId: string;
  readonly toSubjectType: string;
  readonly toSubjectId: string;
  readonly kind: DependencyKind;
};

export type Schedule = {
  readonly id: string;
  readonly companyId: string;
  readonly projectId: string | null;
  readonly code: string | null;
  readonly name: string;
  readonly status: ScheduleStatus;
  readonly calendar: CalendarReference | null;
  readonly window: TimeWindow | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};
