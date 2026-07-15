/**
 * SQL adapters for Reporting domain repositories.
 */

import { ok, type Clock } from "@afh/shared-kernel";
import type {
  DashboardDefinition,
  DashboardRepository,
  DashboardWidget,
  ExportRequest,
  ExportRequestRepository,
  ReportDefinition,
  ReportDefinitionRepository,
  ReportExecution,
  ReportExecutionRepository,
  ReportSchedule,
  ReportScheduleRepository,
  ReportTemplate,
  ReportTemplateRepository,
  Snapshot,
  SnapshotRepository,
} from "@afh/reporting";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlNullableCompanyDocumentRepository } from "../mapping/document-repository.js";

type AggRow = {
  id: string;
  company_id: string | null;
  aggregate_type: string;
  parent_id: string | null;
  version: number;
  payload_json: string;
  created_at: string;
  updated_at: string;
};

export function createSqlReportDefinitionRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ReportDefinitionRepository {
  const docs = new SqlNullableCompanyDocumentRepository<ReportDefinition>(
    client,
    "reporting.report_definition",
    clock,
  );
  return {
    findById: (key) => docs.findById(key.companyId, key.id),
    save: (definition) => docs.save(definition),
    list: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlReportTemplateRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ReportTemplateRepository {
  const docs = new SqlNullableCompanyDocumentRepository<ReportTemplate>(
    client,
    "reporting.report_template",
    clock,
  );
  return {
    findById: (key) => docs.findById(key.companyId, key.id),
    save: (template) => docs.save(template),
  };
}

export function createSqlReportExecutionRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ReportExecutionRepository {
  const docs = new SqlNullableCompanyDocumentRepository<ReportExecution>(
    client,
    "reporting.report_execution",
    clock,
  );
  const aggregateType = "reporting.report_execution";
  return {
    findById: (key) => docs.findById(key.companyId, key.id),
    save: async (execution) => {
      const docId = `${aggregateType}:${execution.companyId ?? "_"}:${execution.id}`;
      const existing = client.get<AggRow>(
        "SELECT * FROM aggregate_documents WHERE id = ?",
        [docId],
      );
      const now = clock.now().toISOString();
      const payload = JSON.stringify(execution);
      if (existing) {
        client.run(
          `UPDATE aggregate_documents
           SET payload_json = ?, parent_id = ?, updated_at = ?, version = version + 1
           WHERE id = ?`,
          [payload, execution.reportDefinitionId, now, docId],
        );
      } else {
        client.run(
          `INSERT INTO aggregate_documents
            (id, company_id, aggregate_type, parent_id, version, payload_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
          [
            docId,
            execution.companyId,
            aggregateType,
            execution.reportDefinitionId,
            payload,
            now,
            now,
          ],
        );
      }
      return ok(undefined);
    },
    listByDefinition: async (companyId, reportDefinitionId, page) => {
      const listed = await docs.listByCompany(companyId, page);
      if (!listed.ok) return listed;
      const filtered = listed.value.items.filter(
        (e) => e.reportDefinitionId === reportDefinitionId,
      );
      return ok({
        ...listed.value,
        items: filtered,
        totalCount: filtered.length,
      });
    },
  };
}

export function createSqlReportScheduleRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ReportScheduleRepository {
  const docs = new SqlNullableCompanyDocumentRepository<ReportSchedule>(
    client,
    "reporting.report_schedule",
    clock,
  );
  return {
    findById: (key) => docs.findById(key.companyId, key.id),
    save: (schedule) => docs.save(schedule),
  };
}

export function createSqlDashboardRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): DashboardRepository {
  const dashboards =
    new SqlNullableCompanyDocumentRepository<DashboardDefinition>(
      client,
      "reporting.dashboard",
      clock,
    );
  const widgetAgg = "reporting.dashboard_widget";
  return {
    findById: (key) => dashboards.findById(key.companyId, key.id),
    save: (dashboard) => dashboards.save(dashboard),
    saveWidget: async (widget) => {
      const docId = `${widgetAgg}:${widget.companyId ?? "_"}:${widget.id}`;
      const existing = client.get<AggRow>(
        "SELECT * FROM aggregate_documents WHERE id = ?",
        [docId],
      );
      const now = clock.now().toISOString();
      const payload = JSON.stringify(widget);
      if (existing) {
        client.run(
          `UPDATE aggregate_documents
           SET payload_json = ?, parent_id = ?, updated_at = ?, version = version + 1
           WHERE id = ?`,
          [payload, widget.dashboardId, now, docId],
        );
      } else {
        client.run(
          `INSERT INTO aggregate_documents
            (id, company_id, aggregate_type, parent_id, version, payload_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
          [
            docId,
            widget.companyId,
            widgetAgg,
            widget.dashboardId,
            payload,
            now,
            now,
          ],
        );
      }
      return ok(undefined);
    },
    listWidgets: async (companyId, dashboardId) => {
      const rows = client.all<AggRow>(
        `SELECT * FROM aggregate_documents
         WHERE aggregate_type = ? AND company_id IS ? AND parent_id = ?
         ORDER BY created_at ASC`,
        [widgetAgg, companyId, dashboardId],
      );
      return ok(rows.map((r) => JSON.parse(r.payload_json) as DashboardWidget));
    },
  };
}

export function createSqlSnapshotRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SnapshotRepository {
  const docs = new SqlNullableCompanyDocumentRepository<Snapshot>(
    client,
    "reporting.snapshot",
    clock,
  );
  return {
    findById: (key) => docs.findById(key.companyId, key.id),
    save: (snapshot) => docs.save(snapshot),
  };
}

export function createSqlExportRequestRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ExportRequestRepository {
  const docs = new SqlNullableCompanyDocumentRepository<ExportRequest>(
    client,
    "reporting.export_request",
    clock,
  );
  return {
    findById: (key) => docs.findById(key.companyId, key.id),
    save: (request) => docs.save(request),
  };
}
