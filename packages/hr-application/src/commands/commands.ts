/**
 * HR application commands — no transport DTOs.
 */

export type CreateEmployeePayload = {
  readonly companyId: string;
  readonly displayName: string;
  readonly employeeCode?: string | null;
  readonly userId?: string | null;
  readonly employmentType?: string;
  readonly departmentId?: string | null;
  readonly designationId?: string | null;
  readonly managerEmployeeId?: string | null;
  readonly hireDate?: string | null;
};
