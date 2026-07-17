/**
 * RC5.7 — Query/list record filtering tests.
 *
 * Proves that list-returning queries authorize the collection operation and
 * then pass every candidate row through the existing Policy Engine — the sole
 * authorization authority — so out-of-scope records are omitted from counts
 * and id projections, cross-company rows never surface, and any evaluation
 * failure fails the whole query closed.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createIdentityFoundation,
  seedRbacCatalog,
  type IdentityFoundation,
  type PolicyEngine,
  type PolicyPrincipal,
  type RoleScopeType,
  type UserRecord,
} from "@afh/identity";
import {
  AuthorizationBehavior,
  ExceptionMappingBehavior,
  filterAuthorizedRecords,
  principalListScope,
  type ApplicationContext,
  type QueryPipelineContext,
} from "@afh/application";
import {
  SalesQueryTypes,
  createGetCustomerSalesSummaryHandler,
  type CustomerSalesSummary,
  type GetCustomerSalesSummaryPayload,
  type SalesHandlerDeps,
} from "@afh/sales-application";
import {
  InventoryQueryTypes,
  createGetInventorySummaryHandler,
  type GetInventorySummaryPayload,
  type InventorySummary,
  type InventoryHandlerDeps,
} from "@afh/inventory-application";
import type { Opportunity } from "@afh/sales";
import type { Warehouse } from "@afh/inventory";
import {
  CorrelationId,
  QueryId,
  ok,
  type Page,
  type PlatformError,
  type Query,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";

const COMPANY = "company-1";
const OTHER_COMPANY = "company-2";

function activeUser(id: string, companyId = COMPANY): UserRecord {
  const now = new Date().toISOString();
  return {
    id,
    companyId,
    email: `${id}@example.test`,
    phone: null,
    passwordHash: null,
    status: "active",
    principalKind: "human",
    emailVerifiedAt: now,
    phoneVerifiedAt: null,
    mfaEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    locale: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

type SeededPrincipal = {
  readonly identity: IdentityFoundation;
  readonly principal: PolicyPrincipal;
  readonly userId: string;
};

async function principalWithScope(
  roleCode: string,
  scopeType: RoleScopeType,
  scopeId: string | null = null,
): Promise<SeededPrincipal> {
  const identity = createIdentityFoundation();
  const seeded = await seedRbacCatalog({ store: identity.store });
  assert.ok(seeded.ok, "catalog seed must succeed");

  const user = activeUser(`user-${roleCode}-${scopeType}`);
  await identity.store.saveUser(user);
  const role = await identity.store.getRoleByCode(null, roleCode);
  assert.ok(role, `system role '${roleCode}' must exist`);
  const assigned = await identity.rbac.assignRole({
    companyId: user.companyId!,
    userId: user.id,
    roleId: role.id,
    scopeType,
    scopeId,
  });
  assert.ok(assigned.ok, "role assignment must succeed");

  const principal = await identity.policyEngine.buildPrincipal(user.id);
  assert.ok(principal, "principal must resolve");
  return { identity, principal, userId: user.id };
}

const passthroughUnitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(passthroughUnitOfWork);
  },
};

function appContext(
  seeded: SeededPrincipal,
  policyEngine?: PolicyEngine,
): ApplicationContext {
  return {
    correlationId: "rc57-list-test",
    userId: seeded.principal.userId,
    companyId: COMPANY,
    branchId: null,
    principal: seeded.principal,
    metadata: {},
    clock: seeded.identity.clock,
    signal: null,
    policyEngine: policyEngine ?? seeded.identity.policyEngine,
    workflow: null,
    approval: null,
    rules: null,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

function opportunityRecord(overrides: Partial<Opportunity> = {}): Opportunity {
  const now = new Date().toISOString();
  return {
    id: "opp-1",
    companyId: COMPANY,
    code: null,
    title: "Persisted opportunity",
    status: "open",
    source: null,
    customerId: "cust-1",
    organizationId: null,
    salesRepUserId: null,
    territoryId: null,
    projectId: null,
    estimatedValueRef: null,
    currencyCode: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function warehouseRecord(overrides: Partial<Warehouse> = {}): Warehouse {
  const now = new Date().toISOString();
  return {
    id: "wh-1",
    companyId: COMPANY,
    code: "WH-1",
    name: "Main warehouse",
    warehouseType: "standard" as Warehouse["warehouseType"],
    status: "active",
    branchId: null,
    addressId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function pageOf<T>(items: readonly T[]): Page<T> {
  return {
    items,
    totalCount: items.length,
    page: 1,
    pageSize: 500,
    nextCursor: null,
    hasMore: false,
  };
}

/**
 * Company-scoped list stub matching the SQL adapters: listByCompany only
 * returns rows persisted under the requested companyId.
 */
