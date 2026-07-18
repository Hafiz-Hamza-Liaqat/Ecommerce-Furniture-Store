/**
 * SQL BackgroundJob repository — document store, no new migration.
 * Structural mirror of @afh/application BackgroundJob to avoid package cycles.
 */

import type { Clock, PlatformError, Result } from "@afh/shared-kernel";
import { ok } from "@afh/shared-kernel";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlDocumentRepository } from "../mapping/document-repository.js";

export type SqlBackgroundJob = {
  readonly id: string;
  readonly companyId: string;
  readonly kind:
    | "bulk_import"
    | "bulk_export"
    | "bulk_update"
    | "report_run"
    | "search_reindex"
    | "other";
  readonly status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  readonly payload: Readonly<Record<string, unknown>>;
  readonly result: Readonly<Record<string, unknown>> | null;
  readonly errorCode: string | null;
  readonly requestedByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
};

export type SqlBackgroundJobRepository = {
  findById(key: {
    companyId: string;
    id: string;
  }): Promise<Result<SqlBackgroundJob | null, PlatformError>>;
  save(job: SqlBackgroundJob): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    limit?: number,
  ): Promise<Result<readonly SqlBackgroundJob[], PlatformError>>;
};

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

export function createSqlBackgroundJobRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SqlBackgroundJobRepository {
  const docs = new SqlDocumentRepository<SqlBackgroundJob>(
    client,
    "platform.background_job",
    clock,
  );
  const aggregateType = "platform.background_job";

  return {
    findById: (key) => docs.findById(key),
    save: (job) => docs.save(job),
    listByCompany: async (companyId, limit = 50) => {
      const rows = client.all<AggRow>(
        `SELECT * FROM aggregate_documents
         WHERE aggregate_type = ? AND company_id = ?
         ORDER BY updated_at DESC
         LIMIT ?`,
        [aggregateType, companyId, Math.max(1, limit)],
      );
      return ok(rows.map((r) => JSON.parse(r.payload_json) as SqlBackgroundJob));
    },
  };
}
