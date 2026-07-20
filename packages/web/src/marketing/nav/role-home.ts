/**
 * RC9.4.1 — Role home paths after login / portal soft-landing.
 * Presentation routing only; Policy remains authoritative on APIs.
 */

import type { WorkspaceRoleId } from "./config";
import { loadActiveWorkspaceRole, resolveWorkspaceRoles } from "./workspace";

/** Safe internal path for post-login redirects. */
export function sanitizeReturnUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  if (value.startsWith("/login") || value.startsWith("/register")) {
    return null;
  }
  return value;
}

export function roleHomePath(role: WorkspaceRoleId): string {
  switch (role) {
    case "admin":
      return "/app";
    case "sales":
      return "/app/crm";
    case "architect":
    case "civil":
      return "/projects";
    case "designer":
      return "/my-projects";
    case "supplier":
      return "/portal";
    case "buyer":
    default:
      return "/my-projects";
  }
}

/** Resolve post-login destination from permissions + optional returnUrl. */
export function resolvePostLoginPath(
  permissionCodes: readonly string[] | null | undefined,
  returnUrl?: string | null,
): string {
  const safe = sanitizeReturnUrl(returnUrl);
  if (safe && safe !== "/portal" && safe !== "/portal/") {
    return safe;
  }
  const { active } = resolveWorkspaceRoles(permissionCodes);
  // Portal entry: send users with portal permission into portal; others to role home.
  if (safe === "/portal" || safe === "/portal/") {
    if (permissionCodes?.includes("portal.customer_portal.read")) {
      return "/portal";
    }
    return roleHomePath(active);
  }
  return roleHomePath(active);
}

export function currentRoleHome(
  permissionCodes: readonly string[] | null | undefined,
): string {
  const resolved = resolveWorkspaceRoles(permissionCodes);
  return roleHomePath(loadActiveWorkspaceRole(resolved.available));
}

export function loginUrlForWorkspace(returnPath = "/portal"): string {
  const params = new URLSearchParams({
    returnUrl: returnPath,
    reason: "workspace",
  });
  return `/login?${params.toString()}`;
}
