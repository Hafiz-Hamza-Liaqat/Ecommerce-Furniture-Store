/**
 * Reporting application commands — no transport DTOs.
 */

export type RunReportPayload = {
  readonly companyId: string;
  readonly reportDefinitionId: string;
};
