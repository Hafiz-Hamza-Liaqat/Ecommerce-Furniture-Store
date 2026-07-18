import type { CommandHandler, QueryHandler } from "@afh/application";
import type {
  SearchDocument,
  SearchFilter,
  SearchQuery as SearchDomainQuery,
} from "@afh/search";
import { ValidationError, fail, ok } from "@afh/shared-kernel";
import {
  SearchCommandTypes,
  SearchPolicyActions,
  SearchQueryTypes,
} from "../constants.js";
import type { IndexSearchDocumentPayload } from "../commands/commands.js";
import type { SearchQueryPayload, SearchQueryResult } from "../queries/queries.js";
import {
  indexSearchDocumentCommandValidator,
  isAllowedSearchIndexCode,
  searchQueryValidator,
} from "../validators/validators.js";
import type { SearchHandlerDeps } from "./deps.js";
import {
  companyResource,
  newEntityId,
  recordSearchAudit,
  requireCompanyId,
} from "../support/support.js";

export type IndexSearchDocumentResult = {
  readonly documentId: string;
};

function rejectDisallowedIndexCode(indexCode: string) {
  return fail(
    new ValidationError("indexCode is not in the allowed search index list", {
      code: "index_code_not_allowed",
      details: { indexCode },
    }),
  );
}

export function createIndexSearchDocumentHandler(
  deps: SearchHandlerDeps,
): CommandHandler<IndexSearchDocumentPayload, IndexSearchDocumentResult> {
  return {
    commandType: SearchCommandTypes.IndexSearchDocument,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "search_document",
        SearchPolicyActions.DocumentIndex,
        p.companyId,
        null,
        { attributes: { indexCode: p.indexCode } },
      );
    },
    validate() {
      return indexSearchDocumentCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      if (!isAllowedSearchIndexCode(p.indexCode)) {
        return rejectDisallowedIndexCode(p.indexCode);
      }

      const id = p.documentId ?? newEntityId();
      const now = ctx.clock.now().toISOString();

      const document: SearchDocument = {
        id,
        indexCode: p.indexCode,
        companyId: scope.value,
        entityType: p.entityType,
        entityId: p.entityId,
        fields: p.fields,
        indexedAt: now,
      };

      const saved = await deps.documents.save(document);
      if (!saved.ok) return saved;

      await recordSearchAudit(deps.audit, ctx, {
        action: SearchPolicyActions.DocumentIndex,
        entityType: "search_document",
        entityId: id,
        outcome: "success",
        details: { indexCode: p.indexCode },
      });

      return ok({ documentId: id });
    },
  };
}

export function createSearchQueryHandler(
  deps: SearchHandlerDeps,
): QueryHandler<SearchQueryPayload, SearchQueryResult> {
  return {
    queryType: SearchQueryTypes.SearchQuery,
    authorize(query) {
      const p = query.payload;
      return companyResource(
        "search_document",
        SearchPolicyActions.QueryExecute,
        p.companyId,
        null,
        { attributes: { indexCode: p.indexCode } },
      );
    },
    validate() {
      return searchQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const p = query.payload;
      if (!isAllowedSearchIndexCode(p.indexCode)) {
        return rejectDisallowedIndexCode(p.indexCode);
      }

      /** Company isolation is enforced at the repository layer via this filter. */
      const companyFilter: SearchFilter = {
        field: "companyId",
        op: "eq",
        value: scope.value,
      };

      const domainQuery: SearchDomainQuery = {
        indexCode: p.indexCode,
        queryText: p.queryText ?? null,
        filters: { filters: [companyFilter, ...(p.filters?.filters ?? [])] },
        sort: p.sort ?? [],
        ...(p.page !== undefined ? { page: p.page } : {}),
        ...(p.facetFields !== undefined ? { facetFields: p.facetFields } : {}),
      };

      const result = await deps.search.search(domainQuery);
      if (!result.ok) return result;

      await recordSearchAudit(deps.audit, ctx, {
        action: SearchPolicyActions.QueryExecute,
        entityType: "search_document",
        entityId: null,
        outcome: "success",
        details: { indexCode: p.indexCode, total: result.value.total },
      });

      return ok(result.value);
    },
  };
}
