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
  SearchFilter,
  SearchFilters,
  SearchHit,
  SearchIndexDefinition,
  SearchIndexDefinitionRepository,
  SearchQuery,
  SearchRepository,
  SearchResult,
  SearchSort,
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

/** Top-level document fields addressable by filters/sort, alongside `fields.*`. */
function resolveField(doc: SearchDocument, field: string): unknown {
  switch (field) {
    case "companyId":
      return doc.companyId;
    case "entityType":
      return doc.entityType;
    case "entityId":
      return doc.entityId;
    case "indexCode":
      return doc.indexCode;
    default:
      return doc.fields[field];
  }
}

function matchesOperator(actual: unknown, op: SearchFilter["op"], expected: unknown): boolean {
  switch (op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "contains":
      return (
        typeof actual === "string" &&
        typeof expected === "string" &&
        actual.toLowerCase().includes(expected.toLowerCase())
      );
    case "range": {
      if (!Array.isArray(expected) || expected.length !== 2 || typeof actual !== "number") {
        return false;
      }
      const [min, max] = expected as [unknown, unknown];
      const okMin = typeof min !== "number" || actual >= min;
      const okMax = typeof max !== "number" || actual <= max;
      return okMin && okMax;
    }
    default:
      return false;
  }
}

function matchesFilters(doc: SearchDocument, filters: SearchFilters | null): boolean {
  if (!filters || filters.filters.length === 0) return true;
  return filters.filters.every((filter) =>
    matchesOperator(resolveField(doc, filter.field), filter.op, filter.value),
  );
}

function matchesQueryText(doc: SearchDocument, queryText: string | null): boolean {
  if (queryText === null || queryText.trim() === "") return true;
  const needle = queryText.trim().toLowerCase();
  if (doc.entityId.toLowerCase().includes(needle)) return true;
  try {
    return JSON.stringify(doc.fields).toLowerCase().includes(needle);
  } catch {
    return false;
  }
}

function compareFieldValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function sortDocuments(
  docs: readonly SearchDocument[],
  sort: readonly SearchSort[],
): SearchDocument[] {
  if (sort.length === 0) return [...docs];
  return [...docs].sort((a, b) => {
    for (const entry of sort) {
      const cmp = compareFieldValues(resolveField(a, entry.field), resolveField(b, entry.field));
      if (cmp !== 0) return entry.direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

/**
 * Real (bounded) scan of `aggregate_documents` for `aggregate_type =
 * 'search.document'`. Documents are stored with `parent_id = indexCode`
 * (see `createSqlSearchDocumentRepository.save`), so the index is narrowed
 * at the SQL layer before in-process filter/queryText/sort/paging.
 */
export function createSqlSearchRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SearchRepository {
  void clock;
  return {
    search: async (
      query: SearchQuery,
    ): Promise<Result<SearchResult, PlatformError>> => {
      const rows = client.all<AggRow>(
        `SELECT * FROM aggregate_documents
         WHERE aggregate_type = 'search.document' AND parent_id = ?`,
        [query.indexCode],
      );
      const candidates = rows.map((row) => JSON.parse(row.payload_json) as SearchDocument);

      const matched = candidates.filter(
        (doc) =>
          matchesFilters(doc, query.filters) && matchesQueryText(doc, query.queryText),
      );
      const sorted = sortDocuments(matched, query.sort);

      const bounds = pageBounds(query.page);
      const page = sorted.slice(bounds.offset, bounds.offset + bounds.limit);

      const hits: SearchHit[] = page.map((doc) => ({
        documentId: doc.id,
        entityType: doc.entityType,
        entityId: doc.entityId,
        score: null,
        fields: doc.fields,
        highlights: [],
      }));

      return ok({
        indexCode: query.indexCode,
        total: sorted.length,
        hits,
        facets: [],
        tookMs: null,
      });
    },
  };
}
