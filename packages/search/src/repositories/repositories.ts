/**
 * Search repository interfaces only — no persistence / engine.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type {
  SearchDocument,
  SearchFilters,
  SearchIndexDefinition,
  SearchResult,
  SearchSort,
} from "../models/models.js";

export interface SearchIndexDefinitionRepository {
  findByCode(
    code: string,
  ): Promise<Result<SearchIndexDefinition | null, PlatformError>>;
  save(
    definition: SearchIndexDefinition,
  ): Promise<Result<void, PlatformError>>;
  list(
    page?: PageRequest,
  ): Promise<Result<Page<SearchIndexDefinition>, PlatformError>>;
}

export interface SearchDocumentRepository {
  findById(
    indexCode: string,
    documentId: string,
  ): Promise<Result<SearchDocument | null, PlatformError>>;
  save(document: SearchDocument): Promise<Result<void, PlatformError>>;
  remove(
    indexCode: string,
    documentId: string,
  ): Promise<Result<void, PlatformError>>;
}

export type SearchQuery = {
  readonly indexCode: string;
  readonly queryText: string | null;
  readonly filters: SearchFilters | null;
  readonly sort: readonly SearchSort[];
  readonly page?: PageRequest;
  readonly facetFields?: readonly string[];
};

export interface SearchRepository {
  search(query: SearchQuery): Promise<Result<SearchResult, PlatformError>>;
}
