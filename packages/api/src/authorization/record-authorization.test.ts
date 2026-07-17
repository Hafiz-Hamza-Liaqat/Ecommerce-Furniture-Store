/**
 * RC5.5 — Record-level authorization tests (ADR D45).
 *
 * Proves that record-targeting handlers load the persisted record before
 * authorization and that the existing Policy Engine — the sole authorization
 * authority — enforces owner / organization / branch scopes and company
 * isolation on persisted data, denies when required context is missing, and
 * fails closed when the record cannot be loaded.
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
  createUpdateOpportunityHandler,
  type UpdateOpportunityPayload,
  type SalesHandlerDeps,
} from "@afh/sales-application";
import {
  InventoryQueryTypes,
  createGetWarehouseHandler,
  type GetWarehousePayload,
  type InventoryHandlerDeps,
} from "@afh/inventory-application";
import type { Opportunity } from "@afh/sales";
import type { Warehouse } from "@afh/inventory";
import {
  AuthorizationError,
  CommandId,
  CorrelationId,
  InfrastructureError,
  QueryId,
  fail,
  ok,
  type Command,
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

function appContext(seeded: SeededPrincipal): ApplicationContext {
  return {
    correlationId: "rc55-record-test",
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

function opportunityRecord(
  overrides: Partial<Opportunity> = {},
): Opportunity {
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

type FindByIdKey = { readonly companyId: string; readonly id: string };

/**
 * Company-scoped repository stub matching the SQL adapters: a record is only
 * returned when both companyId and id match (physical key `type:company:id`).
 */
function salesDepsWith(
  records: readonly Opportunity[],
  calls: FindByIdKey[] = [],
  failure: PlatformError | null = null,
): SalesHandlerDeps {
  return {
    opportunities: {
      async findById(key: FindByIdKey) {
        calls.push(key);
        if (failure) return fail(failure);
        const found =
          records.find(
            (r) => r.companyId === key.companyId && r.id === key.id,
          ) ?? null;
        return ok(found);
      },
    },
  } as unknown as SalesHandlerDeps;
}

function inventoryDepsWith(
  records: readonly Warehouse[],
): InventoryHandlerDeps {
  return {
    warehouses: {
      async findById(key: FindByIdKey) {
        const found =
          records.find(
            (r) => r.companyId === key.companyId && r.id === key.id,
          ) ?? null;
        return ok(found);
      },
    },
  } as unknown as InventoryHandlerDeps;
}

function updateOpportunityCommand(
  payload: UpdateOpportunityPayload,
): Command<UpdateOpportunityPayload> {
  return {
    commandId: CommandId.from("cmd-rc55-1"),
    commandType: SalesCommandTypes.UpdateOpportunity,
    payload,
    metadata: {
      correlationId: CorrelationId.from("rc55-record-test"),
      causationId: null,
      companyId: payload.companyId,
      actorId: null,
      issuedAt: new Date(),
    },
    idempotencyKey: null,
  };
}

function getWarehouseQuery(
  payload: GetWarehousePayload,
): Query<GetWarehousePayload> {
  return {
    queryId: QueryId.from("qry-rc55-1"),
    queryType: InventoryQueryTypes.GetWarehouse,
    payload,
    metadata: {
      correlationId: CorrelationId.from("rc55-record-test"),
      causationId: null,
      companyId: payload.companyId,
      actorId: null,
      issuedAt: new Date(),
    },
  };
}

type DispatchOutcome = {
  readonly result: Result<string, PlatformError>;
  readonly handleReached: boolean;
};

/** Real behavior stack slice: ExceptionMapping (outermost) → Authorization. */
async function dispatch(
  seeded: SeededPrincipal,
  ctx:
    | CommandPipelineContext<UpdateOpportunityPayload>
    | QueryPipelineContext<GetWarehousePayload>,
): Promise<DispatchOutcome> {
  const exceptionMapping = new ExceptionMappingBehavior();
  const authorization = new AuthorizationBehavior(
    seeded.identity.policyEngine,
  );
  let handleReached = false;
  const result = await exceptionMapping.execute<unknown, string>(
    ctx as CommandPipelineContext<unknown>,
    () =>
      authorization.execute<unknown, string>(
        ctx as CommandPipelineContext<unknown>,
        async () => {
          handleReached = true;
          return ok("handled");
        },
      ),
  );
  return { result, handleReached };
}

