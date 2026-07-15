/**
 * Search foundation models — infrastructure-neutral.
 * No search engine, ranking, or query parser.
 */

export type SearchFieldType =
  | "text"
  | "keyword"
  | "number"
  | "boolean"
  | "date"
  | "geo"
  | "other";

export type SearchField = {
  readonly name: string;
  readonly fieldType: SearchFieldType;
  readonly searchable: boolean;
  readonly facetable: boolean;
  readonly sortable: boolean;
};

export type SearchIndexDefinition = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly fields: readonly SearchField[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SearchDocument = {
  readonly id: string;
  readonly indexCode: string;
  readonly companyId: string | null;
  readonly entityType: string;
  readonly entityId: string;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly indexedAt: string | null;
};

export type SearchFilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "contains"
  | "range";

export type SearchFilter = {
  readonly field: string;
  readonly op: SearchFilterOp;
  readonly value: unknown;
};

export type SearchFilters = {
  readonly filters: readonly SearchFilter[];
};

export type SearchSortDirection = "asc" | "desc";

export type SearchSort = {
  readonly field: string;
  readonly direction: SearchSortDirection;
};

export type SearchHighlight = {
  readonly field: string;
  readonly snippets: readonly string[];
};

export type SearchFacetBucket = {
  readonly value: string;
  readonly count: number;
};

export type SearchFacet = {
  readonly field: string;
  readonly buckets: readonly SearchFacetBucket[];
};

export type SearchHit = {
  readonly documentId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly score: number | null;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly highlights: readonly SearchHighlight[];
};

export type SearchResult = {
  readonly indexCode: string;
  readonly total: number;
  readonly hits: readonly SearchHit[];
  readonly facets: readonly SearchFacet[];
  readonly tookMs: number | null;
};

/** Indexing contract — no engine implementation */
export type SearchIndexRequest = {
  readonly indexCode: string;
  readonly documents: readonly SearchDocument[];
};

export type SearchIndexBatchResult = {
  readonly accepted: number;
  readonly rejected: number;
};
