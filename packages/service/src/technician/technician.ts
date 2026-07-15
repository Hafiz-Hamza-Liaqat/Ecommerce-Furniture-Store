/**
 * Technician / team references — Identity owns employees.
 * No dispatch or assignment engine.
 */

export type TechnicianReference = {
  readonly employeeId: string;
  readonly companyId: string;
  readonly userId: string | null;
  readonly displayName: string | null;
};

export type ServiceTeamReference = {
  readonly teamId: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly name: string | null;
};

/** Opaque assignment record — no assignment logic here */
export type TechnicianAssignmentReference = {
  readonly assignmentId: string;
  readonly companyId: string;
  readonly workOrderId: string | null;
  readonly appointmentId: string | null;
  readonly technician: TechnicianReference;
  readonly team: ServiceTeamReference | null;
  readonly assignedAt: string | null;
};