function salesDepsWith(opportunities: readonly Opportunity[]): SalesHandlerDeps {
  return {
    opportunities: {
      async listByCompany(companyId: string) {
        return ok(pageOf(opportunities.filter((o) => o.companyId === companyId)));
      },
    },
    quotes: {
      async listByCompany() {
        return ok(pageOf([]));
      },
    },
    orders: {
      async listByCompany() {
        return ok(pageOf([]));
      },
    },
  } as unknown as SalesHandlerDeps;
}

/** Broken adapter that leaks a foreign-company row past company keying. */
function leakySalesDepsWith(
  opportunities: readonly Opportunity[],
): SalesHandlerDeps {
  return {
    opportunities: {
      async listByCompany() {
        return ok(pageOf(opportunities));
      },
    },
    quotes: {
      async listByCompany() {
        return ok(pageOf([]));
      },
    },
    orders: {
      async listByCompany() {
        return ok(pageOf([]));
      },
    },
  } as unknown as SalesHandlerDeps;
}

function inventoryDepsWith(
  warehouses: readonly Warehouse[],
): InventoryHandlerDeps {
  return {
    items: {
      async listByCompany() {
        return ok(pageOf([]));
      },
    },
    warehouses: {
      async listByCompany(companyId: string) {
        return ok(pageOf(warehouses.filter((w) => w.companyId === companyId)));
      },
    },
    movements: {
      async listByItem() {
        return ok(pageOf([]));
      },
    },
  } as unknown as InventoryHandlerDeps;
}

function salesSummaryQuery(
  payload: GetCustomerSalesSummaryPayload,
): Query<GetCustomerSalesSummaryPayload> {
  return {
    queryId: QueryId.from("qry-rc57-1"),
    queryType: SalesQueryTypes.GetCustomerSalesSummary,
    payload,
    metadata: {
      correlationId: CorrelationId.from("rc57-list-test"),
      causationId: null,
      companyId: payload.companyId,
      actorId: null,
      issuedAt: new Date(),
    },
  };
}

function inventorySummaryQuery(
  payload: GetInventorySummaryPayload,
): Query<GetInventorySummaryPayload> {
  return {
    queryId: QueryId.from("qry-rc57-2"),
    queryType: InventoryQueryTypes.GetInventorySummary,
    payload,
    metadata: {
      correlationId: CorrelationId.from("rc57-list-test"),
      causationId: null,
      companyId: payload.companyId,
      actorId: null,
      issuedAt: new Date(),
    },
  };
}

/**
 * Real behavior stack slice: ExceptionMapping (outermost) → Authorization →
 * the actual query handler, so both the collection gate and row filtering run.
 */
async function dispatchQuery<TPayload, TResult>(
  seeded: SeededPrincipal,
  ctx: QueryPipelineContext<TPayload>,
): Promise<Result<TResult, PlatformError>> {
  const exceptionMapping = new ExceptionMappingBehavior();
  const authorization = new AuthorizationBehavior(
    seeded.identity.policyEngine,
  );
  return (await exceptionMapping.execute<TPayload, TResult>(ctx, () =>
    authorization.execute<TPayload, TResult>(
      ctx,
      () =>
        ctx.handler.handle(ctx.query, ctx.app) as Promise<
          Result<TResult, PlatformError>
        >,
    ),
  )) as Result<TResult, PlatformError>;
}