async function dispatchUpdateOpportunity(
  seeded: SeededPrincipal,
  deps: SalesHandlerDeps,
  payload: UpdateOpportunityPayload,
): Promise<DispatchOutcome> {
  const ctx: CommandPipelineContext<UpdateOpportunityPayload> = {
    command: updateOpportunityCommand(payload),
    app: appContext(seeded),
    handler: createUpdateOpportunityHandler(deps),
  };
  return dispatch(seeded, ctx);
}

async function dispatchGetWarehouse(
  seeded: SeededPrincipal,
  deps: InventoryHandlerDeps,
  payload: GetWarehousePayload,
): Promise<DispatchOutcome> {
  const ctx: QueryPipelineContext<GetWarehousePayload> = {
    query: getWarehouseQuery(payload),
    app: appContext(seeded),
    handler: createGetWarehouseHandler(deps),
  };
  return dispatch(seeded, ctx);
}

function denyCode(result: Result<string, PlatformError>): string | null {
  return result.ok ? null : result.error.code;
}

describe("RC5.5 owner scope on persisted records (own allow/deny)", () => {
  it("allows the persisted owner through an own-scoped assignment", async () => {
    const seeded = await principalWithScope("sales_manager", "own");
    const deps = salesDepsWith([
      opportunityRecord({ salesRepUserId: seeded.userId }),
    ]);
    const { result, handleReached } = await dispatchUpdateOpportunity(
      seeded,
      deps,
      { companyId: COMPANY, opportunityId: "opp-1", title: "Renamed" },
    );
    assert.ok(result.ok, "persisted owner must be allowed");
    assert.ok(handleReached, "pipeline must continue to the handler");
  });

  it("denies a non-owner even when the payload spoofs ownership", async () => {
    const seeded = await principalWithScope("sales_manager", "own");
    const deps = salesDepsWith([
      opportunityRecord({ salesRepUserId: "someone-else" }),
    ]);
    const { result, handleReached } = await dispatchUpdateOpportunity(
      seeded,
      deps,
      {
        companyId: COMPANY,
        opportunityId: "opp-1",
        // Attacker-controlled claim — must be ignored in favor of the
        // persisted record.
        salesRepUserId: seeded.userId,
      },
    );
    assert.ok(!result.ok, "spoofed ownership must be denied");
    assert.ok(!handleReached, "handler must never run on deny");
    assert.ok(result.ok === false && result.error instanceof AuthorizationError);
    assert.equal(denyCode(result), "scope_mismatch");
  });
});

describe("RC5.5 organization isolation on persisted records", () => {
  it("allows an organization-scoped principal on a record in its organization", async () => {
    const seeded = await principalWithScope(
      "sales_manager",
      "organization",
      "org-1",
    );
    const deps = salesDepsWith([
      opportunityRecord({ organizationId: "org-1" }),
    ]);
    const { result, handleReached } = await dispatchUpdateOpportunity(
      seeded,
      deps,
      { companyId: COMPANY, opportunityId: "opp-1" },
    );
    assert.ok(result.ok, "same-organization record must be allowed");
    assert.ok(handleReached);
  });

  it("denies an organization-scoped principal on another organization's record", async () => {
    const seeded = await principalWithScope(
      "sales_manager",
      "organization",
      "org-1",
    );
    const deps = salesDepsWith([
      opportunityRecord({ organizationId: "org-2" }),
    ]);
    const { result, handleReached } = await dispatchUpdateOpportunity(
      seeded,
      deps,
      { companyId: COMPANY, opportunityId: "opp-1" },
    );
    assert.ok(!result.ok, "cross-organization record must be denied");
    assert.ok(!handleReached);
    assert.equal(denyCode(result), "scope_mismatch");
  });
});

