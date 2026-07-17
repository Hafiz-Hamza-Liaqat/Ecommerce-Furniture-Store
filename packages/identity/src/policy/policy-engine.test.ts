/**
 * RC5.8 — Policy Engine permission-to-scope binding tests (ADR D47).
 *
 * Proves that a permission authorizes a resource only when an assignment
 * that contributed that permission also satisfies the resource scope, that
 * legacy principals keep the pre-RC5.8 behavior, and that the permission and
 * company-isolation stages are unchanged.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryIdentityStore } from "../stores/identity-store.js";
import {
  RbacPolicyEngine,
  type PolicyPrincipal,
  type PolicyResource,
} from "./policy-engine.js";
import type { RoleScopeType, UserRecord } from "../models/models.js";

const COMPANY = "company-1";
const OTHER_COMPANY = "company-2";
const SALES_UPDATE = "sales.opportunities.update";
const INVENTORY_READ = "inventory.items.read";

const fixedClock = { now: (): Date => new Date("2026-07-18T00:00:00.000Z") };

function activeUser(id: string): UserRecord {
  const now = fixedClock.now().toISOString();
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

type Fixture = {
  readonly store: InMemoryIdentityStore;
  readonly engine: RbacPolicyEngine;
  readonly userId: string;
  assign(
    roleId: string,
    scopeType: RoleScopeType,
    scopeId?: string | null,
  ): Promise<void>;
  role(
    id: string,
    code: string,
    permissionCodes: readonly string[],
    parentRoleId?: string | null,
  ): Promise<void>;
};

async function fixture(userId = "user-1"): Promise<Fixture> {
  const store = new InMemoryIdentityStore();
  const engine = new RbacPolicyEngine(store, fixedClock);
  await store.saveUser(activeUser(userId));

  for (const code of [SALES_UPDATE, INVENTORY_READ]) {
    await store.savePermission({
      id: `perm-${code}`,
      code,
      module: code.split(".")[0]!,
      description: null,
    });
  }

  let assignmentSeq = 0;
  return {
    store,
    engine,
    userId,
    async role(id, code, permissionCodes, parentRoleId = null) {
      await store.saveRole({
        id,
        companyId: null,
        code,
        name: code,
        isSystem: true,
        parentRoleId,
      });
      for (const permCode of permissionCodes) {
        await store.saveRolePermission({
          roleId: id,
          permissionId: `perm-${permCode}`,
        });
      }
    },
    async assign(roleId, scopeType, scopeId = null) {
      assignmentSeq += 1;
      await store.saveUserRole({
        id: `assignment-${assignmentSeq}`,
        companyId: COMPANY,
        userId,
        roleId,
        scopeType,
        scopeId,
        validFrom: "2026-01-01T00:00:00.000Z",
        validTo: null,
      });
    },
  };
}

function resource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "opportunity",
    id: "opp-1",
    companyId: COMPANY,
    ownerUserId: null,
    organizationId: null,
    branchId: null,
    ...overrides,
  };
}

function denyCode(
  decision: Awaited<ReturnType<RbacPolicyEngine["evaluate"]>>,
): string | null {
  return decision.allowed ? null : decision.reasonCode;
}

describe("RC5.8 buildPrincipal per-entry permission binding data", () => {
  it("attaches each role entry's contributed permissions and keeps the flat union", async () => {
    const f = await fixture();
    await f.role("role-sales", "sales_role", [SALES_UPDATE]);
    await f.role("role-inv", "inventory_role", [INVENTORY_READ]);
    await f.assign("role-sales", "own");
    await f.assign("role-inv", "company");

    const principal = await f.engine.buildPrincipal(f.userId);
    assert.ok(principal);
    assert.deepEqual(
      [...principal.permissionCodes].sort(),
      [INVENTORY_READ, SALES_UPDATE].sort(),
    );
    const sales = principal.roles.find((r) => r.roleCode === "sales_role");
    const inv = principal.roles.find((r) => r.roleCode === "inventory_role");
    assert.deepEqual(sales?.permissionCodes, [SALES_UPDATE]);
    assert.equal(sales?.scopeType, "own");
    assert.deepEqual(inv?.permissionCodes, [INVENTORY_READ]);
    assert.equal(inv?.scopeType, "company");
  });

  it("inherited chain roles carry the assignment scope and their own grants", async () => {
    const f = await fixture();
    await f.role("role-parent", "parent_role", [SALES_UPDATE]);
    await f.role("role-child", "child_role", [], "role-parent");
    await f.assign("role-child", "own");

    const principal = await f.engine.buildPrincipal(f.userId);
    assert.ok(principal);
    const parent = principal.roles.find((r) => r.roleCode === "parent_role");
    assert.equal(parent?.scopeType, "own");
    assert.deepEqual(parent?.permissionCodes, [SALES_UPDATE]);
    assert.ok(principal.permissionCodes.includes(SALES_UPDATE));
  });
});

describe("RC5.8 cross-role scope widening is closed", () => {
  it("denies a permission granted only by an own-scoped role on a non-owned resource despite a company-scoped role", async () => {
    const f = await fixture();
    await f.role("role-sales", "sales_role", [SALES_UPDATE]);
    await f.role("role-inv", "inventory_role", [INVENTORY_READ]);
    await f.assign("role-sales", "own");
    await f.assign("role-inv", "company");
    const principal = (await f.engine.buildPrincipal(f.userId))!;

    const decision = await f.engine.evaluate(
      principal,
      SALES_UPDATE,
      resource({ ownerUserId: "someone-else" }),
    );
    assert.equal(denyCode(decision), "scope_mismatch");
  });

  it("still allows the own-granted permission on an owned resource", async () => {
    const f = await fixture();
    await f.role("role-sales", "sales_role", [SALES_UPDATE]);
    await f.role("role-inv", "inventory_role", [INVENTORY_READ]);
    await f.assign("role-sales", "own");
    await f.assign("role-inv", "company");
    const principal = (await f.engine.buildPrincipal(f.userId))!;

    const decision = await f.engine.evaluate(
      principal,
      SALES_UPDATE,
      resource({ ownerUserId: f.userId }),
    );
    assert.ok(decision.allowed, "owner must keep access to own records");
  });

  it("still allows the company-granted permission company-wide", async () => {
    const f = await fixture();
    await f.role("role-sales", "sales_role", [SALES_UPDATE]);
    await f.role("role-inv", "inventory_role", [INVENTORY_READ]);
    await f.assign("role-sales", "own");
    await f.assign("role-inv", "company");
    const principal = (await f.engine.buildPrincipal(f.userId))!;

    const decision = await f.engine.evaluate(
      principal,
      INVENTORY_READ,
      resource({ type: "inventory_item", ownerUserId: null }),
    );
    assert.ok(decision.allowed, "company assignment covers its own grants");
  });

  it("binds organization-scoped grants to the granting assignment's organization", async () => {
    const f = await fixture();
    await f.role("role-sales", "sales_role", [SALES_UPDATE]);
    await f.role("role-inv", "inventory_role", [INVENTORY_READ]);
    await f.assign("role-sales", "organization", "org-1");
    await f.assign("role-inv", "company");
    const principal = (await f.engine.buildPrincipal(f.userId))!;

    const foreign = await f.engine.evaluate(
      principal,
      SALES_UPDATE,
      resource({ organizationId: "org-2" }),
    );
    assert.equal(denyCode(foreign), "scope_mismatch");

    const inOrg = await f.engine.evaluate(
      principal,
      SALES_UPDATE,
      resource({ organizationId: "org-1" }),
    );
    assert.ok(inOrg.allowed);
  });

  it("binds branch-scoped grants to the granting assignment's branch", async () => {
    const f = await fixture();
    await f.role("role-inv", "inventory_role", [INVENTORY_READ]);
    await f.role("role-sales", "sales_role", [SALES_UPDATE]);
    await f.assign("role-inv", "branch", "branch-1");
    await f.assign("role-sales", "company");
    const principal = (await f.engine.buildPrincipal(f.userId))!;

    const foreign = await f.engine.evaluate(
      principal,
      INVENTORY_READ,
      resource({ type: "warehouse", branchId: "branch-2" }),
    );
    assert.equal(denyCode(foreign), "scope_mismatch");

    const inBranch = await f.engine.evaluate(
      principal,
      INVENTORY_READ,
      resource({ type: "warehouse", branchId: "branch-1" }),
    );
    assert.ok(inBranch.allowed);
  });

  it("allows company-wide access when a second assignment also grants the same permission at company scope", async () => {
    const f = await fixture();
    await f.role("role-sales", "sales_role", [SALES_UPDATE]);
    await f.role("role-sales-lead", "sales_lead_role", [SALES_UPDATE]);
    await f.assign("role-sales", "own");
    await f.assign("role-sales-lead", "company");
    const principal = (await f.engine.buildPrincipal(f.userId))!;

    const decision = await f.engine.evaluate(
      principal,
      SALES_UPDATE,
      resource({ ownerUserId: "someone-else" }),
    );
    assert.ok(
      decision.allowed,
      "a granting company-scoped assignment still widens that permission",
    );
  });
});

describe("RC5.8 super_admin binding", () => {
  it("keeps the super_admin scope bypass for actions it grants", async () => {
    const f = await fixture();
    await f.role("role-super", "super_admin", [SALES_UPDATE, INVENTORY_READ]);
    await f.assign("role-super", "own");
    const principal = (await f.engine.buildPrincipal(f.userId))!;

    const decision = await f.engine.evaluate(
      principal,
      SALES_UPDATE,
      resource({ ownerUserId: "someone-else" }),
    );
    assert.ok(decision.allowed, "super_admin bypass applies to its grants");
  });

  it("does not let a super_admin entry bypass scope for actions it did not grant", async () => {
    const f = await fixture();
    await f.role("role-super", "super_admin", [INVENTORY_READ]);
    await f.role("role-sales", "sales_role", [SALES_UPDATE]);
    await f.assign("role-super", "own");
    await f.assign("role-sales", "own");
    const principal = (await f.engine.buildPrincipal(f.userId))!;

    const decision = await f.engine.evaluate(
      principal,
      SALES_UPDATE,
      resource({ ownerUserId: "someone-else" }),
    );
    assert.equal(denyCode(decision), "scope_mismatch");
  });
});

describe("RC5.8 backward compatibility", () => {
  it("legacy principals without per-entry data keep the pre-RC5.8 union behavior", async () => {
    const f = await fixture();
    const legacy: PolicyPrincipal = {
      userId: f.userId,
      companyId: COMPANY,
      roles: [
        { roleCode: "sales_role", scopeType: "own", scopeId: null },
        { roleCode: "inventory_role", scopeType: "company", scopeId: null },
      ],
      permissionCodes: [SALES_UPDATE, INVENTORY_READ],
    };

    const decision = await f.engine.evaluate(
      legacy,
      SALES_UPDATE,
      resource({ ownerUserId: "someone-else" }),
    );
    assert.ok(
      decision.allowed,
      "legacy shape preserves the documented pre-RC5.8 behavior",
    );
  });

  it("fails closed for partially populated principals: entries without data grant nothing", async () => {
    const f = await fixture();
    const partial: PolicyPrincipal = {
      userId: f.userId,
      companyId: COMPANY,
      roles: [
        // No per-entry data on the company role: it must not widen scope.
        { roleCode: "inventory_role", scopeType: "company", scopeId: null },
        {
          roleCode: "sales_role",
          scopeType: "own",
          scopeId: null,
          permissionCodes: [SALES_UPDATE],
        },
      ],
      permissionCodes: [SALES_UPDATE, INVENTORY_READ],
    };

    const decision = await f.engine.evaluate(
      partial,
      SALES_UPDATE,
      resource({ ownerUserId: "someone-else" }),
    );
    assert.equal(denyCode(decision), "scope_mismatch");
  });
});

describe("RC5.8 unchanged earlier stages", () => {
  it("permission_missing still precedes any scope consideration", async () => {
    const f = await fixture();
    await f.role("role-inv", "inventory_role", [INVENTORY_READ]);
    await f.assign("role-inv", "company");
    const principal = (await f.engine.buildPrincipal(f.userId))!;

    const decision = await f.engine.evaluate(
      principal,
      SALES_UPDATE,
      resource(),
    );
    assert.equal(denyCode(decision), "permission_missing");
  });

  it("company_isolation still denies cross-company resources for granting assignments", async () => {
    const f = await fixture();
    await f.role("role-sales", "sales_role", [SALES_UPDATE]);
    await f.assign("role-sales", "company");
    const principal = (await f.engine.buildPrincipal(f.userId))!;

    const decision = await f.engine.evaluate(
      principal,
      SALES_UPDATE,
      resource({ companyId: OTHER_COMPANY }),
    );
    assert.equal(denyCode(decision), "company_isolation");
  });
});
