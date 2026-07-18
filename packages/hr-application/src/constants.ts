/**
 * HR application constants.
 */

export const HrCommandTypes = {
  CreateEmployee: "hr.CreateEmployee",
} as const;

export const HrQueryTypes = {
  GetEmployee: "hr.GetEmployee",
  ListEmployee: "hr.ListEmployee",
} as const;

export const HrPolicyActions = {
  EmployeeCreate: "hr.employees.create",
  EmployeeRead: "hr.employees.read",
} as const;

/** Known employment types — unrecognized input falls back to "full_time". */
export const KNOWN_EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "intern",
  "other",
] as const;
