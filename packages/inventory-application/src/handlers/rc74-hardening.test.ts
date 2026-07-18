/**
 * RC7.4 — Inventory hardening (D45 + OCC + dual-branch transfer + stock guards).
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
  Warehouse,
} from "@afh/inventory";
import {
  CommandId,
  CorrelationId,
  QueryId,
  fail,
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
import { AuthorizationError, ConcurrencyError } from "@afh/shared-kernel";
import type { ApplicationContext } from "@afh/application";
import {
  InventoryCommandTypes,
  InventoryPolicyActions,
  InventoryQueryTypes,
} from "../constants.js";
import type { UpdateInventoryItemPayload } from "../commands/commands.js";
import type { ListStockPayload } from "../queries/queries.js";
import { createUpdateInventoryItemHandler } from "./item-warehouse-handlers.js";
import { createListStockHandler } from "./list-handlers.js";
import {
  createReserveStockHandler,
  createTransferStockHandler,
} from "./stock-handlers.js";
import type { InventoryHandlerDeps } from "./deps.js";

const clock: Clock = { now: () => new Date("2026-07-18T00:00:00.000Z") };

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

function makeItem(id: string): InventoryItem {
  return {
    id,
    companyId: "co-1",
    code: "SKU-1",
    name: "Widget",
    skuRef: { sku: "SKU-1", productId: null, variantId: null },
    status: "active",
    classification: "finished_good",
    itemType: "stocked",
    defaultUnitCode: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

function makeWarehouse(
  id: string,
  branchId: string | null,
): Warehouse {
  return {
    id,
    companyId: "co-1",
    code: id,
    name: id,
    warehouseType: "central",
    status: "active",
    branchId,
    addressId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

function makeStock(
  id: string,
  warehouseId: string,
  available: number,
): StockPosition {
  return {
    id,
    companyId: "co-1",
    inventoryItemId: "item-1",
    warehouseId,
    locationId: null,
    unitCode: null,
    onHand: available,
    reserved: 0,
    available,
    damaged: 0,
    returned: 0,
    inTransit: 0,
    batchId: null,
    lotId: null,
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

function principal(
  userId: string,
  permission: string,
  scopeType: "company" | "branch" = "company",
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

function appCtx(args: {
  policy?: PolicyEngine;
  scopeType?: "company" | "branch";
  scopeId?: string | null;
}): ApplicationContext {
  return {
    correlationId: "corr-1",
    userId: "user-a",
    companyId: "co-1",
    branchId: null,
    principal: principal(
      "user-a",
      InventoryPolicyActions.StockTransfer,
      args.scopeType ?? "company",
      args.scopeId ?? null,
    ),
    metadata: {},
    clock,
    signal: null,
    policyEngine: args.policy ?? policyAllowAll(),
    workflow: null,
    approval: null,
    rules: null,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

function policyAllowAll(): PolicyEngine {
  return {
    async evaluate(): Promise<PolicyDecision> {
      return { allowed: true };
    },
  };
}

function policyDenyDestinationBranch(deniedBranchId: string): PolicyEngine {
  return {
    async evaluate(
      _p: PolicyPrincipal,
      _action: string,
      resource: PolicyResource,
    ): Promise<PolicyDecision> {
      if (resource.branchId === deniedBranchId) {
        return {
          allowed: false,
          reasonCode: "branch_denied",
          message: "destination branch denied",
        };
      }
      return { allowed: true };
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

function commandOf<T>(commandType: string, payload: T): Command<T> {
  return {
    commandId: CommandId.from("00000000-0000-4000-8000-000000000001"),
    commandType,
    payload,
    metadata: {
      correlationId: CorrelationId.from(
        "00000000-0000-4000-8000-000000000002",
      ),
      causationId: null,
      companyId: (payload as { companyId: string }).companyId,
      actorId: "user-a",
      issuedAt: new Date(),
    },
    idempotencyKey: null,
  };
}

describe("RC7.4 inventory hardening", () => {
  it("TransferStock denies when destination branch Policy denies", async () => {
    const warehouses = [
      makeWarehouse("wh-from", "br-from"),
      makeWarehouse("wh-to", "br-deny"),
    ];
    const stock = [makeStock("sp-1", "wh-from", 100)];
    const deps: InventoryHandlerDeps = {
      items: emptyRepo(),
      warehouses: {
        async findById(key) {
          return ok(
            warehouses.find(
              (w) => w.companyId === key.companyId && w.id === key.id,
            ) ?? null,
          );
        },
        async save() {
          return ok(undefined);
        },
        async remove() {
          return ok(undefined);
        },
        async listByCompany(companyId, page) {
          return ok(
            pageSlice(
              warehouses.filter((w) => w.companyId === companyId),
              page,
            ),
          );
        },
      },
      locations: emptyRepo(),
      stock: {
        async findById(key) {
          return ok(
            stock.find(
              (s) => s.companyId === key.companyId && s.id === key.id,
            ) ?? null,
          );
        },
        async findPosition(companyId, inventoryItemId, warehouseId, locationId) {
          return ok(
            stock.find(
              (s) =>
                s.companyId === companyId &&
                s.inventoryItemId === inventoryItemId &&
                s.warehouseId === warehouseId &&
                (s.locationId ?? null) === (locationId ?? null),
            ) ?? null,
          );
        },
        async save() {
          return ok(undefined);
        },
        async listByItem() {
          return ok(pageSlice([]));
        },
        async listByCompany(companyId, page) {
          return ok(
            pageSlice(stock.filter((s) => s.companyId === companyId), page),
          );
        },
      },
      movements: emptyRepo(),
      ledger: emptyRepo(),
      batches: emptyRepo(),
      serials: emptyRepo(),
      outbox: stubOutbox,
      audit: stubAudit,
    };

    const handler = createTransferStockHandler(deps);
    const result = await handler.handle(
      commandOf(InventoryCommandTypes.TransferStock, {
        companyId: "co-1",
        inventoryItemId: "item-1",
        quantity: 5,
        fromWarehouseId: "wh-from",
        toWarehouseId: "wh-to",
      }),
      appCtx({ policy: policyDenyDestinationBranch("br-deny") }),
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.error instanceof AuthorizationError);
    assert.equal(result.error.code, "branch_denied");
  });

  it("ReserveStock returns insufficient_stock when available is too low", async () => {
    const warehouses = [makeWarehouse("wh-1", "br-a")];
    const stock = [makeStock("sp-1", "wh-1", 3)];
    const deps: InventoryHandlerDeps = {
      items: emptyRepo(),
      warehouses: {
        async findById(key) {
          return ok(
            warehouses.find(
              (w) => w.companyId === key.companyId && w.id === key.id,
            ) ?? null,
          );
        },
        async save() {
          return ok(undefined);
        },
        async remove() {
          return ok(undefined);
        },
        async listByCompany(companyId, page) {
          return ok(
            pageSlice(
              warehouses.filter((w) => w.companyId === companyId),
              page,
            ),
          );
        },
      },
      locations: emptyRepo(),
      stock: {
        async findById(key) {
          return ok(
            stock.find(
              (s) => s.companyId === key.companyId && s.id === key.id,
            ) ?? null,
          );
        },
        async findPosition(companyId, inventoryItemId, warehouseId, locationId) {
          return ok(
            stock.find(
              (s) =>
                s.companyId === companyId &&
                s.inventoryItemId === inventoryItemId &&
                s.warehouseId === warehouseId &&
                (s.locationId ?? null) === (locationId ?? null),
            ) ?? null,
          );
        },
        async save() {
          return ok(undefined);
        },
        async listByItem() {
          return ok(pageSlice([]));
        },
        async listByCompany(companyId, page) {
          return ok(
            pageSlice(stock.filter((s) => s.companyId === companyId), page),
          );
        },
      },
      movements: emptyRepo(),
      ledger: emptyRepo(),
      batches: emptyRepo(),
      serials: emptyRepo(),
      outbox: stubOutbox,
      audit: stubAudit,
    };

    const handler = createReserveStockHandler(deps);
    const result = await handler.handle(
      commandOf(InventoryCommandTypes.ReserveStock, {
        companyId: "co-1",
        inventoryItemId: "item-1",
        warehouseId: "wh-1",
        quantity: 5,
        subjectType: "sales.order",
        subjectId: "ord-1",
      }),
      appCtx({ policy: policyAllowAll() }),
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "insufficient_stock");
  });

  it("UpdateInventoryItem fails on stale expectedVersion", async () => {
    const item = makeItem("item-1");
    const items: InventoryRepository = {
      async findById(key) {
        return ok(
          key.companyId === item.companyId && key.id === item.id ? item : null,
        );
      },
      async findByIdWithVersion(key) {
        return ok(
          key.companyId === item.companyId && key.id === item.id
            ? { entity: item, version: 2 }
            : null,
        );
      },
      async save(_entity, options) {
        if (options?.expectedVersion === 1) {
          return fail(
            new ConcurrencyError("Optimistic concurrency conflict", {
              code: "optimistic_concurrency_conflict",
              retryable: true,
            }),
          );
        }
        return ok(undefined);
      },
      async remove() {
        return ok(undefined);
      },
      async listByCompany(companyId, page) {
        return ok(
          pageSlice(
            item.companyId === companyId ? [item] : [],
            page,
          ),
        );
      },
    };

    const deps: InventoryHandlerDeps = {
      items,
      warehouses: emptyRepo(),
      locations: emptyRepo(),
      stock: emptyRepo(),
      movements: emptyRepo(),
      ledger: emptyRepo(),
      batches: emptyRepo(),
      serials: emptyRepo(),
      outbox: stubOutbox,
      audit: stubAudit,
    };

    const handler = createUpdateInventoryItemHandler(deps);
    const payload: UpdateInventoryItemPayload = {
      companyId: "co-1",
      inventoryItemId: "item-1",
      name: "Updated",
      expectedVersion: 1,
    };
    const result = await handler.handle(
      commandOf(InventoryCommandTypes.UpdateInventoryItem, payload),
      appCtx({ policy: policyAllowAll() }),
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "optimistic_concurrency_conflict");
  });

  it("ListStock toScope resolves branchId from warehouse", async () => {
    const warehouses = [
      makeWarehouse("wh-a", "br-a"),
      makeWarehouse("wh-b", "br-b"),
    ];
    const stock = [
      makeStock("sp-a", "wh-a", 10),
      makeStock("sp-b", "wh-b", 10),
    ];

    const deps: InventoryHandlerDeps = {
      items: emptyRepo(),
      warehouses: {
        async findById(key) {
          return ok(
            warehouses.find(
              (w) => w.companyId === key.companyId && w.id === key.id,
            ) ?? null,
          );
        },
        async save() {
          return ok(undefined);
        },
        async remove() {
          return ok(undefined);
        },
        async listByCompany(companyId, page) {
          return ok(
            pageSlice(
              warehouses.filter((w) => w.companyId === companyId),
              page,
            ),
          );
        },
      },
      locations: emptyRepo(),
      stock: {
        async findById(key) {
          return ok(
            stock.find(
              (s) => s.companyId === key.companyId && s.id === key.id,
            ) ?? null,
          );
        },
        async findPosition() {
          return ok(null);
        },
        async save() {
          return ok(undefined);
        },
        async listByItem() {
          return ok(pageSlice([]));
        },
        async listByCompany(companyId, page) {
          return ok(
            pageSlice(stock.filter((s) => s.companyId === companyId), page),
          );
        },
      },
      movements: emptyRepo(),
      ledger: emptyRepo(),
      batches: emptyRepo(),
      serials: emptyRepo(),
      outbox: stubOutbox,
      audit: stubAudit,
    };

    const handler = createListStockHandler(deps);
    const query: Query<ListStockPayload> = {
      queryId: QueryId.from("00000000-0000-4000-8000-000000000003"),
      queryType: InventoryQueryTypes.ListStock,
      payload: { companyId: "co-1" },
      metadata: {
        correlationId: CorrelationId.from(
          "00000000-0000-4000-8000-000000000004",
        ),
        causationId: null,
        companyId: "co-1",
        actorId: "user-a",
        issuedAt: new Date(),
      },
    };

    const result = await handler.handle(
      query,
      {
        ...appCtx({
          policy: policyAllowBranch(),
          scopeType: "branch",
          scopeId: "br-a",
        }),
        principal: principal(
          "user-a",
          InventoryPolicyActions.StockRead,
          "branch",
          "br-a",
        ),
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.totalCount, 1);
    assert.equal(result.value.items.length, 1);
    assert.equal(result.value.items[0]?.id, "sp-a");
  });
});
