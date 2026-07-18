/**
 * RC7.2a — Sales List* handler tests (Policy + authorized totals + paging).
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
import type { OutboxStore } from "@afh/persistence";
import type {
  Opportunity,
  OpportunityRepository,
  Quote,
  QuoteRepository,
  SalesOrder,
  SalesOrderRepository,
} from "@afh/sales";
import {
  CorrelationId,
  QueryId,
  ok,
  type Clock,
  type ListQueryRequest,
  type Page,
  type PageRequest,
  type PlatformError,
  type Query,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";
import type { ApplicationContext, QueryHandler } from "@afh/application";
import type { AuthorizationSpec } from "@afh/application";
import {
  createListOpportunityHandler,
  createListQuoteHandler,
  createListSalesOrderHandler,
} from "./list-handlers.js";
import type { SalesHandlerDeps } from "./deps.js";
import { SalesPolicyActions, SalesQueryTypes } from "../constants.js";
import {
  listOpportunityQueryValidator,
  listQuoteQueryValidator,
  listSalesOrderQueryValidator,
} from "../validators/validators.js";
import type { Validator } from "@afh/shared-kernel";

const clock: Clock = { now: () => new Date() };

const passthroughUnitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(passthroughUnitOfWork);
  },
};

const stubOutbox = {
  async enqueue() {
    return ok(undefined);
  },
  async listPending() {
    return ok([]);
  },
  async markPublished() {
    return ok(undefined);
  },
  async markFailed() {
    return ok(undefined);
  },
} as unknown as OutboxStore;

const stubAudit = {
  async record() {
    return;
  },
} as unknown as SecurityAuditService;

function pageSlice<T>(
  items: readonly T[],
  page?: PageRequest,
): Page<T> {
  const pageNum =
    page && "page" in page ? Math.max(1, page.page) : 1;
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

function makeOpportunity(
  partial: Partial<Opportunity> & Pick<Opportunity, "id" | "companyId" | "title">,
): Opportunity {
  return {
    code: null,
    status: "open",
    source: null,
    customerId: null,
    organizationId: null,
    salesRepUserId: null,
    territoryId: null,
    projectId: null,
    estimatedValueRef: null,
    currencyCode: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeQuote(
  partial: Partial<Quote> & Pick<Quote, "id" | "companyId" | "number">,
): Quote {
  return {
    status: "draft",
    customerId: null,
    organizationId: null,
    opportunityId: null,
    projectId: null,
    salesRepUserId: null,
    currencyCode: "USD",
    currentRevisionId: null,
    terms: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeOrder(
  partial: Partial<SalesOrder> & Pick<SalesOrder, "id" | "companyId" | "number">,
): SalesOrder {
  return {
    status: "draft",
    customerId: null,
    organizationId: null,
    quoteId: null,
    opportunityId: null,
    projectId: null,
    salesRepUserId: null,
    currencyCode: "USD",
    billingAddressId: null,
    shippingAddressId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function memoryOppRepo(rows: Opportunity[]): OpportunityRepository {
  return {
    async findById() {
      return ok(null);
    },
    async save() {
      return ok(undefined);
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function memoryQuoteRepo(rows: Quote[]): QuoteRepository {
  return {
    async findById() {
      return ok(null);
    },
    async save() {
      return ok(undefined);
    },
    async saveRevision() {
      return ok(undefined);
    },
    async saveLine() {
      return ok(undefined);
    },
    async listLines() {
      return ok([]);
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function memoryOrderRepo(rows: SalesOrder[]): SalesOrderRepository {
  return {
    async findById() {
      return ok(null);
    },
    async save() {
      return ok(undefined);
    },
    async saveLine() {
      return ok(undefined);
    },
    async listLines() {
      return ok([]);
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function principal(
  userId: string,
  permission: string,
  scopeType: "company" | "own" = "own",
): PolicyPrincipal {
  return {
    userId,
    companyId: "co-1",
    roles: [
      {
        roleCode: "sales",
        scopeType,
        scopeId: null,
        permissionCodes: [permission],
      },
    ],
    permissionCodes: [permission],
  };
}

function policyAllowOwn(companyId = "co-1"): PolicyEngine {
  return {
    async evaluate(
      p: PolicyPrincipal,
      _action: string,
      resource: PolicyResource,
    ): Promise<PolicyDecision> {
      if (resource.companyId !== companyId) {
        return {
          allowed: false,
          reasonCode: "company_mismatch",
          message: "company",
        };
      }
      if (resource.ownerUserId === p.userId) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reasonCode: "scope_mismatch",
        message: "scope",
      };
    },
  };
}

function policyDenyAll(): PolicyEngine {
  return {
    async evaluate(): Promise<PolicyDecision> {
      return {
        allowed: false,
        reasonCode: "permission_denied",
        message: "denied",
      };
    },
  };
}

function policyThrow(): PolicyEngine {
  return {
    async evaluate(): Promise<PolicyDecision> {
      throw new Error("policy boom");
    },
  };
}

function ctx(args: {
  readonly userId: string;
  readonly permission: string;
  readonly policy?: PolicyEngine;
  readonly principal?: PolicyPrincipal | null;
}): ApplicationContext {
  return {
    correlationId: "corr-1",
    userId: args.userId,
    companyId: "co-1",
    branchId: null,
    principal:
      args.principal === undefined
        ? principal(args.userId, args.permission)
        : args.principal,
    metadata: {},
    clock,
    signal: null,
    policyEngine: args.policy ?? policyAllowOwn(),
    workflow: null,
    approval: null,
    rules: null,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

function queryOf<T extends ListQueryRequest>(
  queryType: string,
  payload: T,
): Query<T> {
  return {
    queryId: QueryId.from("00000000-0000-4000-8000-000000000001"),
    queryType,
    payload,
    metadata: {
      correlationId: CorrelationId.from(
        "00000000-0000-4000-8000-000000000002",
      ),
      causationId: null,
      companyId: payload.companyId,
      actorId: "user-a",
      issuedAt: new Date(),
    },
  };
}

type Row = { readonly id: string };

type Suite = {
  readonly name: string;
  readonly queryType: string;
  readonly action: string;
  readonly validator: Validator<Query<ListQueryRequest>>;
  readonly createHandler: (
    deps: SalesHandlerDeps,
  ) => QueryHandler<ListQueryRequest, Page<Row>>;
  readonly depsFor: (rows: readonly Row[]) => SalesHandlerDeps;
  readonly owned: (id: string, owner: string, extra?: Record<string, unknown>) => Row;
  readonly otherOwned: (id: string) => Row;
  readonly foreignCompany: (id: string) => Row;
  readonly searchable: (id: string, owner: string) => Row;
  readonly filterable: (id: string, owner: string) => Row;
  readonly sortableA: (owner: string) => Row;
  readonly sortableB: (owner: string) => Row;
  readonly sortField: string;
  readonly filterField: string;
  readonly filterValue: unknown;
  readonly searchNeedle: string;
  readonly invalidSort: string;
  readonly invalidFilter: string;
};

const oppRows = {
  owned: (id: string, owner: string, extra: Partial<Opportunity> = {}) =>
    makeOpportunity({
      id,
      companyId: "co-1",
      title: extra.title ?? `Opp ${id}`,
      salesRepUserId: owner,
      ...extra,
    }),
};

const suites: Suite[] = [
  {
    name: "ListOpportunity",
    queryType: SalesQueryTypes.ListOpportunity,
    action: SalesPolicyActions.OpportunityRead,
    validator: listOpportunityQueryValidator,
    createHandler: createListOpportunityHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => ({
      opportunities: memoryOppRepo(rows as Opportunity[]),
      quotes: memoryQuoteRepo([]),
      orders: memoryOrderRepo([]),
      outbox: stubOutbox,
      audit: stubAudit,
    }),
    owned: (id, owner, extra) =>
      oppRows.owned(id, owner, extra as Partial<Opportunity>),
    otherOwned: (id) => oppRows.owned(id, "user-b"),
    foreignCompany: (id) =>
      makeOpportunity({
        id,
        companyId: "co-2",
        title: "Foreign",
        salesRepUserId: "user-a",
      }),
    searchable: (id, owner) =>
      oppRows.owned(id, owner, { title: "Alpha Widget Deal", code: "OPP-ALPHA" }),
    filterable: (id, owner) =>
      oppRows.owned(id, owner, { status: "qualified" }),
    sortableA: (owner) =>
      oppRows.owned("a", owner, {
        title: "Zebra",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    sortableB: (owner) =>
      oppRows.owned("b", owner, {
        title: "Alpha",
        updatedAt: "2026-01-03T00:00:00.000Z",
      }),
    sortField: "title",
    filterField: "status",
    filterValue: "qualified",
    searchNeedle: "Widget",
    invalidSort: "secretField",
    invalidFilter: "secretField",
  },
  {
    name: "ListQuote",
    queryType: SalesQueryTypes.ListQuote,
    action: SalesPolicyActions.QuoteRead,
    validator: listQuoteQueryValidator,
    createHandler: createListQuoteHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => ({
      opportunities: memoryOppRepo([]),
      quotes: memoryQuoteRepo(rows as Quote[]),
      orders: memoryOrderRepo([]),
      outbox: stubOutbox,
      audit: stubAudit,
    }),
    owned: (id, owner, extra) =>
      makeQuote({
        id,
        companyId: "co-1",
        number: (extra?.["number"] as string | undefined) ?? `Q-${id}`,
        salesRepUserId: owner,
        ...(extra as Partial<Quote>),
      }),
    otherOwned: (id) =>
      makeQuote({ id, companyId: "co-1", number: `Q-${id}`, salesRepUserId: "user-b" }),
    foreignCompany: (id) =>
      makeQuote({
        id,
        companyId: "co-2",
        number: "Q-X",
        salesRepUserId: "user-a",
      }),
    searchable: (id, owner) =>
      makeQuote({
        id,
        companyId: "co-1",
        number: "Q-WIDGET-99",
        salesRepUserId: owner,
      }),
    filterable: (id, owner) =>
      makeQuote({
        id,
        companyId: "co-1",
        number: `Q-${id}`,
        status: "approved",
        salesRepUserId: owner,
      }),
    sortableA: (owner) =>
      makeQuote({
        id: "a",
        companyId: "co-1",
        number: "Z-100",
        salesRepUserId: owner,
      }),
    sortableB: (owner) =>
      makeQuote({
        id: "b",
        companyId: "co-1",
        number: "A-100",
        salesRepUserId: owner,
      }),
    sortField: "number",
    filterField: "status",
    filterValue: "approved",
    searchNeedle: "WIDGET",
    invalidSort: "secretField",
    invalidFilter: "secretField",
  },
  {
    name: "ListSalesOrder",
    queryType: SalesQueryTypes.ListSalesOrder,
    action: SalesPolicyActions.OrderRead,
    validator: listSalesOrderQueryValidator,
    createHandler: createListSalesOrderHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => ({
      opportunities: memoryOppRepo([]),
      quotes: memoryQuoteRepo([]),
      orders: memoryOrderRepo(rows as SalesOrder[]),
      outbox: stubOutbox,
      audit: stubAudit,
    }),
    owned: (id, owner, extra) =>
      makeOrder({
        id,
        companyId: "co-1",
        number: (extra?.["number"] as string | undefined) ?? `SO-${id}`,
        salesRepUserId: owner,
        ...(extra as Partial<SalesOrder>),
      }),
    otherOwned: (id) =>
      makeOrder({
        id,
        companyId: "co-1",
        number: `SO-${id}`,
        salesRepUserId: "user-b",
      }),
    foreignCompany: (id) =>
      makeOrder({
        id,
        companyId: "co-2",
        number: "SO-X",
        salesRepUserId: "user-a",
      }),
    searchable: (id, owner) =>
      makeOrder({
        id,
        companyId: "co-1",
        number: "SO-WIDGET-7",
        salesRepUserId: owner,
      }),
    filterable: (id, owner) =>
      makeOrder({
        id,
        companyId: "co-1",
        number: `SO-${id}`,
        status: "confirmed",
        salesRepUserId: owner,
      }),
    sortableA: (owner) =>
      makeOrder({
        id: "a",
        companyId: "co-1",
        number: "Z-200",
        salesRepUserId: owner,
      }),
    sortableB: (owner) =>
      makeOrder({
        id: "b",
        companyId: "co-1",
        number: "A-200",
        salesRepUserId: owner,
      }),
    sortField: "number",
    filterField: "status",
    filterValue: "confirmed",
    searchNeedle: "WIDGET",
    invalidSort: "secretField",
    invalidFilter: "secretField",
  },
];

for (const suite of suites) {
  describe(`RC7.2a ${suite.name}`, () => {
    it("happy path returns authorized rows", async () => {
      const rows = [
        suite.owned("1", "user-a"),
        suite.otherOwned("2"),
        suite.owned("3", "user-a"),
      ];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        ctx({ userId: "user-a", permission: suite.action }),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["1", "3"],
      );
      assert.equal(result.value.totalCount, 2);
    });

    it("Policy deny omits unauthorized rows", async () => {
      const rows = [suite.owned("1", "user-a"), suite.otherOwned("2")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        ctx({
          userId: "user-a",
          permission: suite.action,
          policy: policyDenyAll(),
        }),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.value.totalCount, 0);
      assert.deepEqual(result.value.items, []);
    });

    it("company isolation excludes foreign company candidates", async () => {
      const rows = [
        suite.owned("1", "user-a"),
        suite.foreignCompany("x"),
      ];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        ctx({ userId: "user-a", permission: suite.action }),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["1"],
      );
      assert.equal(result.value.totalCount, 1);
    });

    it("IDOR negative: leaked foreign-company row is Policy-denied", async () => {
      // Adapter that ignores company filter (defect) — Policy must still deny.
      const leaked = [
        suite.owned("1", "user-a"),
        suite.foreignCompany("leak"),
      ];
      const base = suite.depsFor(leaked);
      const broken: SalesHandlerDeps = {
        ...base,
        opportunities: {
          ...base.opportunities,
          async listByCompany(_companyId, page) {
            return ok(pageSlice(leaked as Opportunity[], page));
          },
        },
        quotes: {
          ...base.quotes,
          async listByCompany(_companyId, page) {
            return ok(pageSlice(leaked as Quote[], page));
          },
        },
        orders: {
          ...base.orders,
          async listByCompany(_companyId, page) {
            return ok(pageSlice(leaked as SalesOrder[], page));
          },
        },
      };
      const handler = suite.createHandler(broken);
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        ctx({ userId: "user-a", permission: suite.action }),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.ok(!result.value.items.some((r) => r.id === "leak"));
      assert.equal(result.value.totalCount, 1);
    });

    it("authorized totalCount never equals raw repository candidate total when scopes filter", async () => {
      const rows = [
        suite.owned("1", "user-a"),
        suite.otherOwned("2"),
        suite.otherOwned("3"),
        suite.owned("4", "user-a"),
      ];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        ctx({ userId: "user-a", permission: suite.action }),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.value.totalCount, 2);
      assert.notEqual(result.value.totalCount, rows.length);
    });

    it("empty authorized result when no rows match Policy", async () => {
      const rows = [suite.otherOwned("1"), suite.otherOwned("2")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        ctx({ userId: "user-a", permission: suite.action }),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.value.totalCount, 0);
      assert.deepEqual(result.value.items, []);
      assert.equal(result.value.hasMore, false);
    });

    it("pagination pages over the authorized sequence", async () => {
      const rows = [
        suite.owned("1", "user-a"),
        suite.otherOwned("x"),
        suite.owned("2", "user-a"),
        suite.owned("3", "user-a"),
        suite.owned("4", "user-a"),
      ];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: { page: { page: 2, pageSize: 2 } },
        }),
        ctx({ userId: "user-a", permission: suite.action }),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.value.totalCount, 4);
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["3", "4"],
      );
      assert.equal(result.value.page, 2);
      assert.equal(result.value.pageSize, 2);
      assert.equal(result.value.hasMore, false);
    });

    it("sorting applies allow-listed field order", async () => {
      const rows = [suite.sortableA("user-a"), suite.sortableB("user-a")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: {
            sort: [{ field: suite.sortField, direction: "asc" }],
          },
        }),
        ctx({ userId: "user-a", permission: suite.action }),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["b", "a"],
      );
    });

    it("filtering applies allow-listed field", async () => {
      const rows = [
        suite.owned("1", "user-a"),
        suite.filterable("2", "user-a"),
        suite.otherOwned("3"),
      ];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: {
            filters: [
              {
                field: suite.filterField,
                operator: "eq",
                value: suite.filterValue,
              },
            ],
          },
        }),
        ctx({ userId: "user-a", permission: suite.action }),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["2"],
      );
      assert.equal(result.value.totalCount, 1);
    });

    it("search q matches module text fields", async () => {
      const rows = [
        suite.owned("1", "user-a"),
        suite.searchable("2", "user-a"),
        suite.otherOwned("3"),
      ];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          q: suite.searchNeedle,
        }),
        ctx({ userId: "user-a", permission: suite.action }),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["2"],
      );
    });

    it("invalid sort field fails validation", async () => {
      const outcome = await suite.validator.validate(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: {
            sort: [{ field: suite.invalidSort, direction: "asc" }],
          },
        }),
      );
      assert.equal(outcome.valid, false);
      assert.equal(outcome.violations[0]?.code, "list_sort_field_not_allowed");
    });

    it("invalid filter field fails validation", async () => {
      const outcome = await suite.validator.validate(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: {
            filters: [
              { field: suite.invalidFilter, operator: "eq", value: "x" },
            ],
          },
        }),
      );
      assert.equal(outcome.valid, false);
      assert.equal(
        outcome.violations[0]?.code,
        "list_filter_field_not_allowed",
      );
    });

    it("missing principal fails closed", async () => {
      const rows = [suite.owned("1", "user-a")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        ctx({
          userId: "user-a",
          permission: suite.action,
          principal: null,
        }),
      );
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.error.code, "principal_missing");
    });

    it("Policy evaluation failure fails closed", async () => {
      const rows = [suite.owned("1", "user-a")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        ctx({
          userId: "user-a",
          permission: suite.action,
          policy: policyThrow(),
        }),
      );
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.error.code, "policy_evaluation_failed");
    });

    it("AuthorizationSpec uses collection principalListScope gate", async () => {
      const handler = suite.createHandler(suite.depsFor([]));
      assert.ok(handler.authorize);
      const spec = (await handler.authorize!(
        queryOf(suite.queryType, { companyId: "co-1" }),
        ctx({ userId: "user-a", permission: suite.action }),
      )) as AuthorizationSpec;
      assert.equal(spec.action, suite.action);
      assert.equal(spec.resource.companyId, "co-1");
      assert.equal(spec.resource.id, null);
      assert.equal(spec.resource.ownerUserId, "user-a");
    });
  });
}
