/**
 * RC7.2c — Inventory List* handler tests (Policy + authorized totals + paging).
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
  InventoryItem,
  InventoryRepository,
  StockPosition,
  StockRepository,
  Warehouse,
  WarehouseRepository,
} from "@afh/inventory";
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
  type Validator,
} from "@afh/shared-kernel";
import type {
  ApplicationContext,
  AuthorizationSpec,
  QueryHandler,
} from "@afh/application";
import { createInventoryApplication } from "../composition/composition-root.js";
import {
  createListInventoryItemHandler,
  createListStockHandler,
  createListWarehouseHandler,
} from "./list-handlers.js";
import {
  createGetInventoryItemHandler,
  createGetStockHandler,
  createGetWarehouseHandler,
} from "./query-handlers.js";
import type { InventoryHandlerDeps } from "./deps.js";
import {
  InventoryCommandTypes,
  InventoryPolicyActions,
  InventoryQueryTypes,
} from "../constants.js";
import {
  listInventoryItemQueryValidator,
  listStockQueryValidator,
  listWarehouseQueryValidator,
} from "../validators/validators.js";

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

function emptyRepo(): never {
  return {
    async findById() {
      return ok(null);
    },
    async save() {
      return ok(undefined);
    },
    async listByCompany() {
      return ok(pageSlice([]));
    },
  } as never;
}

function makeItem(
  partial: Partial<InventoryItem> &
    Pick<InventoryItem, "id" | "companyId" | "code" | "name">,
): InventoryItem {
  return {
    skuRef: { sku: partial.code, productId: null, variantId: null },
    status: "active",
    classification: "finished_good",
    itemType: "stocked",
    defaultUnitCode: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeWarehouse(
  partial: Partial<Warehouse> &
    Pick<Warehouse, "id" | "companyId" | "code" | "name">,
): Warehouse {
  return {
    warehouseType: "central",
    status: "active",
    branchId: null,
    addressId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeStock(
  partial: Partial<StockPosition> &
    Pick<
      StockPosition,
      "id" | "companyId" | "inventoryItemId" | "warehouseId"
    >,
): StockPosition {
  return {
    locationId: null,
    unitCode: null,
    onHand: 0,
    reserved: 0,
    available: 0,
    damaged: 0,
    returned: 0,
    inTransit: 0,
    batchId: null,
    lotId: null,
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function memoryItemRepo(rows: InventoryItem[]): InventoryRepository {
  return {
    async findById(key) {
      return ok(
        rows.find((r) => r.companyId === key.companyId && r.id === key.id) ??
          null,
      );
    },
    async findByIdWithVersion(key) {
      const entity =
        rows.find((r) => r.companyId === key.companyId && r.id === key.id) ??
        null;
      return ok(entity ? { entity, version: 1 } : null);
    },
    async save() {
      return ok(undefined);
    },
    async remove() {
      return ok(undefined);
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function memoryWarehouseRepo(rows: Warehouse[]): WarehouseRepository {
  return {
    async findById(key) {
      return ok(
        rows.find((r) => r.companyId === key.companyId && r.id === key.id) ??
          null,
      );
    },
    async save() {
      return ok(undefined);
    },
    async remove() {
      return ok(undefined);
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function memoryStockRepo(rows: StockPosition[]): StockRepository {
  return {
    async findById(key) {
      return ok(
        rows.find((r) => r.companyId === key.companyId && r.id === key.id) ??
          null,
      );
    },
    async findPosition(companyId, inventoryItemId, warehouseId, locationId) {
      return ok(
        rows.find(
          (r) =>
            r.companyId === companyId &&
            r.inventoryItemId === inventoryItemId &&
            r.warehouseId === warehouseId &&
            (r.locationId ?? null) === (locationId ?? null),
        ) ?? null,
      );
    },
    async save() {
      return ok(undefined);
    },
    async listByItem(companyId, inventoryItemId, page) {
      return ok(
        pageSlice(
          rows.filter(
            (r) =>
              r.companyId === companyId &&
              r.inventoryItemId === inventoryItemId,
          ),
          page,
        ),
      );
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function baseDeps(partial: {
  items?: InventoryItem[];
  warehouses?: Warehouse[];
  stock?: StockPosition[];
}): InventoryHandlerDeps {
  return {
    items: memoryItemRepo(partial.items ?? []),
    warehouses: memoryWarehouseRepo(partial.warehouses ?? []),
    locations: emptyRepo(),
    stock: memoryStockRepo(partial.stock ?? []),
    movements: emptyRepo(),
    ledger: emptyRepo(),
    batches: emptyRepo(),
    serials: emptyRepo(),
    outbox: stubOutbox,
    audit: stubAudit,
  };
}

function principal(
  userId: string,
  permission: string,
  scopeType: "company" | "own" | "branch" = "company",
  scopeId: string | null = null,
): PolicyPrincipal {
  return {
    userId,
    companyId: "co-1",
    roles: [
      {
        roleCode: "inv",
        scopeType,
        scopeId,
        permissionCodes: [permission],
      },
    ],
    permissionCodes: [permission],
  };
}

function policyAllowCompanySelective(
  allowedIds: ReadonlySet<string>,
): PolicyEngine {
  return {
    async evaluate(
      _p: PolicyPrincipal,
      _action: string,
      resource: PolicyResource,
    ): Promise<PolicyDecision> {
      if (resource.companyId !== "co-1") {
        return {
          allowed: false,
          reasonCode: "company_mismatch",
          message: "company",
        };
      }
      if (resource.id != null && allowedIds.has(resource.id)) {
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

function policyAllowBranch(): PolicyEngine {
  return {
    async evaluate(
      _p: PolicyPrincipal,
      _action: string,
      resource: PolicyResource,
    ): Promise<PolicyDecision> {
      if (resource.companyId !== "co-1") {
        return {
          allowed: false,
          reasonCode: "company_mismatch",
          message: "company",
        };
      }
      if (resource.branchId === "br-a") {
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
  readonly scopeType?: "company" | "own" | "branch";
  readonly scopeId?: string | null;
}): ApplicationContext {
  return {
    correlationId: "corr-1",
    userId: args.userId,
    companyId: "co-1",
    branchId: null,
    principal:
      args.principal === undefined
        ? principal(
            args.userId,
            args.permission,
            args.scopeType ?? "company",
            args.scopeId ?? null,
          )
        : args.principal,
    metadata: {},
    clock,
    signal: null,
    policyEngine: args.policy ?? policyAllowCompanySelective(new Set()),
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
    deps: InventoryHandlerDeps,
  ) => QueryHandler<ListQueryRequest, Page<Row>>;
  readonly depsFor: (rows: readonly Row[]) => InventoryHandlerDeps;
  readonly defaultPolicy: (allowedIds: ReadonlySet<string>) => PolicyEngine;
  readonly scopeType: "company" | "branch";
  readonly scopeId: string | null;
  readonly owned: (id: string) => Row;
  readonly otherOwned: (id: string) => Row;
  readonly foreignCompany: (id: string) => Row;
  readonly searchable: (id: string) => Row;
  readonly filterable: (id: string) => Row;
  readonly sortableA: () => Row;
  readonly sortableB: () => Row;
  readonly sortField: string;
  readonly filterField: string;
  readonly filterValue: unknown;
  readonly searchNeedle: string;
};

const suites: Suite[] = [
  {
    name: "ListInventoryItem",
    queryType: InventoryQueryTypes.ListInventoryItem,
    action: InventoryPolicyActions.ItemRead,
    validator: listInventoryItemQueryValidator,
    createHandler:
      createListInventoryItemHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ items: rows as InventoryItem[] }),
    defaultPolicy: policyAllowCompanySelective,
    scopeType: "company",
    scopeId: null,
    owned: (id) =>
      makeItem({ id, companyId: "co-1", code: `I-${id}`, name: `Item ${id}` }),
    otherOwned: (id) =>
      makeItem({
        id,
        companyId: "co-1",
        code: `I-${id}`,
        name: `Other ${id}`,
      }),
    foreignCompany: (id) =>
      makeItem({
        id,
        companyId: "co-2",
        code: "IX",
        name: "Foreign",
      }),
    searchable: (id) =>
      makeItem({
        id,
        companyId: "co-1",
        code: "WIDGET-01",
        name: "Alpha Widget SKU",
      }),
    filterable: (id) =>
      makeItem({
        id,
        companyId: "co-1",
        code: `I-${id}`,
        name: `Filtered ${id}`,
        status: "inactive",
      }),
    sortableA: () =>
      makeItem({
        id: "a",
        companyId: "co-1",
        code: "Z-1",
        name: "Zebra",
      }),
    sortableB: () =>
      makeItem({
        id: "b",
        companyId: "co-1",
        code: "A-1",
        name: "Alpha",
      }),
    sortField: "name",
    filterField: "status",
    filterValue: "inactive",
    searchNeedle: "Widget",
  },
  {
    name: "ListWarehouse",
    queryType: InventoryQueryTypes.ListWarehouse,
    action: InventoryPolicyActions.WarehouseRead,
    validator: listWarehouseQueryValidator,
    createHandler:
      createListWarehouseHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ warehouses: rows as Warehouse[] }),
    defaultPolicy: () => policyAllowBranch(),
    scopeType: "branch",
    scopeId: "br-a",
    owned: (id) =>
      makeWarehouse({
        id,
        companyId: "co-1",
        code: `W-${id}`,
        name: `Wh ${id}`,
        branchId: "br-a",
      }),
    otherOwned: (id) =>
      makeWarehouse({
        id,
        companyId: "co-1",
        code: `W-${id}`,
        name: `Other ${id}`,
        branchId: "br-b",
      }),
    foreignCompany: (id) =>
      makeWarehouse({
        id,
        companyId: "co-2",
        code: "WX",
        name: "Foreign",
        branchId: "br-a",
      }),
    searchable: (id) =>
      makeWarehouse({
        id,
        companyId: "co-1",
        code: "WIDGET-WH",
        name: "Widget Depot",
        branchId: "br-a",
      }),
    filterable: (id) =>
      makeWarehouse({
        id,
        companyId: "co-1",
        code: `W-${id}`,
        name: `Filtered ${id}`,
        status: "inactive",
        branchId: "br-a",
      }),
    sortableA: () =>
      makeWarehouse({
        id: "a",
        companyId: "co-1",
        code: "Z-1",
        name: "Zebra",
        branchId: "br-a",
      }),
    sortableB: () =>
      makeWarehouse({
        id: "b",
        companyId: "co-1",
        code: "A-1",
        name: "Alpha",
        branchId: "br-a",
      }),
    sortField: "name",
    filterField: "status",
    filterValue: "inactive",
    searchNeedle: "Widget",
  },
  {
    name: "ListStock",
    queryType: InventoryQueryTypes.ListStock,
    action: InventoryPolicyActions.StockRead,
    validator: listStockQueryValidator,
    createHandler: createListStockHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ stock: rows as StockPosition[] }),
    defaultPolicy: policyAllowCompanySelective,
    scopeType: "company",
    scopeId: null,
    owned: (id) =>
      makeStock({
        id,
        companyId: "co-1",
        inventoryItemId: `item-${id}`,
        warehouseId: "wh-1",
      }),
    otherOwned: (id) =>
      makeStock({
        id,
        companyId: "co-1",
        inventoryItemId: `item-${id}`,
        warehouseId: "wh-2",
      }),
    foreignCompany: (id) =>
      makeStock({
        id,
        companyId: "co-2",
        inventoryItemId: "item-x",
        warehouseId: "wh-1",
      }),
    searchable: (id) =>
      makeStock({
        id,
        companyId: "co-1",
        inventoryItemId: "WIDGET-ITEM",
        warehouseId: "wh-1",
      }),
    filterable: (id) =>
      makeStock({
        id,
        companyId: "co-1",
        inventoryItemId: `item-${id}`,
        warehouseId: "wh-filter",
      }),
    sortableA: () =>
      makeStock({
        id: "a",
        companyId: "co-1",
        inventoryItemId: "z-item",
        warehouseId: "wh-1",
      }),
    sortableB: () =>
      makeStock({
        id: "b",
        companyId: "co-1",
        inventoryItemId: "a-item",
        warehouseId: "wh-1",
      }),
    sortField: "inventoryItemId",
    filterField: "warehouseId",
    filterValue: "wh-filter",
    searchNeedle: "WIDGET",
  },
];

for (const suite of suites) {
  describe(`RC7.2c ${suite.name}`, () => {
    const allow = (...ids: string[]) =>
      suite.name === "ListWarehouse"
        ? policyAllowBranch()
        : policyAllowCompanySelective(new Set(ids));

    const appCtx = (policy?: PolicyEngine) =>
      ctx({
        userId: "user-a",
        permission: suite.action,
        ...(policy !== undefined ? { policy } : {}),
        scopeType: suite.scopeType,
        scopeId: suite.scopeId,
      });

    it("happy path returns authorized rows", async () => {
      const rows = [
        suite.owned("1"),
        suite.otherOwned("2"),
        suite.owned("3"),
      ];
      const policy =
        suite.name === "ListWarehouse"
          ? policyAllowBranch()
          : policyAllowCompanySelective(new Set(["1", "3"]));
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(policy),
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
      const rows = [suite.owned("1"), suite.otherOwned("2")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(policyDenyAll()),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.value.totalCount, 0);
    });

    it("company isolation excludes foreign company candidates", async () => {
      const rows = [suite.owned("1"), suite.foreignCompany("x")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(allow("1")),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["1"],
      );
    });

    it("IDOR negative: leaked foreign-company row is Policy-denied", async () => {
      const leaked = [suite.owned("1"), suite.foreignCompany("leak")];
      const base = suite.depsFor(leaked);
      const broken: InventoryHandlerDeps = {
        ...base,
        items: {
          ...base.items,
          async listByCompany(_companyId, page) {
            return ok(pageSlice(leaked as InventoryItem[], page));
          },
        },
        warehouses: {
          ...base.warehouses,
          async listByCompany(_companyId, page) {
            return ok(pageSlice(leaked as Warehouse[], page));
          },
        },
        stock: {
          ...base.stock,
          async listByCompany(_companyId, page) {
            return ok(pageSlice(leaked as StockPosition[], page));
          },
        },
      };
      const policy =
        suite.name === "ListWarehouse"
          ? policyAllowBranch()
          : policyAllowCompanySelective(new Set(["1", "leak"]));
      const handler = suite.createHandler(broken);
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(policy),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.ok(!result.value.items.some((r) => r.id === "leak"));
      assert.equal(result.value.totalCount, 1);
    });

    it("authorized totalCount never equals raw repository candidate total when scopes filter", async () => {
      const rows = [
        suite.owned("1"),
        suite.otherOwned("2"),
        suite.otherOwned("3"),
        suite.owned("4"),
      ];
      const policy =
        suite.name === "ListWarehouse"
          ? policyAllowBranch()
          : policyAllowCompanySelective(new Set(["1", "4"]));
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(policy),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.value.totalCount, 2);
      assert.notEqual(result.value.totalCount, rows.length);
    });

    it("empty authorized result when no rows match Policy", async () => {
      const rows = [suite.otherOwned("1"), suite.otherOwned("2")];
      const policy =
        suite.name === "ListWarehouse"
          ? policyAllowBranch()
          : policyAllowCompanySelective(new Set(["x"]));
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(policy),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.value.totalCount, 0);
    });

    it("pagination pages over the authorized sequence", async () => {
      const rows = [
        suite.owned("1"),
        suite.otherOwned("x"),
        suite.owned("2"),
        suite.owned("3"),
        suite.owned("4"),
      ];
      const policy =
        suite.name === "ListWarehouse"
          ? policyAllowBranch()
          : policyAllowCompanySelective(new Set(["1", "2", "3", "4"]));
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: { page: { page: 2, pageSize: 2 } },
        }),
        appCtx(policy),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.value.totalCount, 4);
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["3", "4"],
      );
    });

    it("sorting applies allow-listed field order", async () => {
      const rows = [suite.sortableA(), suite.sortableB()];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: {
            sort: [{ field: suite.sortField, direction: "asc" }],
          },
        }),
        appCtx(allow("a", "b")),
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
        suite.owned("1"),
        suite.filterable("2"),
        suite.otherOwned("3"),
      ];
      const policy =
        suite.name === "ListWarehouse"
          ? policyAllowBranch()
          : policyAllowCompanySelective(new Set(["1", "2", "3"]));
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
        appCtx(policy),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["2"],
      );
    });

    it("search q matches module text fields (application-bounded, not Search module)", async () => {
      const rows = [
        suite.owned("1"),
        suite.searchable("2"),
        suite.otherOwned("3"),
      ];
      const policy =
        suite.name === "ListWarehouse"
          ? policyAllowBranch()
          : policyAllowCompanySelective(new Set(["1", "2", "3"]));
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          q: suite.searchNeedle,
        }),
        appCtx(policy),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["2"],
      );
    });

    it("invalid sort field fails validation (no silent fallback)", async () => {
      const outcome = await suite.validator.validate(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: {
            sort: [{ field: "secretField", direction: "asc" }],
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
            filters: [{ field: "secretField", operator: "eq", value: "x" }],
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
      const rows = [suite.owned("1")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        ctx({
          userId: "user-a",
          permission: suite.action,
          principal: null,
          policy: allow("1"),
        }),
      );
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.error.code, "principal_missing");
    });

    it("Policy evaluation failure fails closed", async () => {
      const rows = [suite.owned("1")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(policyThrow()),
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
        appCtx(allow()),
      )) as AuthorizationSpec;
      assert.equal(spec.action, suite.action);
      assert.equal(spec.resource.companyId, "co-1");
      assert.equal(spec.resource.id, null);
    });
  });
}

describe("RC7.2c composition regression — Get and lifecycle unchanged", () => {
  const items = [
    makeItem({ id: "item-1", companyId: "co-1", code: "I1", name: "Item" }),
  ];
  const warehouses = [
    makeWarehouse({
      id: "wh-1",
      companyId: "co-1",
      code: "W1",
      name: "Main",
      branchId: "br-a",
    }),
  ];
  const stock = [
    makeStock({
      id: "st-1",
      companyId: "co-1",
      inventoryItemId: "item-1",
      warehouseId: "wh-1",
      onHand: 5,
      available: 5,
    }),
  ];
  const deps = baseDeps({ items, warehouses, stock });

  it("existing Get handlers still behave identically after List registration", async () => {
    const app = createInventoryApplication(deps);
    assert.ok(app.handlers.resolveQuery(InventoryQueryTypes.GetInventoryItem));
    assert.ok(app.handlers.resolveQuery(InventoryQueryTypes.GetWarehouse));
    assert.ok(app.handlers.resolveQuery(InventoryQueryTypes.GetStock));
    assert.ok(app.handlers.resolveQuery(InventoryQueryTypes.ListInventoryItem));
    assert.ok(app.handlers.resolveQuery(InventoryQueryTypes.ListStock));

    const getCtx = ctx({
      userId: "user-a",
      permission: InventoryPolicyActions.ItemRead,
      policy: {
        async evaluate() {
          return { allowed: true };
        },
      },
      scopeType: "company",
    });

    const getItem = createGetInventoryItemHandler(deps);
    const itemResult = await getItem.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000010"),
        queryType: InventoryQueryTypes.GetInventoryItem,
        payload: { companyId: "co-1", inventoryItemId: "item-1" },
        metadata: {
          correlationId: CorrelationId.from(
            "00000000-0000-4000-8000-000000000011",
          ),
          causationId: null,
          companyId: "co-1",
          actorId: "user-a",
          issuedAt: new Date(),
        },
      },
      getCtx,
    );
    assert.equal(itemResult.ok, true);
    if (!itemResult.ok) return;
    assert.equal(itemResult.value.id, "item-1");

    const getWh = createGetWarehouseHandler(deps);
    const whResult = await getWh.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000012"),
        queryType: InventoryQueryTypes.GetWarehouse,
        payload: {
          companyId: "co-1",
          warehouseId: "wh-1",
          includeLocations: false,
        },
        metadata: {
          correlationId: CorrelationId.from(
            "00000000-0000-4000-8000-000000000013",
          ),
          causationId: null,
          companyId: "co-1",
          actorId: "user-a",
          issuedAt: new Date(),
        },
      },
      getCtx,
    );
    assert.equal(whResult.ok, true);
    if (!whResult.ok) return;
    assert.equal(whResult.value.warehouse.id, "wh-1");

    const getStock = createGetStockHandler(deps);
    const stockResult = await getStock.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000014"),
        queryType: InventoryQueryTypes.GetStock,
        payload: {
          companyId: "co-1",
          inventoryItemId: "item-1",
          warehouseId: "wh-1",
        },
        metadata: {
          correlationId: CorrelationId.from(
            "00000000-0000-4000-8000-000000000015",
          ),
          causationId: null,
          companyId: "co-1",
          actorId: "user-a",
          issuedAt: new Date(),
        },
      },
      getCtx,
    );
    assert.equal(stockResult.ok, true);
    if (!stockResult.ok) return;
    assert.ok(stockResult.value.positions.length >= 1);
  });

  it("existing Create/Update/Lifecycle command handlers remain registered", () => {
    const app = createInventoryApplication(deps);
    const required = [
      InventoryCommandTypes.CreateInventoryItem,
      InventoryCommandTypes.UpdateInventoryItem,
      InventoryCommandTypes.CreateWarehouse,
      InventoryCommandTypes.CreateStorageLocation,
      InventoryCommandTypes.ReceiveStock,
      InventoryCommandTypes.AdjustStock,
      InventoryCommandTypes.ReserveStock,
      InventoryCommandTypes.ReleaseReservation,
      InventoryCommandTypes.TransferStock,
    ];
    for (const type of required) {
      assert.ok(
        app.handlers.resolveCommand(type),
        `missing command handler ${type}`,
      );
    }
  });
});
