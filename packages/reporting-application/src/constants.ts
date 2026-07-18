/**
 * Reporting application constants.
 */

export const ReportingCommandTypes = {
  RunReport: "reporting.RunReport",
} as const;

export const ReportingQueryTypes = {
  GetReportDefinition: "reporting.GetReportDefinition",
  ListReportDefinition: "reporting.ListReportDefinition",
} as const;

export const ReportingPolicyActions = {
  ReportRead: "reporting.report_definitions.read",
  ReportRun: "reporting.report_definitions.run",
} as const;
