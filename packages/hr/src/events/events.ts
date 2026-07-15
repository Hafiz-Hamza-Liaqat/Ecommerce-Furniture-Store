/**
 * HR domain event contracts — no publishers, no Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type EmployeeCreatedPayload = {
  readonly employeeId: string;
  readonly companyId: string;
  readonly userId: string | null;
};

export type EmployeeTransferredPayload = {
  readonly employeeId: string;
  readonly companyId: string;
  readonly fromDepartmentId: string | null;
  readonly toDepartmentId: string | null;
};

export type CertificationAddedPayload = {
  readonly certificationId: string;
  readonly companyId: string;
  readonly employeeId: string;
};

export type LeaveRequestedPayload = {
  readonly leaveRequestId: string;
  readonly companyId: string;
  readonly employeeId: string;
};

export type AttendanceRecordedPayload = {
  readonly attendanceRecordId: string;
  readonly companyId: string;
  readonly employeeId: string;
};

export const HrEventTypes = {
  EmployeeCreated: "hr.employee.created",
  EmployeeTransferred: "hr.employee.transferred",
  CertificationAdded: "hr.certification.added",
  LeaveRequested: "hr.leave.requested",
  AttendanceRecorded: "hr.attendance.recorded",
} as const;

export type HrEventType = (typeof HrEventTypes)[keyof typeof HrEventTypes];

export type HrDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: HrEventType | string;
  };
};

export type EmployeeCreatedEvent = HrDomainEvent<EmployeeCreatedPayload>;
export type EmployeeTransferredEvent =
  HrDomainEvent<EmployeeTransferredPayload>;
export type CertificationAddedEvent =
  HrDomainEvent<CertificationAddedPayload>;
export type LeaveRequestedEvent = HrDomainEvent<LeaveRequestedPayload>;
export type AttendanceRecordedEvent =
  HrDomainEvent<AttendanceRecordedPayload>;
