/**
 * RC5.2 declarative route-permission metadata (presentation mirror).
 *
 * Mirrors the frozen identity route-access catalog
 * (`packages/identity/src/rbac/catalog/route-permission-catalog.ts`,
 * `ROUTE_ACCESS_CATALOG` @ rc5.route-permissions.v1) exactly, following the
 * established presentation-mirror convention (see `api/types.ts`). A sync test
 * asserts this file matches the identity catalog entry-for-entry.
 *
 * Frontend authorization is presentation only. The backend Policy Engine
 * remains the sole authoritative authorizer; a crafted URL that bypasses this
 * metadata still cannot read data because the API enforces Policy.
 */

export const ROUTE_PERMISSION_CATALOG_VERSION = "rc5.route-permissions.v1";

export type RouteAccessDefinition = {
  readonly path: string;
  readonly match: "exact" | "prefix";
  readonly requiredPermissions: readonly string[];
};

/**
 * Ordered catalog: specific child routes precede broader prefixes so the
 * first match is always the most specific. Empty `requiredPermissions`
 * means authentication-only (existing RequireAuth behavior).
 */
export const ROUTE_ACCESS_CATALOG: readonly RouteAccessDefinition[] = [
  {
    path: "/app/analytics/builder",
    match: "exact",
    requiredPermissions: [
      "analytics.dashboards.read",
      "analytics.dashboards.configure",
    ],
  },
  {
    path: "/app/ai/usage",
    match: "exact",
    requiredPermissions: ["ai.assistant.use", "ai.usage.read"],
  },
  {
    path: "/app/platform/deployment",
    match: "exact",
    requiredPermissions: ["platform.operations.read", "platform.health.read"],
  },
  {
    path: "/app",
    match: "exact",
    requiredPermissions: ["executive.dashboard.read"],
  },
  { path: "/app/me", match: "exact", requiredPermissions: [] },
  {
    path: "/app/calendar",
    match: "exact",
    requiredPermissions: ["calendar.events.read"],
  },
  { path: "/app/preferences", match: "exact", requiredPermissions: [] },
  {
    path: "/app/analytics",
    match: "prefix",
    requiredPermissions: ["analytics.dashboards.read"],
  },
  {
    path: "/app/reports",
    match: "prefix",
    requiredPermissions: ["reporting.reports.read"],
  },
  {
    path: "/app/insights",
    match: "exact",
    requiredPermissions: ["analytics.insights.read"],
  },
  {
    path: "/app/ai",
    match: "prefix",
    requiredPermissions: ["ai.assistant.use"],
  },
  {
    path: "/app/settings/ai",
    match: "exact",
    requiredPermissions: ["ai.settings.manage"],
  },
  {
    path: "/app/integrations",
    match: "prefix",
    requiredPermissions: ["integrations.catalog.read"],
  },
  {
    path: "/app/platform",
    match: "prefix",
    requiredPermissions: ["platform.operations.read"],
  },
  {
    path: "/app/sales",
    match: "prefix",
    requiredPermissions: ["sales.dashboard.read"],
  },
  {
    path: "/app/procurement",
    match: "prefix",
    requiredPermissions: ["procurement.dashboard.read"],
  },
  {
    path: "/app/inventory",
    match: "prefix",
    requiredPermissions: ["inventory.dashboard.read"],
  },
  {
    path: "/app/finance",
    match: "prefix",
    requiredPermissions: ["finance.dashboard.read"],
  },
  {
    path: "/app/projects",
    match: "prefix",
    requiredPermissions: ["projects.dashboard.read"],
  },
  {
    path: "/app/crm",
    match: "prefix",
    requiredPermissions: ["crm.dashboard.read"],
  },
  {
    path: "/app/service",
    match: "prefix",
    requiredPermissions: ["service.dashboard.read"],
  },
  {
    path: "/app/hr",
    match: "prefix",
    requiredPermissions: ["hr.dashboard.read"],
  },
  {
    path: "/app/manufacturing",
    match: "prefix",
    requiredPermissions: ["manufacturing.dashboard.read"],
  },
  {
    path: "/app/cms",
    match: "prefix",
    requiredPermissions: ["cms.dashboard.read"],
  },
  {
    path: "/app/dam",
    match: "prefix",
    requiredPermissions: ["dam.dashboard.read"],
  },
  {
    path: "/app/notifications",
    match: "prefix",
    requiredPermissions: ["notifications.dashboard.read"],
  },
  {
    path: "/app/search",
    match: "prefix",
    requiredPermissions: ["search.dashboard.read"],
  },
  {
    path: "/app/reporting",
    match: "prefix",
    requiredPermissions: ["reporting.dashboard.read"],
  },
  {
    path: "/app/workflow",
    match: "exact",
    requiredPermissions: ["platform.workflows.read"],
  },
  {
    path: "/app/approvals",
    match: "exact",
    requiredPermissions: ["platform.approvals.read"],
  },
  {
    path: "/app/account/email-verification",
    match: "exact",
    requiredPermissions: [],
  },
  { path: "/app/account/mfa", match: "exact", requiredPermissions: [] },
  { path: "/app/account/security", match: "exact", requiredPermissions: [] },
  {
    path: "/portal",
    match: "prefix",
    requiredPermissions: ["portal.customer_portal.read"],
  },
  {
    path: "/admin/platform",
    match: "prefix",
    requiredPermissions: ["platform.administration.read"],
  },
];

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * Resolve the route-access definition for a concrete pathname. First match
 * wins; the catalog orders specific children before broader prefixes.
 * Returns null for routes not covered by the frozen matrix (auth-only).
 */
export function findRouteAccess(
  pathname: string,
): RouteAccessDefinition | null {
  const path = normalizePathname(pathname);
  for (const entry of ROUTE_ACCESS_CATALOG) {
    if (entry.match === "exact") {
      if (path === entry.path) {
        return entry;
      }
      continue;
    }
    if (path === entry.path || path.startsWith(`${entry.path}/`)) {
      return entry;
    }
  }
  return null;
}

/** Required canonical permission codes for a pathname ([] = auth-only). */
export function requiredPermissionsFor(pathname: string): readonly string[] {
  return findRouteAccess(pathname)?.requiredPermissions ?? [];
}

/** True when the session grants every required code (AND semantics). */
export function hasRequiredPermissions(
  required: readonly string[],
  granted: readonly string[],
): boolean {
  return required.every((code) => granted.includes(code));
}

const GUARD_STORAGE_KEY = "afh.web.routeGuard";

/**
 * RC5.2 rollout feature flag. Permission-aware routing is enabled by default
 * and can be disabled by setting `VITE_ROUTE_PERMISSION_GUARD=0` at build
 * time, or `localStorage["afh.web.routeGuard"] = "0"` at runtime (a "1"
 * override re-enables it regardless of the build flag). When disabled, route
 * protection reverts to the pre-RC5.2 session-only behavior.
 */
export function isRoutePermissionGuardEnabled(): boolean {
  try {
    const override = localStorage.getItem(GUARD_STORAGE_KEY);
    if (override === "0") {
      return false;
    }
    if (override === "1") {
      return true;
    }
  } catch {
    // localStorage unavailable — fall through to the build-time flag.
  }
  const env = (import.meta.env?.VITE_ROUTE_PERMISSION_GUARD ?? "") as string;
  return env !== "0" && env !== "false";
}
