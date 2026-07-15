/**
 * HR repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { EmploymentProfile, Designation } from "../employee/employee.js";
import type { Department, Division, BusinessUnit } from "../organization/organization.js";
import type {
  WorkforceGroup,
  TeamMembership,
} from "../workforce/workforce.js";
import type { AttendanceRecord } from "../attendance/attendance.js";
import type { LeaveRequest, LeaveType } from "../leave/leave.js";
import type { Certification, Skill } from "../skills/skills.js";
import type { PayrollProfile } from "../payroll/payroll.js";

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

export interface EmployeeRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<EmploymentProfile | null, PlatformError>>;
  save(profile: EmploymentProfile): Promise<Result<void, PlatformError>>;
  saveDesignation(
    designation: Designation,
  ): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<EmploymentProfile>, PlatformError>>;
}

export interface DepartmentRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Department | null, PlatformError>>;
  save(department: Department): Promise<Result<void, PlatformError>>;
  saveDivision(division: Division): Promise<Result<void, PlatformError>>;
  saveBusinessUnit(unit: BusinessUnit): Promise<Result<void, PlatformError>>;
}

export interface WorkforceRepository {
  findGroupById(
    key: CompanyScopedId,
  ): Promise<Result<WorkforceGroup | null, PlatformError>>;
  saveGroup(group: WorkforceGroup): Promise<Result<void, PlatformError>>;
  saveMembership(
    membership: TeamMembership,
  ): Promise<Result<void, PlatformError>>;
  listMemberships(
    companyId: string,
    groupId: string,
  ): Promise<Result<readonly TeamMembership[], PlatformError>>;
}

export interface AttendanceRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<AttendanceRecord | null, PlatformError>>;
  save(record: AttendanceRecord): Promise<Result<void, PlatformError>>;
}

export interface LeaveRepository {
  findRequestById(
    key: CompanyScopedId,
  ): Promise<Result<LeaveRequest | null, PlatformError>>;
  saveRequest(request: LeaveRequest): Promise<Result<void, PlatformError>>;
  saveLeaveType(leaveType: LeaveType): Promise<Result<void, PlatformError>>;
}

export interface SkillsRepository {
  saveSkill(skill: Skill): Promise<Result<void, PlatformError>>;
  saveCertification(
    certification: Certification,
  ): Promise<Result<void, PlatformError>>;
}

export interface PayrollProfileRepository {
  findByEmployee(
    companyId: string,
    employeeId: string,
  ): Promise<Result<PayrollProfile | null, PlatformError>>;
  save(profile: PayrollProfile): Promise<Result<void, PlatformError>>;
}
