/**
 * Manufacturing V1 — production order handler tests (Policy, company isolation).
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
import type { ProductionOrder, ProductionOrderRepository } from "@afh/manufacturing";
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
  createCreateProductionOrderHandler,
  createGetProductionOrderHandler,
  createListProductionOrderHandler,
  type CreateProductionOrderResult,
} from "./production-order-handlers.js";
import type { ManufacturingHandlerDeps } from "./deps.js";
import {
  ManufacturingCommandTypes,
  ManufacturingPolicyActions,
  ManufacturingQueryTypes,
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

function makeOrder(
  partial: Partial<ProductionOrder> &
    Pick<ProductionOrder, "id" | "companyId" | "number">,
): ProductionOrder {
  return {
    status: "draft",
    bomId: null,
    routingId: null,
    finishedInventoryItemId: null,
    salesOrderId: null,
    salesOrderLineId: null,
    projectId: null,
    warehouseId: null,
    quantity: null,
    unitCode: null,
    plannedStartAt: null,
    plannedEndAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function createMemoryProductionOrderRepo(
  initial: ProductionOrder[] = [],
): ProductionOrderRepository {
  const store = new Map(
    initial.map((order) => [`${order.companyId}:${order.id}`, order]),
  );
  return {
    async findById(key) {
      return ok(store.get(`${key.companyId}:${key.id}`) ?? null);
    },
    async save(order) {
      store.set(`${order.companyId}:${order.id}`, order);
      return ok(undefined);
    },
    async saveLine() {
      return ok(undefined);
    },
    async listLines() {
      return ok([]);
    },
    async listByCompany(companyId, page) {
      const items = [...store.values()].filter((o) => o.companyId === companyId);
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
        roleCode: "manufacturing",
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

function manufacturingDeps(
  productionOrders: ProductionOrderRepository,
): ManufacturingHandlerDeps {
  return { productionOrders, audit: stubAudit };
}

describe("Manufacturing V1 production order handlers", () => {
  it("CreateProductionOrder saves a draft order with null planning fields", async () => {
    const productionOrders = createMemoryProductionOrderRepo();
    const handler = createCreateProductionOrderHandler(
      manufacturingDeps(productionOrders),
    );

    const result = await handler.handle(
      commandOf(ManufacturingCommandTypes.CreateProductionOrder, {
        companyId: "co-1",
        number: "PO-0001",
        quantity: 10,
        unitCode: "pcs",
      }),
      makeCtx("user-1", ManufacturingPolicyActions.ProductionOrderCreate),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    const created = result.value as CreateProductionOrderResult;
    assert.ok(created.productionOrderId);

    const stored = await productionOrders.findById({
      companyId: "co-1",
      id: created.productionOrderId,
    });
    assert.ok(stored.ok);
    assert.equal(stored.value?.status, "draft");
    assert.equal(stored.value?.bomId, null);
    assert.equal(stored.value?.routingId, null);
    assert.equal(stored.value?.quantity, 10);
  });

  it("GetProductionOrder authorization fails closed when Policy denies read", async () => {
    const order = makeOrder({
      id: "po-1",
      companyId: "co-1",
      number: "PO-0001",
    });
    const handler = createGetProductionOrderHandler(
      manufacturingDeps(createMemoryProductionOrderRepo([order])),
    );

    const query = queryOf(ManufacturingQueryTypes.GetProductionOrder, {
      companyId: "co-1",
      productionOrderId: "po-1",
    });

    const ctx = makeCtx(
      "user-2",
      ManufacturingPolicyActions.ProductionOrderRead,
      policyDenyAll(),
    );
    assert.ok(handler.authorize);
    const authSpec = await handler.authorize(query, ctx);
    const decision = await ctx.policyEngine.evaluate(
      ctx.principal!,
      authSpec.action,
      authSpec.resource,
    );
    assert.equal(decision.allowed, false);
  });

  it("ListProductionOrder enforces company isolation via authorized totals", async () => {
    const handler = createListProductionOrderHandler(
      manufacturingDeps(
        createMemoryProductionOrderRepo([
          makeOrder({ id: "po1", companyId: "co-1", number: "PO-0001" }),
          makeOrder({ id: "po2", companyId: "co-1", number: "PO-0002" }),
          makeOrder({ id: "po3", companyId: "co-2", number: "PO-0003" }),
        ]),
      ),
    );

    const result = await handler.handle(
      queryOf(ManufacturingQueryTypes.ListProductionOrder, { companyId: "co-1" }),
      makeCtx("user-3", ManufacturingPolicyActions.ProductionOrderRead),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    const page = result.value as Page<ProductionOrder>;
    assert.equal(page.totalCount, 2);
    assert.equal(page.items.length, 2);
    assert.ok(page.items.every((item) => item.companyId === "co-1"));
  });
});
