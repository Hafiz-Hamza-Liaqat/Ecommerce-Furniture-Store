/**
 * Employee profile — Identity owns authentication / principals.
 * Trades (Carpenter/Painter/Polisher) are Employee + Team, not RBAC roles.
 */

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "temporary"
  | "intern"
  | "other";

export type EmploymentStatus =
  | "draft"
  | "active"
  | "on_leave"
  | "suspended"
  | "terminated"
  | "archived";

export type EmployeeReference = {
  readonly employeeId: string;
  readonly companyId: string;
  /** Identity user id — Identity remains principal owner */
  readonly userId: string | null;
  readonly displayName: string | null;
};

export type EmploymentProfile = {
  readonly id: string;
  readonly companyId: string;
  readonly employeeCode: string | null;
  readonly userId: string | null;
  readonly displayName: string;
  readonly employmentType: EmploymentType;
  readonly status: EmploymentStatus;
  readonly departmentId: string | null;
  readonly designationId: string | null;
  readonly managerEmployeeId: string | null;
  readonly hireDate: string | null;
  readonly terminationDate: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type Designation = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
};
