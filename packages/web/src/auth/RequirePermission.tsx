/**
 * RC5.2 presentation-only route permission guards.
 *
 * These components gate rendering using the effective canonical permission
 * codes exposed by the existing authenticated session endpoint. They make no
 * authorization decisions of their own: the backend Policy Engine remains the
 * sole authoritative authorizer, and every API call is still Policy-checked.
 * Authentication is unchanged — RequireAuth (session presence) runs first.
 */

import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { EnterpriseError, RouteFallback } from "../components/EnterpriseError";
import {
  hasRequiredPermissions,
  isRoutePermissionGuardEnabled,
  requiredPermissionsFor,
} from "../routes/route-permissions";
import { useSession } from "../state/session";

/**
 * Forbidden experience for authenticated users lacking a required permission.
 */
export function ForbiddenRoute() {
  return <EnterpriseError kind="forbidden" homeHref="/app/me" />;
}

/**
 * Reusable permission gate. Renders children only when the authenticated
 * session grants every code in `required` (AND semantics — consistent with
 * backend Policy, which requires each permission on its own operation).
 *
 * States:
 * - guard flag disabled → render children (pre-RC5.2 session-only behavior);
 * - `required` empty → render children (authentication-only route);
 * - permission codes still resolving → loading fallback (never a false deny);
 * - codes resolved and incomplete → Forbidden experience.
 */
export function RequirePermission({
  required,
  children,
}: {
  readonly required: readonly string[];
  readonly children: ReactNode;
}) {
  const { permissionCodes } = useSession();
  if (!isRoutePermissionGuardEnabled() || required.length === 0) {
    return children;
  }
  if (permissionCodes === null) {
    return <RouteFallback />;
  }
  if (!hasRequiredPermissions(required, permissionCodes)) {
    return <ForbiddenRoute />;
  }
  return children;
}

/**
 * Layout-route guard driven by the declarative route-permission catalog.
 * Resolves the current pathname (including direct URL entry and nested
 * wildcard children such as /app/analytics/builder) to its documented
 * required permissions and delegates to RequirePermission.
 */
export function RequireRoutePermission() {
  const location = useLocation();
  return (
    <RequirePermission required={requiredPermissionsFor(location.pathname)}>
      <Outlet />
    </RequirePermission>
  );
}

/**
 * Element wrapper variant for routes mounted outside the /app layout tree
 * (/portal/*, /admin/platform/*). Same catalog-driven semantics.
 */
export function RequireRoutePermissionElement({
  children,
}: {
  readonly children: ReactNode;
}) {
  const location = useLocation();
  return (
    <RequirePermission required={requiredPermissionsFor(location.pathname)}>
      {children}
    </RequirePermission>
  );
}
