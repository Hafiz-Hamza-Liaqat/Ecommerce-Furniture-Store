/**
 * RC5.3 — Module permission behavior tests.
 *
 * Verifies that every module CQRS handler action is a canonical
 * `<module>.<resource>.<action>` permission from the frozen RC5.1 catalog,
 * and that the existing Policy Engine enforces module-level CRUD
 * authorization (allow, cross-module deny, cross-company deny, overlap
 * window) without any new authorization logic.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANONICAL_PERMISSION_CODES,
  LEGACY_ACTION_MAP,
  PERMISSION_CATALOG,
  createIdentityFoundation,
  seedRbacCatalog,
  type IdentityFoundation,
  type PolicyPrincipal,
  type PolicyResource,
  type UserRecord,
} from "@afh/identity";
import {
  AuthorizationBehavior,
  type ApplicationContext,
  type CommandPipelineContext,
} from "@afh/application";
import {
  SalesCommandTypes,
  SalesPolicyActions,
  createCreateOpportunityHandler,
  type CreateOpportunityPayload,
  type SalesHandlerDeps,
} from "@afh/sales-application";
import { ProcurementPolicyActions } from "@afh/procurement-application";
import { InventoryPolicyActions } from "@afh/inventory-application";
import { FinancePolicyActions } from "@afh/finance-application";
import { ProjectsPolicyActions } from "@afh/projects-application";
import { ServicePolicyActions } from "@afh/service-application";
import { CrmPolicyActions } from "@afh/crm-application";
import {
  AuthorizationError,
  CommandId,
  CorrelationId,
  ok,
  type Command,
  type PlatformError,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";

const MODULE_ACTIONS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  sales: SalesPolicyActions,
  procurement: ProcurementPolicyActions,
  inventory: InventoryPolicyActions,
  finance: FinancePolicyActions,
  projects: ProjectsPolicyActions,
  service: ServicePolicyActions,
  crm: CrmPolicyActions,
};

describe("RC5.3 module CRUD authorization mapping", () => {
  it("every module handler action is a canonical catalog code owned by its module", () => {
    const catalogByCode = new Map(
      PERMISSION_CATALOG.map((entry) => [entry.code, entry]),
    );
    for (const [module, actions] of Object.entries(MODULE_ACTIONS)) {
      for (const [name, action] of Object.entries(actions)) {
        const entry = catalogByCode.get(action);
        assert.ok(
          entry,
          `${module}.${name} action '${action}' must be a canonical catalog code`,
        );
        assert.equal(
          entry.module,
          module,
          `${module}.${name} action '${action}' must belong to module '${module}'`,
        );
      }
    }
  });

  it("no handler action remains a differing legacy executable key", () => {
    for (const actions of Object.values(MODULE_ACTIONS)) {
      for (const action of Object.values(actions)) {
        const mapped = LEGACY_ACTION_MAP[action];
        if (mapped !== undefined) {
          assert.equal(
            mapped,
            action,
            `action '${action}' is a legacy key mapped to '${mapped}'`,
          );
        }
      }
    }
  });

  it("the 107 handler action references cover the full 105-code catalog exactly", () => {
    const references = Object.values(MODULE_ACTIONS).flatMap((actions) =>
      Object.values(actions),
    );
    assert.equal(references.length, 107, "107 handler action references");

    const distinct = [...new Set(references)].sort();
    assert.equal(distinct.length, 105, "105 distinct canonical actions");
    assert.deepEqual(distinct, [...CANONICAL_PERMISSION_CODES].sort());
  });

  it("every canonical action is the mapped target of its frozen legacy key", () => {
    const mappedTargets = new Set(Object.values(LEGACY_ACTION_MAP));
    for (const actions of Object.values(MODULE_ACTIONS)) {
      for (const action of Object.values(actions)) {
        assert.ok(
          mappedTargets.has(action),
          `action '${action}' must be reachable through the RC5.1 legacy mapping`,
        );
      }
    }
  });
});

function activeUser(id: string, companyId = "company-1"): UserRecord {
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
};

async function principalWithRole(roleCode: string): Promise<SeededPrincipal> {
  const identity = createIdentityFoundation();
  const seeded = await seedRbacCatalog({ store: identity.store });
  assert.ok(seeded.ok, "catalog seed must succeed");

  const user = activeUser(`user-${roleCode}`);
  await identity.store.saveUser(user);
  const role = await identity.store.getRoleByCode(null, roleCode);
  assert.ok(role, `system role '${roleCode}' must exist`);
  const assigned = await identity.rbac.assignRole({
    companyId: user.companyId!,
    userId: user.id,
    roleId: role.id,
    scopeType: "company",
  });
  assert.ok(assigned.ok, "role assignment must succeed");

  const principal = await identity.policyEngine.buildPrincipal(user.id);
  assert.ok(principal, "principal must resolve");
  return { identity, principal };
}

function companyResource(companyId = "company-1"): PolicyResource {
  return {
    type: "module_resource",
    id: null,
    companyId,
    ownerUserId: null,
    organizationId: null,
    branchId: null,
  };
}

async function decide(
  seeded: SeededPrincipal,
  action: string,
  resource: PolicyResource = companyResource(),
) {
  return seeded.identity.policyEngine.evaluate(
    seeded.principal,
    action,
    resource,
    { correlationId: "rc53-test" },
  );
}

describe("RC5.3 module permission enforcement (Policy Engine)", () => {
  it("sales_manager is allowed sales and crm module actions", async () => {
    const seeded = await principalWithRole("sales_manager");
    assert.deepEqual(
      await decide(seeded, SalesPolicyActions.OrderCreate),
      { allowed: true },
    );
    assert.deepEqual(
      await decide(seeded, SalesPolicyActions.QuoteRevise),
      { allowed: true },
    );
    assert.deepEqual(
      await decide(seeded, CrmPolicyActions.LeadCreate),
      { allowed: true },
    );
  });

  it("sales_manager is denied other modules' actions with permission_missing", async () => {
    const seeded = await principalWithRole("sales_manager");
    for (const action of [
      FinancePolicyActions.InvoiceCreate,
      InventoryPolicyActions.StockAdjust,
      ProjectsPolicyActions.TaskCreate,
      ServicePolicyActions.WorkOrderCreate,
      ProcurementPolicyActions.PurchaseOrderIssue,
    ]) {
      const decision = await decide(seeded, action);
      assert.equal(decision.allowed, false);
      assert.equal(
        decision.allowed === false ? decision.reasonCode : null,
        "permission_missing",
        `sales_manager must not hold '${action}'`,
      );
    }
  });

  it("finance_manager holds the finance module pack and nothing cross-module", async () => {
    const seeded = await principalWithRole("finance_manager");
    assert.deepEqual(
      await decide(seeded, FinancePolicyActions.InvoiceCreate),
      { allowed: true },
    );
    assert.deepEqual(
      await decide(seeded, FinancePolicyActions.LedgerAppend),
      { allowed: true },
    );
    const denied = await decide(seeded, SalesPolicyActions.OrderCreate);
    assert.equal(denied.allowed, false);
  });

  it("warehouse_manager may adjust stock; warehouse_staff may not read items", async () => {
    const manager = await principalWithRole("warehouse_manager");
    assert.deepEqual(
      await decide(manager, InventoryPolicyActions.StockAdjust),
      { allowed: true },
    );

    // Operational grants are deferred to record/branch scoping (RC5.5).
    const staff = await principalWithRole("warehouse_staff");
    const denied = await decide(staff, InventoryPolicyActions.ItemRead);
    assert.equal(denied.allowed, false);
  });

  it("read_only may read but never mutate module resources", async () => {
    const seeded = await principalWithRole("read_only");
    assert.deepEqual(
      await decide(seeded, ProjectsPolicyActions.TaskRead),
      { allowed: true },
    );
    assert.deepEqual(
      await decide(seeded, ServicePolicyActions.SummaryRead),
      { allowed: true },
    );
    const denied = await decide(seeded, ProjectsPolicyActions.TaskCreate);
    assert.equal(denied.allowed, false);
    assert.equal(
      denied.allowed === false ? denied.reasonCode : null,
      "permission_missing",
    );
  });

  it("admin is allowed representative CRUD actions across all seven modules", async () => {
    const seeded = await principalWithRole("admin");
    for (const action of [
      SalesPolicyActions.OpportunityUpdate,
      ProcurementPolicyActions.RequisitionSubmit,
      InventoryPolicyActions.StockTransfer,
      FinancePolicyActions.PaymentRecord,
      ProjectsPolicyActions.MilestoneCreate,
      ServicePolicyActions.TechnicianAssign,
      CrmPolicyActions.CampaignUpdate,
    ]) {
      assert.deepEqual(
        await decide(seeded, action),
        { allowed: true },
        `admin must hold '${action}'`,
      );
    }
  });

  it("cross-company module access is denied with company_isolation", async () => {
    const seeded = await principalWithRole("sales_manager");
    const decision = await decide(
      seeded,
      SalesPolicyActions.OrderRead,
      companyResource("company-2"),
    );
    assert.equal(decision.allowed, false);
    assert.equal(
      decision.allowed === false ? decision.reasonCode : null,
      "company_isolation",
    );
  });

  it("keeps the documented legacy overlap window: legacy keys still resolve", async () => {
    const seeded = await principalWithRole("sales_manager");
    assert.ok(
      seeded.principal.permissionCodes.includes("sales.orders.create"),
      "canonical code granted",
    );
    assert.ok(
      seeded.principal.permissionCodes.includes("order.create"),
      "legacy compatibility code still granted for rollback",
    );
    assert.deepEqual(await decide(seeded, "order.create"), { allowed: true });
  });

  it("denies a user without any role assignment", async () => {
    const identity = createIdentityFoundation();
    const seeded = await seedRbacCatalog({ store: identity.store });
    assert.ok(seeded.ok);
    const user = activeUser("user-unassigned");
    await identity.store.saveUser(user);
    const principal = await identity.policyEngine.buildPrincipal(user.id);
    assert.ok(principal);
    const decision = await identity.policyEngine.evaluate(
      principal,
      SalesPolicyActions.OpportunityRead,
      companyResource(),
      { correlationId: "rc53-test" },
    );
    assert.equal(decision.allowed, false);
  });
});

const passthroughUnitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(passthroughUnitOfWork);
  },
};

function appContext(
  seeded: SeededPrincipal,
  companyId = "company-1",
): ApplicationContext {
  return {
    correlationId: "rc53-dispatch-test",
    userId: seeded.principal.userId,
    companyId,
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

function createOpportunityCommand(
  companyId: string,
): Command<CreateOpportunityPayload> {
  return {
    commandId: CommandId.from("cmd-rc53-1"),
    commandType: SalesCommandTypes.CreateOpportunity,
    payload: { companyId, title: "RC5.3 opportunity" },
    metadata: {
      correlationId: CorrelationId.from("rc53-dispatch-test"),
      causationId: null,
      companyId,
      actorId: null,
      issuedAt: new Date(),
    },
    idempotencyKey: null,
  };
}

describe("RC5.3 module permission enforcement (pipeline dispatch)", () => {
  // authorize() is pure and never touches repositories; handle() is never
  // reached in these tests, so repository dependencies stay unused.
  const handler = createCreateOpportunityHandler(
    {} as unknown as SalesHandlerDeps,
  );

  async function dispatchAuthorization(
    seeded: SeededPrincipal,
    payloadCompanyId: string,
  ): Promise<{
    result: Result<string, PlatformError>;
    handleReached: boolean;
  }> {
    const behavior = new AuthorizationBehavior(seeded.identity.policyEngine);
    let handleReached = false;
    const ctx: CommandPipelineContext<CreateOpportunityPayload> = {
      command: createOpportunityCommand(payloadCompanyId),
      app: appContext(seeded),
      handler,
    };
    const result = await behavior.execute<CreateOpportunityPayload, string>(
      ctx,
      async () => {
        handleReached = true;
        return ok("handled");
      },
    );
    return { result, handleReached };
  }

  it("allows a permitted principal through the real handler authorize()", async () => {
    const seeded = await principalWithRole("sales_manager");
    const { result, handleReached } = await dispatchAuthorization(
      seeded,
      "company-1",
    );
    assert.ok(result.ok, "authorization must pass");
    assert.ok(handleReached, "pipeline must continue to the handler");
  });

  it("blocks a principal without the module permission before the handler runs", async () => {
    const seeded = await principalWithRole("customer_support");
    const { result, handleReached } = await dispatchAuthorization(
      seeded,
      "company-1",
    );
    assert.ok(!result.ok, "authorization must fail");
    assert.ok(!handleReached, "handler must never run on deny");
    assert.ok(result.ok === false && result.error instanceof AuthorizationError);
    assert.equal(
      result.ok === false ? result.error.code : null,
      "permission_missing",
    );
  });

  it("blocks cross-company commands before the handler runs", async () => {
    const seeded = await principalWithRole("sales_manager");
    const { result, handleReached } = await dispatchAuthorization(
      seeded,
      "company-2",
    );
    assert.ok(!result.ok, "authorization must fail");
    assert.ok(!handleReached, "handler must never run on deny");
    assert.equal(
      result.ok === false ? result.error.code : null,
      "company_isolation",
    );
  });
});
