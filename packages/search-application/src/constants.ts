/**
 * Search application constants.
 */

export const SearchCommandTypes = {
  IndexSearchDocument: "search.IndexSearchDocument",
} as const;

export const SearchQueryTypes = {
  SearchQuery: "search.SearchQuery",
} as const;

export const SearchPolicyActions = {
  DocumentIndex: "search.documents.index",
  QueryExecute: "search.query.execute",
} as const;

/** V1 bounded index allow-list — no ad-hoc index codes. */
export const ALLOWED_SEARCH_INDEX_CODES = new Set([
  "inventory.items",
  "crm.leads",
  "procurement.suppliers",
  "projects.projects",
]);
