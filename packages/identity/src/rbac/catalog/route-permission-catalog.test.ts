import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_CANONICAL_PERMISSION_CODES, API_PERMISSION_DEFINITIONS, PERMISSION_CATALOG, PLATFORM_PERMISSION_DEFINITIONS } from "./permission-catalog.js";
import {
  ROUTE_ACCESS_CATALOG,
  ROUTE_PERMISSION_CATALOG_VERSION,
  ROUTE_PERMISSION_CODES,
  ROUTE_PERMISSION_DEFINITIONS,
  RoutePermissions,
} from "./route-permission-catalog.js";
import { validatePermissionCode, validateRbacCatalog } from "./validation.js";
import { ROLE_CATALOG } from "./role-catalog.js";

describe("RC5.2 prerequisite route-permission catalog", () => {
  it("has an independent version", () => {
    assert.equal(
      ROUTE_PERMISSION_CATALOG_VERSION,
      "rc5.route-permissions.v1",
    );
  });

  it("defines 30 unique canonical route permissions", () => {
    assert.equal(ROUTE_PERMISSION_DEFINITIONS.length, 30);
    assert.equal(new Set(ROUTE_PERMISSION_CODES).size, 30);
  });

  it("uses only valid canonical permission names", () => {
    for (const definition of ROUTE_PERMISSION_DEFINITIONS) {
      assert.deepEqual(
        validatePermissionCode(definition.code),
        [],
        definition.code,
      );
      assert.equal(definition.code.split(".")[0], definition.module);
    }
  });

  it("contains every permission required by route metadata", () => {
    const canonical = new Set(ALL_CANONICAL_PERMISSION_CODES);
    for (const route of ROUTE_ACCESS_CATALOG) {
      for (const code of route.requiredPermissions) {
        assert.ok(canonical.has(code), `${route.path}: unknown ${code}`);
      }
    }
  });

  it("has no duplicate path/match definitions", () => {
    const keys = ROUTE_ACCESS_CATALOG.map(
      (route) => `${route.match}:${route.path}`,
    );
    assert.equal(new Set(keys).size, keys.length);
  });

  it("covers all 30 permission-bearing App route surfaces", () => {
    const permissionBearing = ROUTE_ACCESS_CATALOG.filter(
      (route) => route.requiredPermissions.length > 0,
    );
    assert.equal(permissionBearing.length, 30);
  });

  it("keeps documented authentication-only routes permission-free", () => {
    const authOnly = new Set([
      "/app/me",
      "/app/preferences",
      "/app/account/email-verification",
      "/app/account/mfa",
      "/app/account/security",
    ]);
    for (const route of ROUTE_ACCESS_CATALOG) {
      if (authOnly.has(route.path)) {
        assert.deepEqual(route.requiredPermissions, []);
      }
    }
    assert.equal(authOnly.size, 5);
  });

  it("adds stricter metadata for documented child routes", () => {
    const byPath = new Map(
      ROUTE_ACCESS_CATALOG.map((route) => [route.path, route]),
    );
    assert.deepEqual(byPath.get("/app/analytics/builder")?.requiredPermissions, [
      RoutePermissions.AnalyticsDashboardsRead,
      RoutePermissions.AnalyticsDashboardsConfigure,
    ]);
    assert.deepEqual(byPath.get("/app/ai/usage")?.requiredPermissions, [
      RoutePermissions.AiAssistantUse,
      RoutePermissions.AiUsageRead,
    ]);
    assert.deepEqual(
      byPath.get("/app/platform/deployment")?.requiredPermissions,
      [
        RoutePermissions.PlatformOperationsRead,
        RoutePermissions.PlatformHealthRead,
      ],
    );
  });

  it("passes complete RBAC and route catalog validation", () => {
    assert.deepEqual(
      validateRbacCatalog(
        [
          ...PERMISSION_CATALOG,
          ...PLATFORM_PERMISSION_DEFINITIONS,
          ...API_PERMISSION_DEFINITIONS,
        ],
        ROLE_CATALOG,
        ROUTE_PERMISSION_DEFINITIONS,
        ROUTE_ACCESS_CATALOG,
      ),
      [],
    );
  });
});
