/**
 * Reporting repository interfaces only.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type {
  DashboardDefinition,
  DashboardWidget,
  ExportRequest,
  ReportDefinition,
  ReportExecution,
  ReportSchedule,
  ReportTemplate,
  Snapshot,
} from "../models/models.js";

export type CompanyScopedId = {
  readonly companyId: string | null;
  readonly id: string;
};

export interface ReportDefinitionRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<ReportDefinition | null, PlatformError>>;
  save(definition: ReportDefinition): Promise<Result<void, PlatformError>>;
  list(
    companyId: string | null,
    page?: PageRequest,
  ): Promise<Result<Page<ReportDefinition>, PlatformError>>;
}

export interface ReportTemplateRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<ReportTemplate | null, PlatformError>>;
  save(template: ReportTemplate): Promise<Result<void, PlatformError>>;
}

export interface ReportExecutionRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<ReportExecution | null, PlatformError>>;
  save(execution: ReportExecution): Promise<Result<void, PlatformError>>;
  listByDefinition(
    companyId: string | null,
    reportDefinitionId: string,
    page?: PageRequest,
  ): Promise<Result<Page<ReportExecution>, PlatformError>>;
}

export interface ReportScheduleRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<ReportSchedule | null, PlatformError>>;
  save(schedule: ReportSchedule): Promise<Result<void, PlatformError>>;
}

export interface DashboardRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<DashboardDefinition | null, PlatformError>>;
  save(dashboard: DashboardDefinition): Promise<Result<void, PlatformError>>;
  saveWidget(widget: DashboardWidget): Promise<Result<void, PlatformError>>;
  listWidgets(
    companyId: string | null,
    dashboardId: string,
  ): Promise<Result<readonly DashboardWidget[], PlatformError>>;
}

export interface SnapshotRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Snapshot | null, PlatformError>>;
  save(snapshot: Snapshot): Promise<Result<void, PlatformError>>;
}

export interface ExportRequestRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<ExportRequest | null, PlatformError>>;
  save(request: ExportRequest): Promise<Result<void, PlatformError>>;
}

/** Aggregate alias matching deliverable naming */
export type ReportRepository = ReportDefinitionRepository;
