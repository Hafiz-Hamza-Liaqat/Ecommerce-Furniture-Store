/**
 * CMS V1 — content entry handler tests (Policy, publish flag, company isolation).
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
import type { Content, ContentRepository } from "@afh/cms";
import {
  CommandId,
  CorrelationId,
  QueryId,
  ok,
  type Clock,
  type Command,
  type Page,
  type PageRequest,
  type PlatformError,
  type Query,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";
import type { ApplicationContext } from "@afh/application";
import {
  createCreateCmsEntryHandler,
  createGetCmsEntryHandler,
  createListCmsEntryHandler,
  createUpdateCmsEntryHandler,
  type CreateCmsEntryResult,
} from "./content-handlers.js";
import type { CmsHandlerDeps } from "./deps.js";
import { CmsCommandTypes, CmsPolicyActions, CmsQueryTypes } from "../constants.js";

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

function pageSlice<T>(items: readonly T[], page?: PageRequest): Page<T> {
  const pageNum = page && "page" in page ? Math.max(1, page.page) : 1;
  const pageSize =
    page && "pageSize" in page ? Math.max(1, page.pageSize) : 100;
  const offset = (pageNum - 1) * pageSize;
  const slice = items.slice(offset, offset + pageSize);
  return {
    items: slice,
    totalCount: items.length,
    page: pageNum,
    pageSize,
    nextCursor: null,
    hasMore: offset + slice.length < items.length,
  };
}

function makeContent(
  partial: Partial<Content> & Pick<Content, "id" | "companyId" | "slug" | "title">,
): Content {
  return {
    kind: "page",
    summary: null,
    bodyRef: null,
    status: "draft",
    currentRevisionId: null,
    publishedRevisionId: null,
    authorUserId: null,
    localeCode: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function createMemoryContentRepo(initial: Content[] = []): ContentRepository {
  const store = new Map(
    initial.map((c) => [`${c.companyId ?? "_"}:${c.id}`, c]),
  );
  return {
    async findById(key) {
      return ok(store.get(`${key.companyId ?? "_"}:${key.id}`) ?? null);
    },
    async findBySlug(companyId, slug) {
      for (const entry of store.values()) {
        if (entry.companyId === companyId && entry.slug === slug) {
          return ok(entry);
        }
      }
      return ok(null);
    },
    async save(content) {
      store.set(`${content.companyId ?? "_"}:${content.id}`, content);
      return ok(undefined);
    },
    async list(companyId, page) {
      const items = [...store.values()].filter((c) => c.companyId === companyId);
      return ok(pageSlice(items, page));
    },
  };
}

function principal(userId: string, permission: string): PolicyPrincipal {
  return {
    userId,
    companyId: "co-1",
    roles: [
      {
        roleCode: "cms",
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

function cmsDeps(content: ContentRepository): CmsHandlerDeps {
  return { content, audit: stubAudit };
}

describe("CMS V1 content handlers", () => {
  it("CreateCmsEntry defaults to draft and publishes when requested", async () => {
    const content = createMemoryContentRepo();
    const handler = createCreateCmsEntryHandler(cmsDeps(content));

    const draftResult = await handler.handle(
      commandOf(CmsCommandTypes.CreateCmsEntry, {
        companyId: "co-1",
        kind: "article",
        slug: "hello-world",
        title: "Hello World",
      }),
      makeCtx("user-1", CmsPolicyActions.ContentCreate),
    );
    assert.ok(draftResult.ok, draftResult.ok ? "" : draftResult.error.message);
    if (!draftResult.ok) return;
    const draft = draftResult.value as CreateCmsEntryResult;
    const draftStored = await content.findById({ companyId: "co-1", id: draft.contentId });
    assert.equal(draftStored.ok && draftStored.value?.status, "draft");

    const publishedResult = await handler.handle(
      commandOf(CmsCommandTypes.CreateCmsEntry, {
        companyId: "co-1",
        kind: "article",
        slug: "published-post",
        title: "Published Post",
        publish: true,
      }),
      makeCtx("user-1", CmsPolicyActions.ContentCreate),
    );
    assert.ok(publishedResult.ok);
    if (!publishedResult.ok) return;
    const publishedStored = await content.findById({
      companyId: "co-1",
      id: publishedResult.value.contentId,
    });
    assert.equal(publishedStored.ok && publishedStored.value?.status, "published");
  });

  it("UpdateCmsEntry toggles status via publish flag", async () => {
    const existing = makeContent({
      id: "content-1",
      companyId: "co-1",
      slug: "draft-post",
      title: "Draft Post",
      status: "draft",
    });
    const content = createMemoryContentRepo([existing]);
    const handler = createUpdateCmsEntryHandler(cmsDeps(content));

    const result = await handler.handle(
      commandOf(CmsCommandTypes.UpdateCmsEntry, {
        companyId: "co-1",
        contentId: "content-1",
        publish: true,
      }),
      makeCtx("user-1", CmsPolicyActions.ContentUpdate),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);

    const stored = await content.findById({ companyId: "co-1", id: "content-1" });
    assert.equal(stored.ok && stored.value?.status, "published");
  });

  it("GetCmsEntry authorization fails closed when Policy denies read", async () => {
    const existing = makeContent({
      id: "content-1",
      companyId: "co-1",
      slug: "locked",
      title: "Locked",
    });
    const handler = createGetCmsEntryHandler(cmsDeps(createMemoryContentRepo([existing])));

    const query = queryOf(CmsQueryTypes.GetCmsEntry, {
      companyId: "co-1",
      contentId: "content-1",
    });

    const ctx = makeCtx("user-2", CmsPolicyActions.ContentRead, policyDenyAll());
    assert.ok(handler.authorize);
    const authSpec = await handler.authorize(query, ctx);
    const decision = await ctx.policyEngine.evaluate(
      ctx.principal!,
      authSpec.action,
      authSpec.resource,
    );
    assert.equal(decision.allowed, false);
  });

  it("ListCmsEntry enforces company isolation via authorized totals", async () => {
    const handler = createListCmsEntryHandler(
      cmsDeps(
        createMemoryContentRepo([
          makeContent({ id: "c1", companyId: "co-1", slug: "a", title: "A" }),
          makeContent({ id: "c2", companyId: "co-1", slug: "b", title: "B" }),
          makeContent({ id: "c3", companyId: "co-2", slug: "c", title: "C" }),
        ]),
      ),
    );

    const result = await handler.handle(
      queryOf(CmsQueryTypes.ListCmsEntry, { companyId: "co-1" }),
      makeCtx("user-3", CmsPolicyActions.ContentRead),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    const page = result.value as Page<Content>;
    assert.equal(page.totalCount, 2);
    assert.equal(page.items.length, 2);
    assert.ok(page.items.every((item) => item.companyId === "co-1"));
  });
});
