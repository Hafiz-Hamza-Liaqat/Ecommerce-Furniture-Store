/**
 * RC5.8 — Permission-to-scope binding pipeline tests (ADR D47).
 *
 * Proves through the real behavior stack and the seeded RBAC catalog that a
 * permission authorizes a record only when an assignment that contributed
 * that permission also satisfies the resource scope: a company-scoped role
 * no longer widens the scope of permissions granted only by an own- or
 * branch-scoped role, while each assignment's own grants keep their scope.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createIdentityFoundation,
  seedRbacCatalog,
  type IdentityFoundation,
  type PolicyPrincipal,
  type RoleScopeType,
  type UserRecord,
} from "@afh/identity";
import {
  AuthorizationBehavior,
  ExceptionMappingBehavior,
  type ApplicationContext,
  type CommandPipelineContext,
  type QueryPipelineContext,
} from "@afh/application";
import {
  SalesCommandTypes,
  SalesQueryTypes,
  createGetCustomerSalesSummaryHandler,
  createUpdateOpportunityHandler,
  type CustomerSalesSummary,
  type GetCustomerSalesSummaryPayload,
  type UpdateOpportunityPayload,
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
  CommandId,
  CorrelationId,
  QueryId,
  ok,
  type Command,
  type Page,
  type PlatformError,
  type Query,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";

const COMPANY = "company-1";

function activeUser(id: string): UserRecord {
  const now = new Date().toISOString();
  return {
    id,
    companyId: COMPANY,
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

type Assignment = {
  readonly roleCode: string;
  readonly scopeType: RoleScopeType;
  readonly scopeId?: string | null;
};

type SeededPrincipal = {
  readonly identity: IdentityFoundation;
  readonly principal: PolicyPrincipal;
  readonly userId: string;
};

async function principalWithAssignments(
  assignments: readonly Assignment[],
): Promise<SeededPrincipal> {
  const identity = createIdentityFoundation();
  const seeded = await seedRbacCatalog({ store: identity.store });
  assert.ok(seeded.ok, "catalog seed must succeed");

  const user = activeUser("user-rc58");
  await identity.store.saveUser(user);
  for (const assignment of assignments) {
    const role = await identity.store.getRoleByCode(null, assignment.roleCode);
    assert.ok(role, `system role '${assignment.roleCode}' must exist`);
    const assigned = await identity.rbac.assignRole({
      companyId: user.companyId!,
      userId: user.id,
      roleId: role.id,
      scopeType: assignment.scopeType,
      scopeId: assignment.scopeId ?? null,
    });
    assert.ok(assigned.ok, "role assignment must succeed");
  }

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

function appContext(seeded: SeededPrincipal): ApplicationContext {
  return {
    correlationId: "rc58-binding-test",
    userId: seeded.principal.userId,
    companyId: COMPANY,
    branchId: null,
    principal: seeded.principal,
    metadata: {},
    clock: seeded.identity.clock,
    signal: null,
    policyEngine: seeded.identity.policyEngine,
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

function salesDepsWith(opportunities: readonly Opportunity[]): SalesHandlerDeps {
  return {
    opportunities: {
      async findById(key: { companyId: string; id: string }) {
        return ok(
          opportunities.find(
            (o) => o.companyId === key.companyId && o.id === key.id,
          ) ?? null,
        );
      },
      async listByCompany(companyId: string) {
        return ok(
          pageOf(opportunities.filter((o) => o.companyId === companyId)),
        );
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

async function dispatch<TPayload, TResult>(
  seeded: SeededPrincipal,
  ctx: CommandPipelineContext<TPayload> | QueryPipelineContext<TPayload>,
  terminal: () => Promise<Result<TResult, PlatformError>>,
): Promise<{ result: Result<TResult, PlatformError>; handleReached: boolean }> {
  const exceptionMapping = new ExceptionMappingBehavior();
  const authorization = new AuthorizationBehavior(
    seeded.identity.policyEngine,
  );
  let handleReached = false;
  const result = await exceptionMapping.execute<TPayload, TResult>(
    ctx as CommandPipelineContext<TPayload>,
    () =>
      authorization.execute<TPayload, TResult>(
        ctx as CommandPipelineContext<TPayload>,
        async () => {
          handleReached = true;
          return terminal();
        },
      ),
  );
  return { result, handleReached };
}

async function dispatchUpdateOpportunity(
  seeded: SeededPrincipal,
  deps: SalesHandlerDeps,
  payload: UpdateOpportunityPayload,
): Promise<{ result: Result<string, PlatformError>; handleReached: boolean }> {
  const command: Command<UpdateOpportunityPayload> = {
    commandId: CommandId.from("cmd-rc58-1"),
    commandType: SalesCommandTypes.UpdateOpportunity,
    payload,
    metadata: {
      correlationId: CorrelationId.from("rc58-binding-test"),
      causationId: null,
      companyId: payload.companyId,
      actorId: null,
      issuedAt: new Date(),
    },
    idempotencyKey: null,
  };
  const ctx: CommandPipelineContext<UpdateOpportunityPayload> = {
    command,
    app: appContext(seeded),
    handler: createUpdateOpportunityHandler(deps),
  };
  return dispatch(seeded, ctx, async () => ok("handled"));
}

async function dispatchSalesSummary(
  seeded: SeededPrincipal,
  deps: SalesHandlerDeps,
  payload: GetCustomerSalesSummaryPayload,
): Promise<Result<CustomerSalesSummary, PlatformError>> {
  const query: Query<GetCustomerSalesSummaryPayload> = {
    queryId: QueryId.from("qry-rc58-1"),
    queryType: SalesQueryTypes.GetCustomerSalesSummary,
    payload,
    metadata: {
      correlationId: CorrelationId.from("rc58-binding-test"),
      causationId: null,
      companyId: payload.companyId,
      actorId: null,
      issuedAt: new Date(),
    },
  };
  const ctx: QueryPipelineContext<GetCustomerSalesSummaryPayload> = {
    query,
    app: appContext(seeded),
    handler: createGetCustomerSalesSummaryHandler(deps),
  };
  const { result } = await dispatch<
    GetCustomerSalesSummaryPayload,
    CustomerSalesSummary
  >(seeded, ctx, () =>
    ctx.handler.handle(ctx.query, ctx.app) as Promise<
      Result<CustomerSalesSummary, PlatformError>
    >,
  );
  return result;
}

async function dispatchInventorySummary(
  seeded: SeededPrincipal,
  deps: InventoryHandlerDeps,
  payload: GetInventorySummaryPayload,
): Promise<Result<InventorySummary, PlatformError>> {
  const query: Query<GetInventorySummaryPayload> = {
    queryId: QueryId.from("qry-rc58-2"),
    queryType: InventoryQueryTypes.GetInventorySummary,
    payload,
    metadata: {
      correlationId: CorrelationId.from("rc58-binding-test"),
      causationId: null,
      companyId: payload.companyId,
      actorId: null,
      issuedAt: new Date(),
    },
  };
  const ctx: QueryPipelineContext<GetInventorySummaryPayload> = {
    query,
    app: appContext(seeded),
    handler: createGetInventorySummaryHandler(deps),
  };
  const { result } = await dispatch<
    GetInventorySummaryPayload,
    InventorySummary
  >(seeded, ctx, () =>
    ctx.handler.handle(ctx.query, ctx.app) as Promise<
      Result<InventorySummary, PlatformError>
    >,
  );
  return result;
}

function denyCode<T>(result: Result<T, PlatformError>): string | null {
  return result.ok ? null : result.error.code;
}

describe("RC5.8 cross-role scope widening closed in the pipeline", () => {
  it("denies an own-granted sales permission on a non-owned record despite a company-scoped inventory role", async () => {
    // Pre-RC5.8 the company-scoped warehouse_manager assignment satisfied
    // the scope gate for sales permissions it never granted.
    const seeded = await principalWithAssignments([
      { roleCode: "sales_manager", scopeType: "own" },
      { roleCode: "warehouse_manager", scopeType: "company" },
    ]);
    const deps = salesDepsWith([
      opportunityRecord({ salesRepUserId: "someone-else" }),
    ]);
    const { result, handleReached } = await dispatchUpdateOpportunity(
      seeded,
      deps,
      { companyId: COMPANY, opportunityId: "opp-1", title: "Renamed" },
    );
    assert.ok(!result.ok, "cross-role widening must be denied");
    assert.ok(!handleReached, "handler must never run on deny");
    assert.equal(denyCode(result), "scope_mismatch");
  });

  it("still allows the owner through the own-scoped granting assignment", async () => {
    const seeded = await principalWithAssignments([
      { roleCode: "sales_manager", scopeType: "own" },
      { roleCode: "warehouse_manager", scopeType: "company" },
    ]);
    const deps = salesDepsWith([
      opportunityRecord({ salesRepUserId: "user-rc58" }),
    ]);
    const { result, handleReached } = await dispatchUpdateOpportunity(
      seeded,
      deps,
      { companyId: COMPANY, opportunityId: "opp-1", title: "Renamed" },
    );
    assert.ok(result.ok, "owner must keep access");
    assert.ok(handleReached);
  });

  it("keeps company-wide access for permissions the company-scoped assignment itself grants", async () => {
    const seeded = await principalWithAssignments([
      { roleCode: "sales_manager", scopeType: "own" },
      { roleCode: "warehouse_manager", scopeType: "company" },
    ]);
    const deps = inventoryDepsWith([
      warehouseRecord({ id: "wh-1", branchId: "branch-1" }),
      warehouseRecord({ id: "wh-2", branchId: "branch-2" }),
    ]);
    const result = await dispatchInventorySummary(seeded, deps, {
      companyId: COMPANY,
    });
    assert.ok(result.ok, "warehouse_manager grants stay company-wide");
    assert.equal(result.value.warehouseCount, 2);
  });
});

describe("RC5.8 list-filtering interplay (action-aware gate hints)", () => {
  it("scoped list gate passes via the granting assignment and rows stay filtered to it", async () => {
    const seeded = await principalWithAssignments([
      { roleCode: "sales_manager", scopeType: "own" },
      { roleCode: "warehouse_manager", scopeType: "company" },
    ]);
    const deps = salesDepsWith([
      opportunityRecord({ id: "opp-own", salesRepUserId: "user-rc58" }),
      opportunityRecord({ id: "opp-foreign", salesRepUserId: "someone-else" }),
    ]);
    const result = await dispatchSalesSummary(seeded, deps, {
      companyId: COMPANY,
      customerId: "cust-1",
    });
    assert.ok(result.ok, "gate must pass via the own-scoped granting role");
    assert.equal(result.value.opportunityCount, 1);
    assert.deepEqual(result.value.openOpportunityIds, ["opp-own"]);
  });

  it("a non-granting assignment's branch cannot shadow the granting assignment's branch", async () => {
    // sales_manager@branch-2 does not grant inventory.summary.read; before
    // the action-aware hints its branch-2 scopeId could shadow the granting
    // warehouse_manager@branch-1 assignment and falsely deny the gate.
    const seeded = await principalWithAssignments([
      { roleCode: "sales_manager", scopeType: "branch", scopeId: "branch-2" },
      {
        roleCode: "warehouse_manager",
        scopeType: "branch",
        scopeId: "branch-1",
      },
    ]);
    const deps = inventoryDepsWith([
      warehouseRecord({ id: "wh-b1", branchId: "branch-1" }),
      warehouseRecord({ id: "wh-b2", branchId: "branch-2" }),
    ]);
    const result = await dispatchInventorySummary(seeded, deps, {
      companyId: COMPANY,
    });
    assert.ok(result.ok, "granting assignment's branch must satisfy the gate");
    assert.equal(
      result.value.warehouseCount,
      1,
      "rows stay bound to the granting assignment's branch",
    );
  });
});
