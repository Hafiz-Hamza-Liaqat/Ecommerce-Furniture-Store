/**
 * Workforce models — no scheduling / shift allocation engine.
 * Trade crews are teams, not RBAC roles.
 */

export type WorkforceGroupKind =
  | "team"
  | "crew"
  | "technician_group"
  | "trade"
  | "other";

export type WorkforceGroup = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly kind: WorkforceGroupKind;
  /** Optional link to projects/identity team */
  readonly identityTeamId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type TeamMembership = {
  readonly id: string;
  readonly companyId: string;
  readonly groupId: string;
  readonly employeeId: string;
  readonly roleLabel: string | null;
  readonly joinedAt: string;
  readonly leftAt: string | null;
};

export type WorkforceAssignmentReference = {
  readonly assignmentId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly assignedAt: string | null;
};

export type ShiftReference = {
  readonly shiftId: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly name: string | null;
};

export type Crew = WorkforceGroup & { readonly kind: "crew" };
export type TechnicianGroup = WorkforceGroup & {
  readonly kind: "technician_group";
};
