/**
 * Search application queries — no transport DTOs.
 *
 * Note: this payload is deliberately named `SearchQueryPayload` to avoid
 * colliding with the `SearchQuery` repository query type from `@afh/search`.
 */

import type { SearchFilters, SearchResult, SearchSort } from "@afh/search";
import type { PageRequest } from "@afh/shared-kernel";

export type SearchQueryPayload = {
  readonly companyId: string;
  readonly indexCode: string;
  readonly queryText?: string | null;
  readonly filters?: SearchFilters;
  readonly sort?: readonly SearchSort[];
  readonly page?: PageRequest;
  readonly facetFields?: readonly string[];
};

export type SearchQueryResult = SearchResult;
