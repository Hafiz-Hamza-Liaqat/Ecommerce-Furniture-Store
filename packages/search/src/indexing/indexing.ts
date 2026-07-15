/**
 * Search indexing contracts — no engine.
 */

import type { Result, PlatformError } from "@afh/shared-kernel";
import type {
  SearchDocument,
  SearchIndexBatchResult,
  SearchIndexRequest,
} from "../models/models.js";

export interface SearchIndexingContract {
  index(
    request: SearchIndexRequest,
  ): Promise<Result<SearchIndexBatchResult, PlatformError>>;
  remove(
    indexCode: string,
    documentIds: readonly string[],
  ): Promise<Result<void, PlatformError>>;
  getDocument(
    indexCode: string,
    documentId: string,
  ): Promise<Result<SearchDocument | null, PlatformError>>;
}