async function dispatchSalesSummary(
  seeded: SeededPrincipal,
  deps: SalesHandlerDeps,
  payload: GetCustomerSalesSummaryPayload,
  policyEngine?: PolicyEngine,
): Promise<Result<CustomerSalesSummary, PlatformError>> {
  const ctx: QueryPipelineContext<GetCustomerSalesSummaryPayload> = {
    query: salesSummaryQuery(payload),
    app: appContext(seeded, policyEngine),
    handler: createGetCustomerSalesSummaryHandler(deps),
  };
  return dispatchQuery(seeded, ctx);
}

async function dispatchInventorySummary(
  seeded: SeededPrincipal,
  deps: InventoryHandlerDeps,
  payload: GetInventorySummaryPayload,
): Promise<Result<InventorySummary, PlatformError>> {
  const ctx: QueryPipelineContext<GetInventorySummaryPayload> = {
    query: inventorySummaryQuery(payload),
    app: appContext(seeded),
    handler: createGetInventorySummaryHandler(deps),
  };
  return dispatchQuery(seeded, ctx);
}

describe("RC5.7 owner scope filters list rows", () => {
  it("keeps only rows owned by an own-scoped principal", async () => {
    const seeded = await principalWithScope("sales_manager", "own");
    const deps = salesDepsWith([
      opportunityRecord({ id: "opp-own", salesRepUserId: seeded.userId }),
      opportunityRecord({ id: "opp-foreign", salesRepUserId: "someone-else" }),
      opportunityRecord({ id: "opp-unassigned", salesRepUserId: null }),
    ]);
    const result = await dispatchSalesSummary(seeded, deps, {
      companyId: COMPANY,
      customerId: "cust-1",
    });
    assert.ok(result.ok, "own-scoped principal must reach filtered results");
    assert.equal(result.value.opportunityCount, 1);
    assert.deepEqual(result.value.openOpportunityIds, ["opp-own"]);
  });

  it("lets an own-scoped principal run the collection query (gate targets caller scopes)", async () => {
    const seeded = await principalWithScope("sales_manager", "own");
    const deps = salesDepsWith([]);
    const result = await dispatchSalesSummary(seeded, deps, {
      companyId: COMPANY,
      customerId: "cust-1",
    });
    assert.ok(result.ok, "collection gate must pass for scoped principals");
    assert.equal(result.value.opportunityCount, 0);
  });
});

describe("RC5.7 organization isolation on list rows", () => {
  it("keeps only rows inside the principal's organization", async () => {
    const seeded = await principalWithScope(
      "sales_manager",
      "organization",
      "org-1",
    );
    const deps = salesDepsWith([
      opportunityRecord({ id: "opp-org1", organizationId: "org-1" }),
      opportunityRecord({ id: "opp-org2", organizationId: "org-2" }),
      opportunityRecord({ id: "opp-noorg", organizationId: null }),
    ]);
    const result = await dispatchSalesSummary(seeded, deps, {
      companyId: COMPANY,
      customerId: "cust-1",
    });
    assert.ok(result.ok);
    assert.equal(result.value.opportunityCount, 1);
    assert.deepEqual(result.value.openOpportunityIds, ["opp-org1"]);
  });
});

describe("RC5.7 branch isolation on list rows", () => {
  it("keeps only warehouses inside the principal's branch", async () => {
    const seeded = await principalWithScope(
      "warehouse_manager",
      "branch",
      "branch-1",
    );
    const deps = inventoryDepsWith([
      warehouseRecord({ id: "wh-b1", branchId: "branch-1" }),
      warehouseRecord({ id: "wh-b2", branchId: "branch-2" }),
      warehouseRecord({ id: "wh-none", branchId: null }),
    ]);
    const result = await dispatchInventorySummary(seeded, deps, {
      companyId: COMPANY,
    });
    assert.ok(result.ok);
    assert.equal(result.value.warehouseCount, 1);
  });
});