describe("RC5.5 branch isolation on persisted records", () => {
  it("allows a branch-scoped principal on a warehouse in its branch", async () => {
    const seeded = await principalWithScope(
      "warehouse_manager",
      "branch",
      "branch-1",
    );
    const deps = inventoryDepsWith([warehouseRecord({ branchId: "branch-1" })]);
    const { result, handleReached } = await dispatchGetWarehouse(seeded, deps, {
      companyId: COMPANY,
      warehouseId: "wh-1",
    });
    assert.ok(result.ok, "same-branch warehouse must be allowed");
    assert.ok(handleReached);
  });

  it("denies a branch-scoped principal on another branch's warehouse", async () => {
    const seeded = await principalWithScope(
      "warehouse_manager",
      "branch",
      "branch-1",
    );
    const deps = inventoryDepsWith([warehouseRecord({ branchId: "branch-2" })]);
    const { result, handleReached } = await dispatchGetWarehouse(seeded, deps, {
      companyId: COMPANY,
      warehouseId: "wh-1",
    });
    assert.ok(!result.ok, "cross-branch warehouse must be denied");
    assert.ok(!handleReached);
    assert.equal(denyCode(result), "scope_mismatch");
  });
});

describe("RC5.5 cross-company denial (IDOR)", () => {
  it("denies a claimed foreign companyId with company_isolation", async () => {
    const seeded = await principalWithScope("sales_manager", "company");
    const deps = salesDepsWith([
      opportunityRecord({ companyId: OTHER_COMPANY }),
    ]);
    const { result, handleReached } = await dispatchUpdateOpportunity(
      seeded,
      deps,
      { companyId: OTHER_COMPANY, opportunityId: "opp-1" },
    );
    assert.ok(!result.ok, "foreign companyId must be denied");
    assert.ok(!handleReached);
    assert.equal(denyCode(result), "company_isolation");
  });

  it("never loads a foreign record when probing with the caller's company", async () => {
    const seeded = await principalWithScope("sales_manager", "own");
    const calls: FindByIdKey[] = [];
    // The record exists only under company-2; the probe claims company-1.
    const deps = salesDepsWith(
      [opportunityRecord({ companyId: OTHER_COMPANY })],
      calls,
    );
    const { result, handleReached } = await dispatchUpdateOpportunity(
      seeded,
      deps,
      { companyId: COMPANY, opportunityId: "opp-1" },
    );
    assert.ok(!result.ok, "foreign record probe must not be allowed");
    assert.ok(!handleReached);
    assert.equal(denyCode(result), "scope_mismatch");
    assert.ok(
      calls.every((key) => key.companyId === COMPANY),
      "authorization load must stay company-scoped",
    );
  });
});

describe("RC5.5 missing resource handling", () => {
  it("denies scoped principals when the record does not exist (missing data denies)", async () => {
    const seeded = await principalWithScope("sales_manager", "own");
    const deps = salesDepsWith([]);
    const { result, handleReached } = await dispatchUpdateOpportunity(
      seeded,
      deps,
      { companyId: COMPANY, opportunityId: "missing-id" },
    );
    assert.ok(!result.ok, "missing record must deny scoped principals");
    assert.ok(!handleReached);
    assert.equal(denyCode(result), "scope_mismatch");
  });

  it("lets company-scoped principals reach the handler's not-found path without leaking existence", async () => {
    const seeded = await principalWithScope("sales_manager", "company");
    const deps = salesDepsWith([]);
    const { result, handleReached } = await dispatchUpdateOpportunity(
      seeded,
      deps,
      { companyId: COMPANY, opportunityId: "missing-id" },
    );
    // Authorization passes on company scope; handle() then returns its
    // existing not-found error — identical for nonexistent and foreign ids.
    assert.ok(result.ok, "company scope proceeds to the handler");
    assert.ok(handleReached, "handler owns the 404 response");
  });
});

describe("RC5.5 fail-closed behavior", () => {
  it("fails the request when the authorization load fails — never allows", async () => {
    const seeded = await principalWithScope("sales_manager", "company");
    const deps = salesDepsWith(
      [opportunityRecord()],
      [],
      new InfrastructureError("store unavailable", {
        code: "store_unavailable",
      }),
    );
    const { result, handleReached } = await dispatchUpdateOpportunity(
      seeded,
      deps,
      { companyId: COMPANY, opportunityId: "opp-1" },
    );
    assert.ok(!result.ok, "load failure must fail the request");
    assert.ok(!handleReached, "handler must never run when context is unresolved");
    assert.equal(denyCode(result), "store_unavailable");
    assert.ok(
      result.ok === false && result.error instanceof InfrastructureError,
      "failure surfaces as the repository PlatformError, not an allow",
    );
  });
});
