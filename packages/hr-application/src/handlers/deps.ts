import type { EmployeeRepository } from "@afh/hr";
import type { SecurityAuditService } from "@afh/identity";

export type HrHandlerDeps = {
  readonly employees: EmployeeRepository;
  readonly audit: SecurityAuditService;
};
