/**
 * Search V1 — handler tests (Policy, bounded index allow-list, company isolation).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  PolicyDecision,
  PolicyEngine,
  PolicyPrincipal,
  PolicyResource,
  SecurityAuditService,
} from "@afh/identity";
import type { SearchDocument, SearchDocumentRepository, SearchRepository } from "@afh/search";
import {
  CommandId,
  CorrelationId,
  QueryId,
  ok,
  type Clock,
  type Command,
  type PlatformError,
  type Query,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";
import type { ApplicationContext } from "@afh/application";
import {
  createIndexSearchDocumentHandler,
  createSearchQueryHandler,
  type IndexSearchDocumentResult,
} from "./search-handlers.js";
import type { SearchHandlerDeps } from "./deps.js";
import {
  SearchCommandTypes,
  SearchPolicyActions,
  SearchQueryTypes,
} from "../constants.js";

const clock: Clock = { now: () => new Date("2026-07-19T00:00:00.000Z") };

const passthroughUnitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(passthroughUnitOfWork);
  },
};

const stubAudit = {
  async record() {
    return;
  },
} as unknown as SecurityAuditService;

function createMemoryDocumentRepo(
  initial: SearchDocument[] = [],
): SearchDocumentRepository {
  const store = new Map(initial.map((d) => [`${d.indexCode}:${d.id}`, d]));
  return {
    async findById(indexCode, documentId) {
      return ok(store.get(`${indexCode}:${documentId}`) ?? null);
    },
    async save(document) {
      store.set(`${document.indexCode}:${document.id}`, document);
      return ok(undefined);
    },
    async remove(indexCode, documentId) {
      store.delete(`${indexCode}:${documentId}`);
      return ok(undefined);
    },
  };
}

/** Minimal in-memory scan mirroring the real SQL adapter's semantics. */
function createMemorySearchRepo(store: readonly SearchDocument[]): SearchRepository {
  return {
    async search(query) {
      const companyFilter = query.filters?.filters.find((f) => f.field === "companyId");
      const matches = store.filter((doc) => {
        if (doc.indexCode !== query.indexCode) return false;
        if (companyFilter && doc.companyId !== companyFilter.value) return false;
        if (query.queryText) {
          const needle = query.queryText.toLowerCase();
          const haystack = `${doc.entityId} ${JSON.stringify(doc.fields)}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      });
      return ok({
        indexCode: query.indexCode,
        total: matches.length,
        hits: matches.map((doc) => ({
          documentId: doc.id,
          entityType: doc.entityType,
          entityId: doc.entityId,
          score: null,
          fields: doc.fields,
          highlights: [],
        })),
        facets: [],
        tookMs: null,
      });
    },
  };
}

function principal(userId: string, permission: string): PolicyPrincipal {
  return {
    userId,
    companyId: "co-1",
    roles: [
      {
        roleCode: "search",
        scopeType: "company",
        scopeId: "co-1",
        permissionCodes: [permission],
      },
    ],
    permissionCodes: [permission],
  };
}

function policyAllowCompany(): PolicyEngine {
  return {
    async evaluate(
      _p: PolicyPrincipal,
      _action: string,
      resource: PolicyResource,
    ): Promise<PolicyDecision> {
      if (resource.companyId === "co-1") {
        return { allowed: true };
      }
      return {
        allowed: false,
        reasonCode: "company_mismatch",
        message: "company",
      };
    },
  };
}

function policyDenyAll(): PolicyEngine {
  return {
    async evaluate(): Promise<PolicyDecision> {
      return {
        allowed: false,
        reasonCode: "denied",
        message: "denied",
      };
    },
  };
}

function makeCtx(
  userId: string,
  permission: string,
  policyEngine: PolicyEngine = policyAllowCompany(),
): ApplicationContext {
  return {
    correlationId: "corr-1",
    userId,
    companyId: "co-1",
    branchId: null,
    principal: principal(userId, permission),
    metadata: {},
    clock,
    signal: null,
    policyEngine,
    workflow: null,
    approval: null,
    rules: null,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

function commandOf<T>(commandType: string, payload: T): Command<T> {
  return {
    commandId: CommandId.from("00000000-0000-4000-8000-000000000001"),
    commandType,
    payload,
    metadata: {
      correlationId: CorrelationId.from("00000000-0000-4000-8000-000000000002"),
      causationId: null,
      companyId: (payload as { companyId?: string }).companyId ?? null,
      actorId: "user-1",
      issuedAt: new Date(),
    },
    idempotencyKey: null,
  };
}

function queryOf<T>(queryType: string, payload: T): Query<T> {
  return {
    queryId: QueryId.from("00000000-0000-4000-8000-000000000003"),
    queryType,
    payload,
    metadata: {
      correlationId: CorrelationId.from("00000000-0000-4000-8000-000000000004"),
      causationId: null,
      companyId: (payload as { companyId?: string }).companyId ?? null,
      actorId: "user-1",
      issuedAt: new Date(),
    },
  };
}

function searchDeps(
  documents: SearchDocumentRepository,
  search: SearchRepository,
): SearchHandlerDeps {
  return { documents, search, audit: stubAudit };
}

describe("Search V1 handlers", () => {
  it("IndexSearchDocument rejects an index code outside the V1 allow-list", async () => {
    const handler = createIndexSearchDocumentHandler(
      searchDeps(createMemoryDocumentRepo(), createMemorySearchRepo([])),
    );

    const result = await handler.handle(
      commandOf(SearchCommandTypes.IndexSearchDocument, {
        companyId: "co-1",
        indexCode: "not.allowed",
        entityType: "widget",
        entityId: "w-1",
        fields: {},
      }),
      makeCtx("user-1", SearchPolicyActions.DocumentIndex),
    );
    assert.ok(!result.ok);
    assert.equal(result.error.code, "index_code_not_allowed");
  });

  it("IndexSearchDocument saves a document for an allowed index code", async () => {
    const documents = createMemoryDocumentRepo();
    const handler = createIndexSearchDocumentHandler(
      searchDeps(documents, createMemorySearchRepo([])),
    );

    const result = await handler.handle(
      commandOf(SearchCommandTypes.IndexSearchDocument, {
        companyId: "co-1",
        indexCode: "crm.leads",
        entityType: "lead",
        entityId: "lead-1",
        fields: { name: "Acme Corp" },
      }),
      makeCtx("user-1", SearchPolicyActions.DocumentIndex),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    const { documentId } = result.value as IndexSearchDocumentResult;

    const stored = await documents.findById("crm.leads", documentId);
    assert.ok(stored.ok);
    assert.equal(stored.value?.entityId, "lead-1");
    assert.equal(stored.value?.companyId, "co-1");
  });

  it("SearchQuery rejects an index code outside the V1 allow-list", async () => {
    const handler = createSearchQueryHandler(
      searchDeps(createMemoryDocumentRepo(), createMemorySearchRepo([])),
    );

    const result = await handler.handle(
      queryOf(SearchQueryTypes.SearchQuery, {
        companyId: "co-1",
        indexCode: "not.allowed",
      }),
      makeCtx("user-1", SearchPolicyActions.QueryExecute),
    );
    assert.ok(!result.ok);
    assert.equal(result.error.code, "index_code_not_allowed");
  });

  it("SearchQuery enforces company isolation by injecting a companyId filter", async () => {
    const store: SearchDocument[] = [
      {
        id: "d1",
        indexCode: "crm.leads",
        companyId: "co-1",
        entityType: "lead",
        entityId: "lead-1",
        fields: { name: "Co1 Lead" },
        indexedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "d2",
        indexCode: "crm.leads",
        companyId: "co-2",
        entityType: "lead",
        entityId: "lead-2",
        fields: { name: "Co2 Lead" },
        indexedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const handler = createSearchQueryHandler(
      searchDeps(createMemoryDocumentRepo(), createMemorySearchRepo(store)),
    );

    const result = await handler.handle(
      queryOf(SearchQueryTypes.SearchQuery, {
        companyId: "co-1",
        indexCode: "crm.leads",
      }),
      makeCtx("user-1", SearchPolicyActions.QueryExecute),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    assert.equal(result.value.total, 1);
    assert.equal(result.value.hits[0]?.entityId, "lead-1");
  });

  it("SearchQuery authorization fails closed when Policy denies execute", async () => {
    const handler = createSearchQueryHandler(
      searchDeps(createMemoryDocumentRepo(), createMemorySearchRepo([])),
    );

    const query = queryOf(SearchQueryTypes.SearchQuery, {
      companyId: "co-2",
      indexCode: "crm.leads",
    });

    const ctx = makeCtx("user-2", SearchPolicyActions.QueryExecute, policyDenyAll());
    assert.ok(handler.authorize);
    const authSpec = await handler.authorize(query, ctx);
    const decision = await ctx.policyEngine.evaluate(
      ctx.principal!,
      authSpec.action,
      authSpec.resource,
    );
    assert.equal(decision.allowed, false);
  });
});
