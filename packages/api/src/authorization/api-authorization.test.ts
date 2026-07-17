/**
 * RC5.4 — API authorization completion tests.
 *
 * Covers PolicyResource owner/org/branch/attribute population from payloads,
 * upload-route Policy enforcement for `dam.assets.upload`, and OpenAPI
 * production exposure lockdown. Does not change Policy Engine semantics.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createIdentityFoundation,
  seedRbacCatalog,
  type IdentityFoundation,
  type UserRecord,
} from "@afh/identity";
import {
  createCreateOpportunityHandler,
  type SalesHandlerDeps,
} from "@afh/sales-application";
import {
  createCreateWarehouseHandler,
  type InventoryHandlerDeps,
} from "@afh/inventory-application";
import {
  createCreateProjectHandler,
  type ProjectHandlerDeps,
} from "@afh/projects-application";
import { createCreateLeadHandler, type CrmHandlerDeps } from "@afh/crm-application";
import { ok } from "@afh/shared-kernel";
import type { AuthorizationSpec } from "@afh/application";
import { allowAllRateLimitHook } from "../rate-limit/rate-limit.js";
import {
  createAllRoutes,
  createUploadRoutes,
  type RouteDeps,
} from "../routes/routes.js";
import { ApiPaths } from "../constants.js";
import { DEFAULT_VERSION_CATALOG } from "../versioning/versioning.js";

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

function asSpec(value: AuthorizationSpec | Promise<AuthorizationSpec>): AuthorizationSpec {
  if (value instanceof Promise) {
    throw new Error("expected synchronous AuthorizationSpec");
  }
  return value;
}

describe("RC5.4 PolicyResource population from payloads", () => {
  it("sales opportunity authorize populates owner, organization, and attributes", () => {
    const handler = createCreateOpportunityHandler(
      {} as unknown as SalesHandlerDeps,
    );
    const spec = asSpec(
      handler.authorize!(
        {
          payload: {
            companyId: "company-1",
            title: "Deal",
            salesRepUserId: "rep-1",
            organizationId: "org-9",
            customerId: "cust-1",
            projectId: "proj-1",
            territoryId: "terr-1",
          },
        } as never,
        {} as never,
      ),
    );
    assert.equal(spec.resource.companyId, "company-1");
    assert.equal(spec.resource.ownerUserId, "rep-1");
    assert.equal(spec.resource.organizationId, "org-9");
    assert.equal(spec.resource.branchId, null);
    assert.deepEqual(spec.resource.attributes, {
      customerId: "cust-1",
      projectId: "proj-1",
      territoryId: "terr-1",
    });
  });

  it("inventory warehouse authorize populates branchId", () => {
    const handler = createCreateWarehouseHandler(
      {} as unknown as InventoryHandlerDeps,
    );
    const spec = asSpec(
      handler.authorize!(
        {
          payload: {
            companyId: "company-1",
            name: "Main",
            branchId: "branch-7",
            addressId: "addr-1",
          },
        } as never,
        {} as never,
      ),
    );
    assert.equal(spec.resource.branchId, "branch-7");
    assert.equal(spec.resource.ownerUserId, null);
    assert.deepEqual(spec.resource.attributes, { addressId: "addr-1" });
  });

  it("projects create authorize populates owner and organization", () => {
    const handler = createCreateProjectHandler(
      {} as unknown as ProjectHandlerDeps,
    );
    const spec = asSpec(
      handler.authorize!(
        {
          payload: {
            companyId: "company-1",
            name: "Fit-out",
            ownerUserId: "owner-2",
            organizationId: "org-3",
            customerId: "cust-9",
          },
        } as never,
        {} as never,
      ),
    );
    assert.equal(spec.resource.ownerUserId, "owner-2");
    assert.equal(spec.resource.organizationId, "org-3");
  });

  it("crm lead authorize populates ownerUserId", () => {
    const handler = createCreateLeadHandler({} as unknown as CrmHandlerDeps);
    const spec = asSpec(
      handler.authorize!(
        {
          payload: {
            companyId: "company-1",
            title: "Lead",
            ownerUserId: "owner-crm",
            accountId: "acct-1",
          },
        } as never,
        {} as never,
      ),
    );
    assert.equal(spec.resource.ownerUserId, "owner-crm");
    assert.equal(
      (spec.resource.attributes as { accountId?: string | null }).accountId,
      "acct-1",
    );
  });
});

async function identityWithRole(
  roleCode: string,
): Promise<{
  identity: IdentityFoundation;
  sessionId: string;
  userId: string;
}> {
  const identity = createIdentityFoundation();
  const seeded = await seedRbacCatalog({ store: identity.store });
  assert.ok(seeded.ok);

  const user = activeUser(`user-${roleCode}`);
  await identity.store.saveUser(user);
  const role = await identity.store.getRoleByCode(null, roleCode);
  assert.ok(role);
  const assigned = await identity.rbac.assignRole({
    companyId: user.companyId!,
    userId: user.id,
    roleId: role.id,
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
  return {
    identity,
    sessionId: session.value.sessionId,
    userId: user.id,
  };
}

function uploadRouteDeps(identity: IdentityFoundation): RouteDeps {
  return {
    runtime: {} as RouteDeps["runtime"],
    identity,
    health: {} as RouteDeps["health"],
    uploadRouter: {
      async routeUpload(input) {
        return ok({
          assetId: "asset-1",
          companyId: input.dto.companyId,
          name: input.dto.name,
          status: "draft",
        });
      },
    },
    rateLimit: allowAllRateLimitHook,
    observability: {
      logger: {
        debug() {},
        info() {},
        warn() {},
        error() {},
        fatal() {},
        child() {
          return this;
        },
      },
      metrics: {
        counter() {
          return { add() {} };
        },
        gauge() {
          return { set() {} };
        },
        histogram() {
          return { record() {} };
        },
      },
      tracer: {
        startSpan() {
          return {
            setAttribute() {},
            end() {},
          };
        },
      },
    } as unknown as RouteDeps["observability"],
    versionCatalog: DEFAULT_VERSION_CATALOG,
    startedAt: new Date(),
    startupReady: () => true,
    exposeOpenApi: true,
  };
}

describe("RC5.4 upload Policy enforcement (dam.assets.upload)", () => {
  it("allows upload for admin who holds dam.assets.upload", async () => {
    const { identity, sessionId } = await identityWithRole("admin");
    const route = createUploadRoutes(uploadRouteDeps(identity))[0];
    assert.ok(route);

    const response = await route.handler({
      method: "POST",
      path: ApiPaths.Uploads,
      query: {},
      headers: { authorization: `Bearer ${sessionId}` },
      bodyText: JSON.stringify({
        companyId: "company-1",
        name: "brochure.pdf",
        mimeType: "application/pdf",
        assetType: "document",
      }),
      rawBody: null,
    });

    assert.equal(response.status, 202);
  });

  it("denies upload for sales_manager without dam.assets.upload", async () => {
    const { identity, sessionId } = await identityWithRole("sales_manager");
    const route = createUploadRoutes(uploadRouteDeps(identity))[0];
    assert.ok(route);

    const response = await route.handler({
      method: "POST",
      path: ApiPaths.Uploads,
      query: {},
      headers: { authorization: `Bearer ${sessionId}` },
      bodyText: JSON.stringify({
        companyId: "company-1",
        name: "brochure.pdf",
        mimeType: "application/pdf",
        assetType: "document",
      }),
      rawBody: null,
    });

    assert.equal(response.status, 403);
    const body = JSON.parse(response.body as string) as {
      readonly error: { readonly code: string };
    };
    assert.equal(body.error.code, "permission_missing");
  });

  it("allows upload for editor who holds dam.assets.upload", async () => {
    const { identity, sessionId } = await identityWithRole("editor");
    const route = createUploadRoutes(uploadRouteDeps(identity))[0];
    assert.ok(route);

    const response = await route.handler({
      method: "POST",
      path: ApiPaths.Uploads,
      query: {},
      headers: { authorization: `Bearer ${sessionId}` },
      bodyText: JSON.stringify({
        companyId: "company-1",
        name: "hero.png",
        mimeType: "image/png",
        assetType: "image",
      }),
      rawBody: null,
    });

    assert.equal(response.status, 202);
  });

  it("still rejects company mismatch before Policy evaluation", async () => {
    const { identity, sessionId } = await identityWithRole("admin");
    const route = createUploadRoutes(uploadRouteDeps(identity))[0];
    assert.ok(route);

    const response = await route.handler({
      method: "POST",
      path: ApiPaths.Uploads,
      query: {},
      headers: { authorization: `Bearer ${sessionId}` },
      bodyText: JSON.stringify({
        companyId: "other-company",
        name: "x.pdf",
        mimeType: "application/pdf",
      }),
      rawBody: null,
    });

    assert.equal(response.status, 403);
    const body = JSON.parse(response.body as string) as {
      readonly error: { readonly code: string };
    };
    assert.equal(body.error.code, "company_mismatch");
  });
});

describe("RC5.4 OpenAPI exposure policy", () => {
  it("registers OpenAPI when exposeOpenApi is true", () => {
    const identity = createIdentityFoundation();
    const routes = createAllRoutes({
      ...uploadRouteDeps(identity),
      exposeOpenApi: true,
    });
    assert.ok(
      routes.some(
        (route) =>
          route.method === "GET" && route.path === ApiPaths.OpenApi,
      ),
    );
  });

  it("omits OpenAPI when exposeOpenApi is false", () => {
    const identity = createIdentityFoundation();
    const routes = createAllRoutes({
      ...uploadRouteDeps(identity),
      exposeOpenApi: false,
    });
    assert.ok(
      !routes.some(
        (route) =>
          route.method === "GET" && route.path === ApiPaths.OpenApi,
      ),
    );
  });
});
