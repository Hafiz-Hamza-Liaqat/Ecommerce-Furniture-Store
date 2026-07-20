/**
 * Auth-only workspace router — sends signed-in users to their role home.
 */

import { Navigate } from "react-router-dom";
import { useSession } from "../../state/session";
import { RouteFallback } from "../../components/EnterpriseError";
import { currentRoleHome, loginUrlForWorkspace } from "../nav/role-home";

export function WorkspaceRedirectPage() {
  const { tokens, permissionCodes, permissionsError } = useSession();

  if (!tokens?.sessionId) {
    return <Navigate to={loginUrlForWorkspace("/workspace")} replace />;
  }

  if (permissionCodes === null && !permissionsError) {
    return <RouteFallback />;
  }

  return <Navigate to={currentRoleHome(permissionCodes)} replace />;
}
