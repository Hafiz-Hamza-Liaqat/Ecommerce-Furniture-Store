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
  sanitizeChallengePayload,
} from "./auth-routes.js";
import { allowAllRateLimitHook } from "../rate-limit/rate-limit.js";
import { ApiPaths } from "../constants.js";

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

describe("RC9.5 auth route hardening", () => {
  it("ignores client-supplied companyId on register", async () => {
    const identity = createIdentityFoundation();
    const route = createAuthRoutes(identity, allowAllRateLimitHook).find(
      (r) => r.method === "POST" && r.path === ApiPaths.AuthRegister,
    );
    assert.ok(route);
    const response = await route.handler({
      method: "POST",
      path: ApiPaths.AuthRegister,
      query: {},
      headers: { "content-type": "application/json" },
      bodyText: JSON.stringify({
        email: "newbie@example.test",
        password: "SecurePass12",
        fullName: "New User",
        companyId: "attacker-tenant",
      }),
      rawBody: null,
    });
    assert.equal(response.status, 201);
    const body = JSON.parse(response.body as string) as {
      readonly data: { readonly user: { readonly companyId: string | null } };
    };
    assert.equal(body.data.user.companyId, null);
  });

  it("sanitizes challenge tokens by default", () => {
    assert.deepEqual(
      sanitizeChallengePayload(
        { challengeId: "chal_1", token: "secret-token" },
        false,
      ),
      { sent: true },
    );
    assert.deepEqual(
      sanitizeChallengePayload(
        { challengeId: "chal_1", token: "secret-token" },
        true,
      ),
      { challengeId: "chal_1", token: "secret-token" },
    );
  });

  it("password-reset request does not return token unless reveal enabled", async () => {
    const identity = createIdentityFoundation();
    const registered = await identity.authentication.register({
      email: "reset@example.test",
      password: "SecurePass12",
      fullName: "Reset User",
      companyId: null,
    });
    assert.ok(registered.ok);
    await identity.authentication.activateAccount(registered.value.id);

    const sealed = createAuthRoutes(identity, allowAllRateLimitHook).find(
      (r) => r.method === "POST" && r.path === ApiPaths.AuthPasswordResetRequest,
    );
    assert.ok(sealed);
    const sealedRes = await sealed.handler({
      method: "POST",
      path: ApiPaths.AuthPasswordResetRequest,
      query: {},
      headers: { "content-type": "application/json" },
      bodyText: JSON.stringify({ email: "reset@example.test" }),
      rawBody: null,
    });
    assert.equal(sealedRes.status, 200);
    const sealedBody = JSON.parse(sealedRes.body as string) as {
      readonly data: Record<string, unknown>;
    };
    assert.deepEqual(sealedBody.data, { sent: true });
    assert.equal("token" in sealedBody.data, false);

    const open = createAuthRoutes(identity, allowAllRateLimitHook, {
      revealChallengeTokens: true,
    }).find(
      (r) => r.method === "POST" && r.path === ApiPaths.AuthPasswordResetRequest,
    );
    assert.ok(open);
    const openRes = await open.handler({
      method: "POST",
      path: ApiPaths.AuthPasswordResetRequest,
      query: {},
      headers: { "content-type": "application/json" },
      bodyText: JSON.stringify({ email: "reset@example.test" }),
      rawBody: null,
    });
    const openBody = JSON.parse(openRes.body as string) as {
      readonly data: { readonly token?: string };
    };
    assert.equal(typeof openBody.data.token, "string");
    assert.ok((openBody.data.token as string).length > 0);
  });
});
