/**
 * Team foundation — work/project teams.
 * Trades remain Employee + Team in Identity (not RBAC roles); this model
 * references identity principals by opaque id. No organizational workflow.
 */

export type TeamKind =
  | "project"
  | "trade"
  | "crew"
  | "department"
  | "other";

export type TeamStatus = "active" | "inactive" | "archived";

export type Team = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly kind: TeamKind;
  readonly status: TeamStatus;
  /** Optional link to identity org / trade team SSoT */
  readonly identityTeamId: string | null;
  readonly projectId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Opaque team role label — not an RBAC role */
export type TeamRoleReference = {
  readonly roleCode: string;
  readonly label: string | null;
};

export type TeamMembership = {
  readonly id: string;
  readonly companyId: string;
  readonly teamId: string;
  readonly userId: string | null;
  readonly employeeId: string | null;
  readonly resourceId: string | null;
  readonly role: TeamRoleReference | null;
  readonly joinedAt: string;
  readonly leftAt: string | null;
};

export type AssignmentReference = {
  readonly assignmentId: string;
  readonly companyId: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly assigneeType: "user" | "employee" | "team" | "resource";
  readonly assigneeId: string;
};
