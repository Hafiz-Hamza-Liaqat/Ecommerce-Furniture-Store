/**
 * RC7.1 — Shared List* query contracts.
 *
 * Extends existing paging primitives. Does not introduce a parallel paging stack.
 * Authorized totalCount semantics are enforced in @afh/application (bounded scan).
 */

import { ValidationError } from "../errors/platform-error.js";
import type { PlatformError } from "../errors/platform-error.js";
import { fail, ok, type Result } from "../result/result.js";
import {
  isCursorPagination,
  isOffsetPagination,
  type FilterCriterion,
  type PageRequest,
  type QueryCriteria,
  type SortField,
} from "./paging.js";

/** Default and hard caps for List* pagination (aligns with existing ≤500 summary pages). */
export const LIST_DEFAULT_PAGE_SIZE = 50;
export const LIST_MAX_PAGE_SIZE = 500;

/**
 * Shared List* request envelope.
 * Modules pass field allow-lists into validators; repositories stay module-owned.
 */
export type ListQueryRequest = {
  readonly companyId: string;
  /** Optional free-text search; interpretation is module-owned. */
  readonly q?: string;
  readonly criteria?: QueryCriteria;
};

export type NormalizedOffsetPage = {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
};

/**
 * Normalize offset pagination from a List* request.
 * Cursor requests encode an opaque authorized-sequence offset.
 */
export function normalizeListOffsetPage(
  request: ListQueryRequest,
): Result<NormalizedOffsetPage, PlatformError> {
  const pageReq = request.criteria?.page;
  if (pageReq === undefined) {
    return ok({
      page: 1,
      pageSize: LIST_DEFAULT_PAGE_SIZE,
      offset: 0,
    });
  }
  if (isOffsetPagination(pageReq)) {
    if (!Number.isInteger(pageReq.page) || pageReq.page < 1) {
      return fail(
        new ValidationError("List page must be an integer >= 1", {
          code: "list_invalid_page",
          details: { page: pageReq.page },
        }),
      );
    }
    if (
      !Number.isInteger(pageReq.pageSize) ||
      pageReq.pageSize < 1 ||
      pageReq.pageSize > LIST_MAX_PAGE_SIZE
    ) {
      return fail(
        new ValidationError(
          `List pageSize must be an integer between 1 and ${LIST_MAX_PAGE_SIZE}`,
          {
            code: "list_invalid_page_size",
            details: { pageSize: pageReq.pageSize, max: LIST_MAX_PAGE_SIZE },
          },
        ),
      );
    }
    return ok({
      page: pageReq.page,
      pageSize: pageReq.pageSize,
      offset: (pageReq.page - 1) * pageReq.pageSize,
    });
  }
  if (isCursorPagination(pageReq)) {
    if (
      !Number.isInteger(pageReq.limit) ||
      pageReq.limit < 1 ||
      pageReq.limit > LIST_MAX_PAGE_SIZE
    ) {
      return fail(
        new ValidationError(
          `List cursor limit must be an integer between 1 and ${LIST_MAX_PAGE_SIZE}`,
          {
            code: "list_invalid_cursor_limit",
            details: { limit: pageReq.limit, max: LIST_MAX_PAGE_SIZE },
          },
        ),
      );
    }
    const offset = decodeAuthorizedCursor(pageReq.cursor);
    if (!offset.ok) {
      return offset;
    }
    return ok({
      page: Math.floor(offset.value / pageReq.limit) + 1,
      pageSize: pageReq.limit,
      offset: offset.value,
    });
  }
  return fail(
    new ValidationError("List page request is not a valid PageRequest", {
      code: "list_invalid_page_request",
    }),
  );
}

/** Opaque authorized-sequence cursor: decimal offset into authorized rows. */
export function encodeAuthorizedCursor(authorizedOffset: number): string {
  return String(Math.max(0, Math.floor(authorizedOffset)));
}

export function decodeAuthorizedCursor(
  cursor: string | null,
): Result<number, PlatformError> {
  if (cursor === null || cursor === "") {
    return ok(0);
  }
  if (!/^\d+$/.test(cursor)) {
    return fail(
      new ValidationError("List cursor must be a non-negative integer offset", {
        code: "list_invalid_cursor",
        details: { cursor },
      }),
    );
  }
  return ok(Number.parseInt(cursor, 10));
}

export function validateSortAllowList(
  sort: readonly SortField[] | undefined,
  allowedFields: ReadonlySet<string>,
): Result<void, PlatformError> {
  if (sort === undefined || sort.length === 0) {
    return ok(undefined);
  }
  for (const entry of sort) {
    if (!allowedFields.has(entry.field)) {
      return fail(
        new ValidationError("List sort field is not allowed", {
          code: "list_sort_field_not_allowed",
          details: { field: entry.field },
        }),
      );
    }
    if (entry.direction !== "asc" && entry.direction !== "desc") {
      return fail(
        new ValidationError("List sort direction must be asc or desc", {
          code: "list_invalid_sort_direction",
          details: { direction: entry.direction },
        }),
      );
    }
  }
  return ok(undefined);
}

export function validateFilterAllowList(
  filters: readonly FilterCriterion[] | undefined,
  allowedFields: ReadonlySet<string>,
): Result<void, PlatformError> {
  if (filters === undefined || filters.length === 0) {
    return ok(undefined);
  }
  for (const criterion of filters) {
    if (!allowedFields.has(criterion.field)) {
      return fail(
        new ValidationError("List filter field is not allowed", {
          code: "list_filter_field_not_allowed",
          details: { field: criterion.field },
        }),
      );
    }
  }
  return ok(undefined);
}

export function requireListCompanyId(
  companyId: string,
): Result<string, PlatformError> {
  if (typeof companyId !== "string" || companyId.trim() === "") {
    return fail(
      new ValidationError("List companyId is required", {
        code: "list_company_id_required",
      }),
    );
  }
  return ok(companyId);
}

export type { PageRequest, QueryCriteria, SortField, FilterCriterion };
