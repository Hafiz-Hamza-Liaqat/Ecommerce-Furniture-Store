/**
 * RC7.2f — Projects List* candidate preparation (domain filter/sort/search).
 * Policy paging and authorized totals remain in buildAuthorizedListPage (RC7.1 / D56).
 *
 * Repositories return only bounded company-scoped candidate batches.
 * This module never authorizes rows or computes Page.totalCount.
 */

import {
  LIST_CANDIDATE_BATCH_SIZE,
  LIST_MAX_CANDIDATE_SCAN,
  type FetchListCandidates,
} from "@afh/application";
import {
  AuthorizationError,
  fail,
  ok,
  type FilterCriterion,
  type ListQueryRequest,
  type Page,
  type PageRequest,
  type PlatformError,
  type Result,
  type SortField,
} from "@afh/shared-kernel";

type ListByCompany<T> = (
  companyId: string,
  page?: PageRequest,
) => Promise<Result<Page<T>, PlatformError>>;

function fieldValue(record: object, field: string): unknown {
  return (record as Record<string, unknown>)[field];
}

function compareOrdered(a: unknown, b: unknown): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b);
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  return null;
}

function matchesCriterion(
  record: object,
  criterion: FilterCriterion,
): boolean {
  const raw = fieldValue(record, criterion.field);
  const value = criterion.value;
  switch (criterion.operator) {
    case "eq":
      return raw === value;
    case "neq":
      return raw !== value;
    case "gt": {
      const cmp = compareOrdered(raw, value);
      return cmp !== null && cmp > 0;
    }
    case "gte": {
      const cmp = compareOrdered(raw, value);
      return cmp !== null && cmp >= 0;
    }
    case "lt": {
      const cmp = compareOrdered(raw, value);
      return cmp !== null && cmp < 0;
    }
    case "lte": {
      const cmp = compareOrdered(raw, value);
      return cmp !== null && cmp <= 0;
    }
    case "in":
      return Array.isArray(value) && value.includes(raw);
    case "nin":
      return Array.isArray(value) && !value.includes(raw);
    case "contains":
      return (
        typeof raw === "string" &&
        typeof value === "string" &&
        raw.toLowerCase().includes(value.toLowerCase())
      );
    case "starts_with":
      return (
        typeof raw === "string" &&
        typeof value === "string" &&
        raw.toLowerCase().startsWith(value.toLowerCase())
      );
    case "ends_with":
      return (
        typeof raw === "string" &&
        typeof value === "string" &&
        raw.toLowerCase().endsWith(value.toLowerCase())
      );
    case "is_null":
      return raw == null;
    case "is_not_null":
      return raw != null;
    default:
      return false;
  }
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function applySort<T extends object>(
  items: readonly T[],
  sort: readonly SortField[] | undefined,
): T[] {
  if (sort === undefined || sort.length === 0) {
    return [...items];
  }
  const ordered = [...items];
  ordered.sort((left, right) => {
    for (const entry of sort) {
      const cmp = compareValues(
        fieldValue(left, entry.field),
        fieldValue(right, entry.field),
      );
      if (cmp !== 0) {
        return entry.direction === "desc" ? -cmp : cmp;
      }
    }
    return 0;
  });
  return ordered;
}

function applyFilters<T extends object>(
  items: readonly T[],
  filters: readonly FilterCriterion[] | undefined,
): T[] {
  if (filters === undefined || filters.length === 0) {
    return [...items];
  }
  return items.filter((item) =>
    filters.every((criterion) => matchesCriterion(item, criterion)),
  );
}

function applySearch<T extends object>(
  items: readonly T[],
  q: string | undefined,
  searchFields: readonly string[],
): T[] {
  if (q === undefined || q.trim() === "") {
    return [...items];
  }
  const needle = q.trim().toLowerCase();
  return items.filter((item) =>
    searchFields.some((field) => {
      const raw = fieldValue(item, field);
      return typeof raw === "string" && raw.toLowerCase().includes(needle);
    }),
  );
}

export function applyProjectsListDomainCriteria<T extends object>(
  items: readonly T[],
  request: ListQueryRequest,
  searchFields: readonly string[],
): T[] {
  const filtered = applyFilters(items, request.criteria?.filters);
  const searched = applySearch(filtered, request.q, searchFields);
  return applySort(searched, request.criteria?.sort);
}

/**
 * Load company-scoped repository pages, apply domain criteria once, then
 * serve offset slices to buildAuthorizedListPage (Policy + authorized paging).
 * Scan remains bounded — never an unbounded repository walk.
 */
export function createProjectsListCandidateFetcher<T extends object>(args: {
  readonly listByCompany: ListByCompany<T>;
  readonly request: ListQueryRequest;
  readonly searchFields: readonly string[];
  readonly maxCandidateScan?: number;
}): FetchListCandidates<T> {
  let prepared: T[] | null = null;
  const maxScan = args.maxCandidateScan ?? LIST_MAX_CANDIDATE_SCAN;

  return async ({ companyId, offset, limit }) => {
    if (prepared === null) {
      const all: T[] = [];
      let page = 1;
      const pageSize = LIST_CANDIDATE_BATCH_SIZE;

      for (;;) {
        if (all.length >= maxScan) {
          return fail(
            new AuthorizationError(
              "List candidate scan exceeded safety ceiling; refusing partial authorized total",
              {
                code: "list_scan_ceiling",
                details: { maxCandidateScan: maxScan, scanned: all.length },
              },
            ),
          );
        }

        const remaining = maxScan - all.length;
        const batchSize = Math.min(pageSize, remaining);
        const result = await args.listByCompany(companyId, {
          page,
          pageSize: batchSize,
        });
        if (!result.ok) {
          return result;
        }

        all.push(...result.value.items);
        if (
          result.value.items.length < batchSize ||
          result.value.hasMore === false
        ) {
          break;
        }
        page += 1;
      }

      prepared = applyProjectsListDomainCriteria(
        all,
        args.request,
        args.searchFields,
      );
    }

    return ok(prepared.slice(offset, offset + limit));
  };
}
