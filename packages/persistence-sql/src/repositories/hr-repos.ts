/**
 * SQL adapters for HR domain repositories.
 */

import { ok, type Clock } from "@afh/shared-kernel";
import type {
  AttendanceRecord,
  AttendanceRepository,
  BusinessUnit,
  Certification,
  Department,
  DepartmentRepository,
  Designation,
  Division,
  EmployeeRepository,
  EmploymentProfile,
  LeaveRepository,
  LeaveRequest,
  LeaveType,
  PayrollProfile,
  PayrollProfileRepository,
  Skill,
  SkillsRepository,
  TeamMembership,
  WorkforceGroup,
  WorkforceRepository,
} from "@afh/hr";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlDocumentRepository } from "../mapping/document-repository.js";

export function createSqlEmployeeRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): EmployeeRepository {
  const docs = new SqlDocumentRepository<EmploymentProfile>(
    client,
    "hr.employment_profile",
    clock,
  );
  const designations = new SqlDocumentRepository<Designation>(
    client,
    "hr.designation",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveDesignation: (designation) => designations.save(designation),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlDepartmentRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): DepartmentRepository {
  const departments = new SqlDocumentRepository<Department>(
    client,
    "hr.department",
    clock,
  );
  const divisions = new SqlDocumentRepository<Division>(
    client,
    "hr.division",
    clock,
  );
  const units = new SqlDocumentRepository<BusinessUnit>(
    client,
    "hr.business_unit",
    clock,
  );
  return {
    findById: (key) => departments.findById(key),
    save: (e) => departments.save(e),
    saveDivision: (division) => divisions.save(division),
    saveBusinessUnit: (unit) => units.save(unit),
  };
}

export function createSqlWorkforceRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): WorkforceRepository {
  const groups = new SqlDocumentRepository<WorkforceGroup>(
    client,
    "hr.workforce_group",
    clock,
  );
  const memberships = new SqlDocumentRepository<TeamMembership>(
    client,
    "hr.team_membership",
    clock,
  );
  return {
    findGroupById: (key) => groups.findById(key),
    saveGroup: (group) => groups.save(group),
    saveMembership: (membership) =>
      memberships.save(membership, membership.groupId),
    listMemberships: (companyId, groupId) =>
      memberships.listByParent(companyId, groupId),
  };
}

export function createSqlAttendanceRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): AttendanceRepository {
  const docs = new SqlDocumentRepository<AttendanceRecord>(
    client,
    "hr.attendance_record",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (record) => docs.save(record, record.employeeId),
  };
}

export function createSqlLeaveRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): LeaveRepository {
  const requests = new SqlDocumentRepository<LeaveRequest>(
    client,
    "hr.leave_request",
    clock,
  );
  const types = new SqlDocumentRepository<LeaveType>(
    client,
    "hr.leave_type",
    clock,
  );
  return {
    findRequestById: (key) => requests.findById(key),
    saveRequest: (request) => requests.save(request, request.employeeId),
    saveLeaveType: (leaveType) => types.save(leaveType),
  };
}

export function createSqlSkillsRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SkillsRepository {
  const skills = new SqlDocumentRepository<Skill>(client, "hr.skill", clock);
  const certifications = new SqlDocumentRepository<Certification>(
    client,
    "hr.certification",
    clock,
  );
  return {
    saveSkill: (skill) => skills.save(skill),
    saveCertification: (certification) =>
      certifications.save(certification, certification.employeeId),
  };
}

export function createSqlPayrollProfileRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): PayrollProfileRepository {
  const docs = new SqlDocumentRepository<PayrollProfile>(
    client,
    "hr.payroll_profile",
    clock,
  );
  return {
    findByEmployee: async (companyId, employeeId) => {
      const listed = await docs.listByParent(companyId, employeeId);
      if (!listed.ok) return listed;
      return ok(listed.value[0] ?? null);
    },
    save: (profile) => docs.save(profile, profile.employeeId),
  };
}
