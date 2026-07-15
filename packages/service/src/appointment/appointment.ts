/**
 * Appointment models — no scheduling engine.
 * Projects own scheduling; Workflow owns lifecycle.
 */

export type AppointmentStatus =
  | "draft"
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentWindow = {
  readonly startAt: string;
  readonly endAt: string;
  readonly timezone: string | null;
};

export type Appointment = {
  readonly id: string;
  readonly companyId: string;
  readonly status: AppointmentStatus;
  readonly window: AppointmentWindow;
  readonly serviceRequestId: string | null;
  readonly workOrderId: string | null;
  readonly projectId: string | null;
  readonly siteAddressId: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type AppointmentReference = {
  readonly appointmentId: string;
  readonly companyId: string;
};
