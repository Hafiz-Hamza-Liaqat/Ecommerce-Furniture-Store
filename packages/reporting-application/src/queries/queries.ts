/**
 * Reporting application queries — no transport DTOs.
 */

import type { ReportDefinition } from "@afh/reporting";
import type { ListQueryRequest } from "@afh/shared-kernel";

export type GetReportDefinitionPayload = {
  readonly companyId: string;
  readonly reportDefinitionId: string;
};

export type ListReportDefinitionPayload = ListQueryRequest;

export type GetReportDefinitionResult = {
  readonly reportDefinition: ReportDefinition;
};