describe("RC5.7 company scope sees full company lists", () => {
  it("returns every company row for a company-scoped principal", async () => {
    const seeded = await principalWithScope("sales_manager", "company");
    const deps = salesDepsWith([
      opportunityRecord({ id: "opp-1", salesRepUserId: "user-a" }),
      opportunityRecord({ id: "opp-2", salesRepUserId: "user-b" }),
    ]);
    const result = await dispatchSalesSummary(seeded, deps, {
      companyId: COMPANY,
      customerId: "cust-1",
    });
    assert.ok(result.ok);
    assert.equal(result.value.opportunityCount, 2);
  });
});

describe("RC5.7 cross-company rows never surface", () => {
  it("omits foreign-company rows behind company-keyed repositories", async () => {
    const seeded = await principalWithScope("sales_manager", "company");
    const deps = salesDepsWith([
      opportunityRecord({ id: "opp-local" }),
      opportunityRecord({ id: "opp-foreign", companyId: OTHER_COMPANY }),
    ]);
    const result = await dispatchSalesSummary(seeded, deps, {
      companyId: COMPANY,
      customerId: "cust-1",
    });
    assert.ok(result.ok);
    assert.equal(result.value.opportunityCount, 1);
    assert.deepEqual(result.value.openOpportunityIds, ["opp-local"]);
  });

  it("drops a leaked foreign-company row via Policy company isolation", async () => {
    const seeded = await principalWithScope("sales_manager", "company");
    // Simulates a defective adapter returning a foreign row: the Policy
    // filter itself must still deny it (defense in depth).
    const deps = leakySalesDepsWith([
      opportunityRecord({ id: "opp-local" }),
      opportunityRecord({ id: "opp-foreign", companyId: OTHER_COMPANY }),
    ]);
    const result = await dispatchSalesSummary(seeded, deps, {
      companyId: COMPANY,
      customerId: "cust-1",
    });
    assert.ok(result.ok);
    assert.deepEqual(result.value.openOpportunityIds, ["opp-local"]);
  });
});

describe("RC5.7 fail-closed behavior", () => {
  it("fails the whole query when row evaluation throws — never partial results", async () => {
    const seeded = await principalWithScope("sales_manager", "company");
    const deps = salesDepsWith([opportunityRecord()]);
    const throwingEngine: PolicyEngine = {
      async evaluate() {
        throw new Error("policy store unavailable");
      },
    };
    const result = await dispatchSalesSummary(
      seeded,
      deps,
      { companyId: COMPANY, customerId: "cust-1" },
      throwingEngine,
    );
    assert.ok(!result.ok, "evaluation failure must fail the query");
    assert.equal(result.ok === false ? result.error.code : null, "policy_evaluation_failed");
  });

  it("rejects filtering without an active principal", async () => {
    const seeded = await principalWithScope("sales_manager", "company");
    const ctx: ApplicationContext = {
      ...appContext(seeded),
      principal: null,
    };
    const result = await filterAuthorizedRecords(
      ctx,
      "sales.opportunities.read",
      "opportunity",
      [opportunityRecord()],
      (o) => ({ id: o.id, companyId: o.companyId }),
    );
    assert.ok(!result.ok, "missing principal must fail closed");
    assert.equal(result.ok === false ? result.error.code : null, "principal_missing");
  });
});

describe("RC5.7 principalListScope hints", () => {
  it("derives gate hints from the principal's scoped assignments only", async () => {
    const seeded = await principalWithScope(
      "sales_manager",
      "organization",
      "org-1",
    );
    const hints = principalListScope(seeded.principal);
    assert.equal(hints.organizationId, "org-1");
    assert.equal(hints.ownerUserId, null);
    assert.equal(hints.branchId, null);
  });

  it("returns all-null hints for a missing principal (gate stays denied)", () => {
    const hints = principalListScope(null);
    assert.deepEqual(hints, {
      ownerUserId: null,
      organizationId: null,
      branchId: null,
    });
  });
});
