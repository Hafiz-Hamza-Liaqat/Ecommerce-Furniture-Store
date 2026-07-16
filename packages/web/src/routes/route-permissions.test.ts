/**
 * RC5.2 route-permission metadata tests — catalog sync with the frozen
 * identity route-access catalog, pathname matching (including direct URL
 * deep links), AND-permission semantics, and the rollout feature flag.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  ROUTE_ACCESS_CATALOG as IDENTITY_ROUTE_ACCESS_CATALOG,
  ROUTE_PERMISSION_CATALOG_VERSION as IDENTITY_ROUTE_PERMISSION_CATALOG_VERSION,
} from "../../../identity/dist/rbac/catalog/route-permission-catalog.js";
import {
  findRouteAccess,
  hasRequiredPermissions,
  isRoutePermissionGuardEnabled,
  requiredPermissionsFor,
  ROUTE_ACCESS_CATALOG,
  ROUTE_PERMISSION_CATALOG_VERSION,
} from "./route-permissions";

describe("catalog sync with frozen identity route-access catalog", () => {
  it("mirrors the identity catalog version", () => {
    expect(ROUTE_PERMISSION_CATALOG_VERSION).toBe(
      IDENTITY_ROUTE_PERMISSION_CATALOG_VERSION,
    );
  });

  it("mirrors every identity route-access entry exactly and in order", () => {
    expect(ROUTE_ACCESS_CATALOG).toEqual(IDENTITY_ROUTE_ACCESS_CATALOG);
  });
});

describe("findRouteAccess pathname matching", () => {
  it("matches exact routes only on the exact pathname", () => {
    expect(findRouteAccess("/app")?.requiredPermissions).toEqual([
      "executive.dashboard.read",
    ]);
    expect(findRouteAccess("/app/workflow")?.requiredPermissions).toEqual([
      "platform.workflows.read",
    ]);
  });

  it("matches prefix routes for nested direct URLs", () => {
    expect(
      findRouteAccess("/app/finance/invoices/inv-1/edit")?.requiredPermissions,
    ).toEqual(["finance.dashboard.read"]);
    expect(findRouteAccess("/portal/orders")?.requiredPermissions).toEqual([
      "portal.customer_portal.read",
    ]);
    expect(
      findRouteAccess("/admin/platform/tenants")?.requiredPermissions,
    ).toEqual(["platform.administration.read"]);
  });

  it("prefers specific children over broader prefixes", () => {
    expect(
      findRouteAccess("/app/analytics/builder")?.requiredPermissions,
    ).toEqual(["analytics.dashboards.read", "analytics.dashboards.configure"]);
    expect(findRouteAccess("/app/ai/usage")?.requiredPermissions).toEqual([
      "ai.assistant.use",
      "ai.usage.read",
    ]);
    expect(
      findRouteAccess("/app/platform/deployment")?.requiredPermissions,
    ).toEqual(["platform.operations.read", "platform.health.read"]);
  });

  it("keeps documented authentication-only routes permission-free", () => {
    for (const path of [
      "/app/me",
      "/app/preferences",
      "/app/account/email-verification",
      "/app/account/mfa",
      "/app/account/security",
    ]) {
      expect(requiredPermissionsFor(path)).toEqual([]);
    }
  });

  it("returns null for routes outside the frozen matrix", () => {
    expect(findRouteAccess("/login")).toBeNull();
    expect(findRouteAccess("/products")).toBeNull();
    expect(requiredPermissionsFor("/register")).toEqual([]);
  });

  it("normalizes trailing slashes", () => {
    expect(findRouteAccess("/app/sales/")?.requiredPermissions).toEqual([
      "sales.dashboard.read",
    ]);
  });

  it("does not match sibling paths sharing a prefix string", () => {
    expect(findRouteAccess("/app/salesforce")).toBeNull();
  });
});

describe("hasRequiredPermissions", () => {
  it("requires every code (AND semantics, consistent with Policy)", () => {
    expect(
      hasRequiredPermissions(
        ["analytics.dashboards.read", "analytics.dashboards.configure"],
        ["analytics.dashboards.read"],
      ),
    ).toBe(false);
    expect(
      hasRequiredPermissions(
        ["analytics.dashboards.read", "analytics.dashboards.configure"],
        [
          "analytics.dashboards.read",
          "analytics.dashboards.configure",
          "sales.dashboard.read",
        ],
      ),
    ).toBe(true);
    expect(hasRequiredPermissions([], [])).toBe(true);
  });
});

describe("isRoutePermissionGuardEnabled feature flag", () => {
  afterEach(() => {
    localStorage.removeItem("afh.web.routeGuard");
  });

  it("is enabled by default", () => {
    expect(isRoutePermissionGuardEnabled()).toBe(true);
  });

  it("can be disabled at runtime for rollout", () => {
    localStorage.setItem("afh.web.routeGuard", "0");
    expect(isRoutePermissionGuardEnabled()).toBe(false);
  });

  it("can be force-enabled at runtime", () => {
    localStorage.setItem("afh.web.routeGuard", "1");
    expect(isRoutePermissionGuardEnabled()).toBe(true);
  });
});
