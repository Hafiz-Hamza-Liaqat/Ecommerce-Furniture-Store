/**
 * Attendance contracts — no attendance calculations.
 */

export type AttendanceRecord = {
  readonly id: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly workDate: string;
  readonly clockInAt: string | null;
  readonly clockOutAt: string | null;
  readonly shiftId: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
};

export type ClockReference = {
  readonly clockEventId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly kind: "in" | "out" | "break_start" | "break_end";
  readonly occurredAt: string;
};

export type ShiftAssignment = {
  readonly id: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly shiftId: string;
  readonly workDate: string;
};

export type BreakReference = {
  readonly breakId: string;
  readonly attendanceRecordId: string;
  readonly companyId: string;
  readonly startAt: string | null;
  readonly endAt: string | null;
};
