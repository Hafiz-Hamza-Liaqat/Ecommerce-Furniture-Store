/**
 * Reporting validation — structural only.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type {
  DashboardDefinition,
  ExportRequest,
  ReportDefinition,
  ReportExecution,
  ReportTemplate,
} from "../models/models.js";

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

export const reportDefinitionStructureValidator: Validator<ReportDefinition> = {
  validate(input: ReportDefinition): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const reportTemplateStructureValidator: Validator<ReportTemplate> = {
  validate(input: ReportTemplate): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const reportExecutionStructureValidator: Validator<ReportExecution> = {
  validate(input: ReportExecution): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("reportDefinitionId", input.reportDefinitionId) ??
      validationOk()
    );
  },
};

export const dashboardDefinitionStructureValidator: Validator<DashboardDefinition> =
  {
    validate(input: DashboardDefinition): ValidationOutcome {
      return (
        requireNonEmpty("id", input.id) ??
        requireNonEmpty("code", input.code) ??
        requireNonEmpty("name", input.name) ??
        validationOk()
      );
    },
  };

export const exportRequestStructureValidator: Validator<ExportRequest> = {
  validate(input: ExportRequest): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("reportDefinitionId", input.reportDefinitionId) ??
      validationOk()
    );
  },
};

export type ReportingValidators = {
  readonly reportDefinition: Validator<ReportDefinition>;
  readonly reportTemplate: Validator<ReportTemplate>;
  readonly reportExecution: Validator<ReportExecution>;
  readonly dashboardDefinition: Validator<DashboardDefinition>;
  readonly exportRequest: Validator<ExportRequest>;
};

export function createReportingValidators(): ReportingValidators {
  return {
    reportDefinition: reportDefinitionStructureValidator,
    reportTemplate: reportTemplateStructureValidator,
    reportExecution: reportExecutionStructureValidator,
    dashboardDefinition: dashboardDefinitionStructureValidator,
    exportRequest: exportRequestStructureValidator,
  };
}
