/**
 * Soft portal entry — guests sign in; authenticated users without portal
 * permission land on their role home instead of a hard 403.
 */

import { lazy, Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../../state/session";
import { hasRequiredPermissions } from "../../routes/route-permissions";
import { RouteFallback, EnterpriseError } from "../../components/EnterpriseError";
import { loginUrlForWorkspace, roleHomePath } from "../nav/role-home";
import { resolveWorkspaceRoles } from "../nav/workspace";

const LazyPortalRoutes = lazy(() =>
  import("../../platform/PortalRoutes").then((m) => ({ default: m.PortalRoutes })),
);

const PORTAL_PERMS = ["portal.customer_portal.read"] as const;

export function PortalEntry() {
  const { tokens, permissionCodes, permissionsError, reloadPermissions } = useSession();
  const location = useLocation();

  if (!tokens?.sessionId) {
    return (
      <Navigate
        to={loginUrlForWorkspace(`${location.pathname}${location.search}`)}
        replace
      />
    );
  }

  if (permissionCodes === null) {
    if (permissionsError) {
      return (
        <EnterpriseError
          kind="network"
          title="Could not load your permissions"
          body="The session service is unreachable, so your workspace cannot be shown yet."
          onRetry={reloadPermissions}
          homeHref="/"
        />
      );
    }
    return <RouteFallback />;
  }

  if (!hasRequiredPermissions(PORTAL_PERMS, permissionCodes)) {
    const { active } = resolveWorkspaceRoles(permissionCodes);
    return <Navigate to={roleHomePath(active)} replace />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <LazyPortalRoutes />
    </Suspense>
  );
}
