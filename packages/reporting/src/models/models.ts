/**
 * Reporting foundation — presentation owner contracts only.
 * No charts, PDFs, Excel, BI, SQL, or generation engines.
 */

export type ReportDefinitionStatus = "draft" | "active" | "archived";

export type ReportDefinition = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: ReportDefinitionStatus;
  readonly templateId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ReportTemplateFormat =
  | "tabular"
  | "layout"
  | "dashboard_bound"
  | "other";

export type ReportTemplate = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly format: ReportTemplateFormat;
  /** Opaque template body / settings template ref — not rendered here */
  readonly bodyRef: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ReportExecutionStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type ReportExecution = {
  readonly id: string;
  readonly companyId: string | null;
  readonly reportDefinitionId: string;
  readonly status: ReportExecutionStatus;
  readonly requestedByUserId: string | null;
  readonly snapshotId: string | null;
  readonly exportRequestId: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly errorCode: string | null;
  readonly createdAt: string;
};

export type ReportSchedule = {
  readonly id: string;
  readonly companyId: string | null;
  readonly reportDefinitionId: string;
  readonly cronExpression: string | null;
  readonly timezone: string | null;
  readonly active: boolean;
  readonly nextRunAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DashboardDefinition = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly status: ReportDefinitionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DashboardWidgetKind =
  | "metric"
  | "table"
  | "chart_ref"
  | "text"
  | "other";

export type DashboardWidget = {
  readonly id: string;
  readonly dashboardId: string;
  readonly companyId: string | null;
  readonly kind: DashboardWidgetKind;
  readonly title: string;
  readonly reportDefinitionId: string | null;
  readonly layoutRef: string | null;
  readonly sortOrder: number;
};

export type Snapshot = {
  readonly id: string;
  readonly companyId: string | null;
  readonly reportDefinitionId: string;
  readonly executionId: string | null;
  readonly capturedAt: string;
  /** Opaque payload / storage ref — not generated here */
  readonly payloadRef: string | null;
};

export type ExportFormat = "pdf" | "xlsx" | "csv" | "json" | "other";

export type ExportRequestStatus =
  | "queued"
  | "processing"
  | "ready"
  | "failed"
  | "expired";

export type ExportRequest = {
  readonly id: string;
  readonly companyId: string | null;
  readonly reportDefinitionId: string;
  readonly executionId: string | null;
  readonly format: ExportFormat;
  readonly status: ExportRequestStatus;
  readonly requestedByUserId: string | null;
  readonly outputRef: string | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
};
