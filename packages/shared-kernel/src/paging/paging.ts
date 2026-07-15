/**
 * Reusable paging and query contracts — no business filters.
 */

export type SortDirection = "asc" | "desc";

export type SortField = {
  readonly field: string;
  readonly direction: SortDirection;
};

export type OffsetPagination = {
  readonly page: number;
  readonly pageSize: number;
};

export type CursorPagination = {
  readonly cursor: string | null;
  readonly limit: number;
};

export type PageRequest = OffsetPagination | CursorPagination;

export function isOffsetPagination(
  request: PageRequest,
): request is OffsetPagination {
  return "page" in request && "pageSize" in request;
}

export function isCursorPagination(
  request: PageRequest,
): request is CursorPagination {
  return "limit" in request && "cursor" in request;
}

/**
 * Generic filter operator set — domains map field names; operators stay generic.
 */
export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "is_null"
  | "is_not_null";

export type FilterCriterion = {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value?: unknown;
};

export type QueryCriteria = {
  readonly filters?: readonly FilterCriterion[];
  readonly sort?: readonly SortField[];
  readonly page?: PageRequest;
};

export type Page<T> = {
  readonly items: readonly T[];
  readonly totalCount: number | null;
  readonly page: number | null;
  readonly pageSize: number | null;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
};

export function emptyPage<T>(): Page<T> {
  return {
    items: [],
    totalCount: 0,
    page: null,
    pageSize: null,
    nextCursor: null,
    hasMore: false,
  };
}
