/**
 * Document persistence helper — maps domain entities to aggregate_documents.
 * No business transformation.
 */

import {
  ConflictError,
  fail,
  isOffsetPagination,
  ok,
  type Clock,
  type Page,
  type PageRequest,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import {
  assertExpectedVersion,
  nextVersion,
} from "@afh/persistence";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";

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

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

function pageBounds(page?: PageRequest): { limit: number; offset: number; page: number; pageSize: number } {
  if (page && isOffsetPagination(page)) {
    const pageSize = Math.max(1, page.pageSize);
    const pageNum = Math.max(1, page.page);
    return {
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      page: pageNum,
      pageSize,
    };
  }
  return { limit: 100, offset: 0, page: 1, pageSize: 100 };
}

export class SqlDocumentRepository<
  T extends { readonly id: string; readonly companyId: string },
> {
  constructor(
    private readonly client: SqliteDatabaseClient,
    private readonly aggregateType: string,
    private readonly clock: Clock,
  ) {}

  documentId(companyId: string, id: string): string {
    return `${this.aggregateType}:${companyId}:${id}`;
  }

  async findById(
    key: CompanyScopedId,
  ): Promise<Result<T | null, PlatformError>> {
    const row = this.client.get<AggRow>(
      "SELECT * FROM aggregate_documents WHERE id = ?",
      [this.documentId(key.companyId, key.id)],
    );
    if (!row) return ok(null);
    return ok(JSON.parse(row.payload_json) as T);
  }

  async save(entity: T, parentId: string | null = null): Promise<Result<void, PlatformError>> {
    const docId = this.documentId(entity.companyId, entity.id);
    const existing = this.client.get<AggRow>(
      "SELECT * FROM aggregate_documents WHERE id = ?",
      [docId],
    );
    const expected = existing?.version ?? 0;
    const versionCheck = assertExpectedVersion(
      existing?.version ?? null,
      expected,
      docId,
    );
    if (!versionCheck.ok) return versionCheck;

    const now = this.clock.now().toISOString();
    const nextVer = nextVersion(expected);
    const payload = JSON.stringify(entity);

    if (existing) {
      this.client.run(
        `UPDATE aggregate_documents
         SET payload_json = ?, version = ?, parent_id = ?, updated_at = ?
         WHERE id = ? AND version = ?`,
        [payload, nextVer, parentId, now, docId, expected],
      );
    } else {
      this.client.run(
        `INSERT INTO aggregate_documents
          (id, company_id, aggregate_type, parent_id, version, payload_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          docId,
          entity.companyId,
          this.aggregateType,
          parentId,
          nextVer,
          payload,
          now,
          now,
        ],
      );
    }
    return ok(undefined);
  }

  async remove(key: CompanyScopedId): Promise<Result<void, PlatformError>> {
    this.client.run("DELETE FROM aggregate_documents WHERE id = ?", [
      this.documentId(key.companyId, key.id),
    ]);
    return ok(undefined);
  }

  async listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<T>, PlatformError>> {
    const bounds = pageBounds(page);
    const total = this.client.get<{ c: number }>(
      `SELECT COUNT(1) AS c FROM aggregate_documents
       WHERE company_id = ? AND aggregate_type = ?`,
      [companyId, this.aggregateType],
    );
    const rows = this.client.all<AggRow>(
      `SELECT * FROM aggregate_documents
       WHERE company_id = ? AND aggregate_type = ?
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      [companyId, this.aggregateType, bounds.limit, bounds.offset],
    );
    const items = rows.map((r) => JSON.parse(r.payload_json) as T);
    return ok({
      items,
      totalCount: total?.c ?? items.length,
      page: bounds.page,
      pageSize: bounds.pageSize,
      nextCursor: null,
      hasMore: (total?.c ?? 0) > bounds.offset + items.length,
    });
  }

  async listByParent(
    companyId: string,
    parentId: string,
  ): Promise<Result<readonly T[], PlatformError>> {
    const rows = this.client.all<AggRow>(
      `SELECT * FROM aggregate_documents
       WHERE company_id = ? AND aggregate_type = ? AND parent_id = ?
       ORDER BY created_at ASC`,
      [companyId, this.aggregateType, parentId],
    );
    return ok(rows.map((r) => JSON.parse(r.payload_json) as T));
  }

  async listByParentScoped(
    companyId: string,
    parentId: string,
    page?: PageRequest,
  ): Promise<Result<Page<T>, PlatformError>> {
    const bounds = pageBounds(page);
    const total = this.client.get<{ c: number }>(
      `SELECT COUNT(1) AS c FROM aggregate_documents
       WHERE company_id = ? AND aggregate_type = ? AND parent_id = ?`,
      [companyId, this.aggregateType, parentId],
    );
    const rows = this.client.all<AggRow>(
      `SELECT * FROM aggregate_documents
       WHERE company_id = ? AND aggregate_type = ? AND parent_id = ?
       ORDER BY created_at ASC
       LIMIT ? OFFSET ?`,
      [
        companyId,
        this.aggregateType,
        parentId,
        bounds.limit,
        bounds.offset,
      ],
    );
    const items = rows.map((r) => JSON.parse(r.payload_json) as T);
    return ok({
      items,
      totalCount: total?.c ?? items.length,
      page: bounds.page,
      pageSize: bounds.pageSize,
      nextCursor: null,
      hasMore: (total?.c ?? 0) > bounds.offset + items.length,
    });
  }
}

/** For CMS entities where companyId may be null */
export class SqlNullableCompanyDocumentRepository<
  T extends { readonly id: string; readonly companyId: string | null },
> {
  constructor(
    private readonly client: SqliteDatabaseClient,
    private readonly aggregateType: string,
    private readonly clock: Clock,
  ) {}

  documentId(companyId: string | null, id: string): string {
    return `${this.aggregateType}:${companyId ?? "_"}:${id}`;
  }

  async findById(
    companyId: string | null,
    id: string,
  ): Promise<Result<T | null, PlatformError>> {
    const row = this.client.get<AggRow>(
      "SELECT * FROM aggregate_documents WHERE id = ?",
      [this.documentId(companyId, id)],
    );
    if (!row) return ok(null);
    return ok(JSON.parse(row.payload_json) as T);
  }

  async findBySlug(
    companyId: string | null,
    slug: string,
  ): Promise<Result<T | null, PlatformError>> {
    const rows = this.client.all<AggRow>(
      `SELECT * FROM aggregate_documents WHERE aggregate_type = ? AND company_id IS ?`,
      [this.aggregateType, companyId],
    );
    for (const row of rows) {
      const entity = JSON.parse(row.payload_json) as T & { slug?: string };
      if (entity.slug === slug) return ok(entity);
    }
    return ok(null);
  }

  async save(entity: T): Promise<Result<void, PlatformError>> {
    const docId = this.documentId(entity.companyId, entity.id);
    const existing = this.client.get<AggRow>(
      "SELECT * FROM aggregate_documents WHERE id = ?",
      [docId],
    );
    const expected = existing?.version ?? 0;
    const versionCheck = assertExpectedVersion(
      existing?.version ?? null,
      expected,
      docId,
    );
    if (!versionCheck.ok) return versionCheck;
    const now = this.clock.now().toISOString();
    const nextVer = nextVersion(expected);
    const payload = JSON.stringify(entity);
    if (existing) {
      this.client.run(
        `UPDATE aggregate_documents SET payload_json = ?, version = ?, updated_at = ?
         WHERE id = ? AND version = ?`,
        [payload, nextVer, now, docId, expected],
      );
    } else {
      this.client.run(
        `INSERT INTO aggregate_documents
          (id, company_id, aggregate_type, parent_id, version, payload_json, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
        [
          docId,
          entity.companyId,
          this.aggregateType,
          nextVer,
          payload,
          now,
          now,
        ],
      );
    }
    return ok(undefined);
  }

  async listByCompany(
    companyId: string | null,
    page?: PageRequest,
  ): Promise<Result<Page<T>, PlatformError>> {
    const bounds = pageBounds(page);
    const rows = this.client.all<AggRow>(
      `SELECT * FROM aggregate_documents
       WHERE aggregate_type = ? AND company_id IS ?
       ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [this.aggregateType, companyId, bounds.limit, bounds.offset],
    );
    const items = rows.map((r) => JSON.parse(r.payload_json) as T);
    return ok({
      items,
      totalCount: items.length,
      page: bounds.page,
      pageSize: bounds.pageSize,
      nextCursor: null,
      hasMore: items.length === bounds.limit,
    });
  }
}

export function notImplemented(
  method: string,
): Result<never, PlatformError> {
  return fail(
    new ConflictError(`SQL adapter method not wired: ${method}`, {
      code: "sql_adapter_incomplete",
    }),
  );
}
