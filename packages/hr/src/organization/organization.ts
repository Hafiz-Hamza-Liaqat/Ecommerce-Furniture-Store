/**
 * Organization structure — no organization engine.
 */

export type Department = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly parentDepartmentId: string | null;
  readonly divisionId: string | null;
};

export type Division = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly businessUnitId: string | null;
};

export type BusinessUnit = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
};

export type CostCenterReference = {
  readonly costCenterId: string;
  readonly companyId: string;
  readonly code: string | null;
};

export type ReportingHierarchyNode = {
  readonly employeeId: string;
  readonly companyId: string;
  readonly managerEmployeeId: string | null;
  readonly departmentId: string | null;
};
