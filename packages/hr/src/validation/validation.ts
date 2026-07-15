/**
 * HR validation — structural only. No business validation.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { EmploymentProfile } from "../employee/employee.js";
import type { Department } from "../organization/organization.js";
import type { WorkforceGroup } from "../workforce/workforce.js";
import type { AttendanceRecord } from "../attendance/attendance.js";
import type { LeaveRequest } from "../leave/leave.js";
import type { Certification } from "../skills/skills.js";
import type { PayrollProfile } from "../payroll/payroll.js";

function requireNonEmpty(
  field: string,
  value: string | null | undefined,
): ValidationOutcome | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const employmentProfileStructureValidator: Validator<EmploymentProfile> =
  {
    validate(input: EmploymentProfile): ValidationOutcome {
      return (
        requireNonEmpty("id", input.id) ??
        requireNonEmpty("companyId", input.companyId) ??
        requireNonEmpty("displayName", input.displayName) ??
        validationOk()
      );
    },
  };

export const departmentStructureValidator: Validator<Department> = {
  validate(input: Department): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const workforceGroupStructureValidator: Validator<WorkforceGroup> = {
  validate(input: WorkforceGroup): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const attendanceRecordStructureValidator: Validator<AttendanceRecord> = {
  validate(input: AttendanceRecord): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("employeeId", input.employeeId) ??
      requireNonEmpty("workDate", input.workDate) ??
      validationOk()
    );
  },
};

export const leaveRequestStructureValidator: Validator<LeaveRequest> = {
  validate(input: LeaveRequest): ValidationOutcome {
    if (input.endDate < input.startDate) {
      return validationFail([
        {
          field: "endDate",
          code: "invalid",
          message: "endDate must be >= startDate",
        },
      ]);
    }
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("employeeId", input.employeeId) ??
      requireNonEmpty("leaveTypeId", input.leaveTypeId) ??
      requireNonEmpty("startDate", input.startDate) ??
      requireNonEmpty("endDate", input.endDate) ??
      validationOk()
    );
  },
};

export const certificationStructureValidator: Validator<Certification> = {
  validate(input: Certification): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("employeeId", input.employeeId) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const payrollProfileStructureValidator: Validator<PayrollProfile> = {
  validate(input: PayrollProfile): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("employeeId", input.employeeId) ??
      validationOk()
    );
  },
};

export type HumanResourcesValidators = {
  readonly employmentProfile: Validator<EmploymentProfile>;
  readonly department: Validator<Department>;
  readonly workforceGroup: Validator<WorkforceGroup>;
  readonly attendanceRecord: Validator<AttendanceRecord>;
  readonly leaveRequest: Validator<LeaveRequest>;
  readonly certification: Validator<Certification>;
  readonly payrollProfile: Validator<PayrollProfile>;
};

export function createHumanResourcesValidators(): HumanResourcesValidators {
  return {
    employmentProfile: employmentProfileStructureValidator,
    department: departmentStructureValidator,
    workforceGroup: workforceGroupStructureValidator,
    attendanceRecord: attendanceRecordStructureValidator,
    leaveRequest: leaveRequestStructureValidator,
    certification: certificationStructureValidator,
    payrollProfile: payrollProfileStructureValidator,
  };
}
