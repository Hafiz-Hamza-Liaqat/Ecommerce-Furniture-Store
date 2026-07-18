/**
 * HR application queries — no transport DTOs.
 */

import type { EmploymentProfile } from "@afh/hr";
import type { ListQueryRequest } from "@afh/shared-kernel";

export type GetEmployeePayload = {
  readonly companyId: string;
  readonly employeeId: string;
};

export type ListEmployeePayload = ListQueryRequest;

export type GetEmployeeResult = {
  readonly employee: EmploymentProfile;
};
