/**
 * SQL adapters for Search domain repositories.
 * SearchRepository.search is a stub until the search engine is wired.
 */

import {
  assertExpectedVersion,
  nextVersion,
} from "@afh/persistence";
import {
  isOffsetPagination,
  ok,
  type Clock,
  type Page,
  type PageRequest,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type {
  SearchDocument,
  SearchDocumentRepository,
  SearchIndexDefinition,
  SearchIndexDefinitionRepository,
  SearchQuery,
  SearchRepository,
  SearchResult,
} from "@afh/search";
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

function pageBounds(page?: PageRequest): {
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
} {
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

export function createSqlSearchIndexDefinitionRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SearchIndexDefinitionRepository {
  const docs =
    new SqlNullableCompanyDocumentRepository<SearchIndexDefinition>(
      client,
      "search.index_definition",
      clock,
    );
  const aggregateType = "search.index_definition";
  return {
    findByCode: async (code) => {
      const rows = client.all<AggRow>(
        `SELECT * FROM aggregate_documents WHERE aggregate_type = ?`,
        [aggregateType],
      );
      for (const row of rows) {
        const entity = JSON.parse(row.payload_json) as SearchIndexDefinition;
        if (entity.code === code) return ok(entity);
      }
      return ok(null);
    },
    save: (definition) => docs.save(definition),
    list: async (
      page?,
    ): Promise<Result<Page<SearchIndexDefinition>, PlatformError>> => {
      const bounds = pageBounds(page);
      const rows = client.all<AggRow>(
        `SELECT * FROM aggregate_documents
         WHERE aggregate_type = ?
         ORDER BY updated_at DESC
         LIMIT ? OFFSET ?`,
        [aggregateType, bounds.limit, bounds.offset],
      );
      const items = rows.map(
        (r) => JSON.parse(r.payload_json) as SearchIndexDefinition,
      );
      return ok({
        items,
        totalCount: items.length,
        page: bounds.page,
        pageSize: bounds.pageSize,
        nextCursor: null,
        hasMore: items.length === bounds.limit,
      });
    },
  };
}

export function createSqlSearchDocumentRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SearchDocumentRepository {
  const aggregateType = "search.document";
  const documentId = (indexCode: string, id: string) =>
    `${aggregateType}:${indexCode}:${id}`;

  return {
    findById: async (indexCode, id) => {
      const row = client.get<AggRow>(
        "SELECT * FROM aggregate_documents WHERE id = ?",
        [documentId(indexCode, id)],
      );
      if (!row) return ok(null);
      return ok(JSON.parse(row.payload_json) as SearchDocument);
    },
    save: async (document) => {
      const docId = documentId(document.indexCode, document.id);
      const existing = client.get<AggRow>(
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
      const now = clock.now().toISOString();
      const nextVer = nextVersion(expected);
      const payload = JSON.stringify(document);
      if (existing) {
        client.run(
          `UPDATE aggregate_documents
           SET payload_json = ?, version = ?, updated_at = ?
           WHERE id = ? AND version = ?`,
          [payload, nextVer, now, docId, expected],
        );
      } else {
        client.run(
          `INSERT INTO aggregate_documents
            (id, company_id, aggregate_type, parent_id, version, payload_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            docId,
            document.companyId,
            aggregateType,
            document.indexCode,
            nextVer,
            payload,
            now,
            now,
          ],
        );
      }
      return ok(undefined);
    },
    remove: async (indexCode, id) => {
      client.run("DELETE FROM aggregate_documents WHERE id = ?", [
        documentId(indexCode, id),
      ]);
      return ok(undefined);
    },
  };
}

export function createSqlSearchRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SearchRepository {
  void client;
  void clock;
  return {
    search: async (
      query: SearchQuery,
    ): Promise<Result<SearchResult, PlatformError>> =>
      ok({
        indexCode: query.indexCode,
        total: 0,
        hits: [],
        facets: [],
        tookMs: null,
      }),
  };
}
