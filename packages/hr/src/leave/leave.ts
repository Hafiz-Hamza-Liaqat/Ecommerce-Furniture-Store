/**
 * Leave models — status is metadata; Workflow owns lifecycle.
 * No leave engine / approval execution.
 */

export type LeaveType = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly paid: boolean | null;
};

export type LeaveRequestStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled";

export type LeaveRequest = {
  readonly id: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly leaveTypeId: string;
  readonly status: LeaveRequestStatus;
  readonly startDate: string;
  readonly endDate: string;
  readonly reason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type LeaveBalanceReference = {
  readonly balanceId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly leaveTypeId: string;
  readonly asOf: string | null;
  /** Opaque balance snapshot — no calculation here */
  readonly balanceRef: string | null;
};

export type HolidayCalendarReference = {
  readonly calendarId: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly name: string | null;
};
