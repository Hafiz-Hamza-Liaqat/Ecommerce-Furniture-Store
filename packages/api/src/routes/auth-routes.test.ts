import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createIdentityFoundation,
  seedRbacCatalog,
  type UserRecord,
} from "@afh/identity";
import {
  createAuthRoutes,
  resolveSessionPermissionCodes,
} from "./auth-routes.js";
import { allowAllRateLimitHook } from "../rate-limit/rate-limit.js";

function activeUser(id: string): UserRecord {
  const now = new Date().toISOString();
  return {
    id,
    companyId: "company-1",
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

describe("authenticated session permission projection", () => {
  it("returns no permissions for an active user without assignments", async () => {
    const identity = createIdentityFoundation();
    await identity.store.saveUser(activeUser("user-empty"));

    const codes = await resolveSessionPermissionCodes(identity, "user-empty");

    assert.deepEqual(codes, []);
  });

  it("returns effective canonical permissions from existing RBAC resolution", async () => {
    const identity = createIdentityFoundation();
    const seeded = await seedRbacCatalog({
      store: identity.store,
      audit: identity.audit,
    });
    assert.ok(seeded.ok);

    const user = activeUser("user-admin");
    await identity.store.saveUser(user);
    const admin = await identity.store.getRoleByCode(null, "admin");
    assert.ok(admin);
    const assigned = await identity.rbac.assignRole({
      companyId: user.companyId!,
      userId: user.id,
      roleId: admin.id,
      scopeType: "company",
    });
    assert.ok(assigned.ok);

    const codes = await resolveSessionPermissionCodes(identity, user.id);

    assert.ok(codes.includes("sales.orders.read"));
    assert.ok(codes.includes("executive.dashboard.read"));
    assert.ok(codes.includes("analytics.dashboards.configure"));
    assert.ok(!codes.includes("order.read"), "legacy key must not reach session");
    assert.ok(!codes.includes("platform.administration.read"));
    assert.deepEqual(codes, [...codes].sort(), "projection must be stable");
  });

  it("includes inherited permissions through the existing principal builder", async () => {
    const identity = createIdentityFoundation();
    const seeded = await seedRbacCatalog({ store: identity.store });
    assert.ok(seeded.ok);

    const user = activeUser("user-owner");
    await identity.store.saveUser(user);
    const owner = await identity.store.getRoleByCode(null, "company_owner");
    assert.ok(owner);
    const assigned = await identity.rbac.assignRole({
      companyId: user.companyId!,
      userId: user.id,
      roleId: owner.id,
      scopeType: "company",
    });
    assert.ok(assigned.ok);

    const codes = await resolveSessionPermissionCodes(identity, user.id);

    assert.ok(codes.includes("executive.dashboard.read"));
    assert.ok(codes.includes("finance.invoices.read"));
  });

  it("includes permissionCodes in the existing authenticated session response", async () => {
    const identity = createIdentityFoundation();
    const seeded = await seedRbacCatalog({ store: identity.store });
    assert.ok(seeded.ok);

    const user = activeUser("user-session");
    await identity.store.saveUser(user);
    const executive = await identity.store.getRoleByCode(null, "executive");
    assert.ok(executive);
    const assigned = await identity.rbac.assignRole({
      companyId: user.companyId!,
      userId: user.id,
      roleId: executive.id,
      scopeType: "company",
    });
    assert.ok(assigned.ok);
    const session = await identity.sessions.createSession({
      userId: user.id,
      companyId: user.companyId,
      deviceLabel: null,
      userAgent: null,
      ipAddress: null,
    });
    assert.ok(session.ok);

    const route = createAuthRoutes(identity, allowAllRateLimitHook).find(
      (candidate) =>
        candidate.method === "GET" &&
        candidate.path === "/api/v1/auth/session",
    );
    assert.ok(route);
    const response = await route.handler({
      method: "GET",
      path: "/api/v1/auth/session",
      query: {},
      headers: { authorization: `Bearer ${session.value.sessionId}` },
      bodyText: null,
      rawBody: null,
    });
    assert.equal(response.status, 200);
    assert.equal(typeof response.body, "string");
    const body = JSON.parse(response.body as string) as {
      readonly data: { readonly permissionCodes: readonly string[] };
    };
    assert.ok(body.data.permissionCodes.includes("executive.dashboard.read"));
    assert.ok(body.data.permissionCodes.includes("analytics.dashboards.read"));
    assert.ok(!body.data.permissionCodes.includes("order.read"));
  });
});
