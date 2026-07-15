/**
 * Payroll references — no payroll calculations.
 * Finance owns financial lifecycle.
 */

export type PayrollProfile = {
  readonly id: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly compensationGradeId: string | null;
  readonly salaryStructureRef: string | null;
  readonly currencyCode: string | null;
  readonly effectiveFrom: string | null;
  readonly effectiveTo: string | null;
};

export type CompensationGrade = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
};

export type SalaryStructureReference = {
  readonly structureId: string;
  readonly companyId: string;
  readonly code: string | null;
};

export type BenefitReference = {
  readonly benefitId: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly name: string | null;
};
