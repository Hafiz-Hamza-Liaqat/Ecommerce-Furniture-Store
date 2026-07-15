/**
 * SQL AggregateDocumentStore — optimistic concurrency + identity preservation.
 */

import {
  isFail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import {
  assertExpectedVersion,
  nextVersion,
  type AggregateDocumentStore,
  type AggregatePersistenceRecord,
  type DatabaseTransaction,
} from "@afh/persistence";
import {
  asSqlTx,
  type SqliteDatabaseClient,
} from "../database/sqlite-client.js";

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

function rowToRecord(row: AggRow): AggregatePersistenceRecord {
  const payload = JSON.parse(row.payload_json) as Record<string, unknown>;
  return {
    id: row.id,
    version: row.version,
    companyId: row.company_id,
    payload: {
      ...payload,
      __aggregateType: row.aggregate_type,
      __parentId: row.parent_id,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqlAggregateDocumentStore implements AggregateDocumentStore {
  constructor(private readonly client: SqliteDatabaseClient) {}

  async get(
    id: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<AggregatePersistenceRecord | null, PlatformError>> {
    asSqlTx(transaction);
    const row = this.client.get<AggRow>(
      "SELECT * FROM aggregate_documents WHERE id = ?",
      [id],
    );
    return ok(row ? rowToRecord(row) : null);
  }

  async save(
    record: AggregatePersistenceRecord,
    expectedVersion: number,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    asSqlTx(transaction);
    const currentResult = await this.get(record.id, transaction);
    if (isFail(currentResult)) return currentResult;

    const current = currentResult.value;
    const versionCheck = assertExpectedVersion(
      current?.version ?? null,
      expectedVersion,
      record.id,
    );
    if (isFail(versionCheck)) return versionCheck;

    const payload = { ...record.payload };
    const aggregateType =
      (payload.__aggregateType as string | undefined) ?? "aggregate";
    const parentId = (payload.__parentId as string | null | undefined) ?? null;
    delete payload.__aggregateType;
    delete payload.__parentId;

    const nextVer = nextVersion(expectedVersion);
    const updatedAt = record.updatedAt;
    const createdAt = current?.createdAt ?? record.createdAt;

    if (current) {
      this.client.run(
        `UPDATE aggregate_documents
         SET company_id = ?, aggregate_type = ?, parent_id = ?, version = ?,
             payload_json = ?, updated_at = ?
         WHERE id = ? AND version = ?`,
        [
          record.companyId,
          aggregateType,
          parentId,
          nextVer,
          JSON.stringify(payload),
          updatedAt,
          record.id,
          expectedVersion,
        ],
      );
    } else {
      this.client.run(
        `INSERT INTO aggregate_documents
          (id, company_id, aggregate_type, parent_id, version, payload_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.companyId,
          aggregateType,
          parentId,
          nextVer,
          JSON.stringify(payload),
          createdAt,
          updatedAt,
        ],
      );
    }
    return ok(undefined);
  }

  async remove(
    id: string,
    expectedVersion: number,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    asSqlTx(transaction);
    const currentResult = await this.get(id, transaction);
    if (isFail(currentResult)) return currentResult;
    const current = currentResult.value;
    if (!current) return ok(undefined);

    const versionCheck = assertExpectedVersion(
      current.version,
      expectedVersion,
      id,
    );
    if (isFail(versionCheck)) return versionCheck;

    this.client.run(
      "DELETE FROM aggregate_documents WHERE id = ? AND version = ?",
      [id, expectedVersion],
    );
    return ok(undefined);
  }
}
