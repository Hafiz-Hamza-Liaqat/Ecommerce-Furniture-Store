/**
 * RC9.4.1 — Presentation workspace role resolution.
 * Infers available roles from session permission codes; persists active role locally.
 * Backend Policy Engine remains authoritative for authorization.
 */

import type { WorkspaceRoleId } from "./config";
import { roleById } from "./config";

const ACTIVE_ROLE_KEY = "afh.web.activeWorkspaceRole";
const EXTRA_ROLES_KEY = "afh.web.extraWorkspaceRoles";

function unique(ids: readonly WorkspaceRoleId[]): WorkspaceRoleId[] {
  return [...new Set(ids)];
}

/**
 * Infer workspace roles the UI may offer from effective permission codes.
 * Always includes `buyer` for authenticated users.
 */
export function inferWorkspaceRoles(
  permissionCodes: readonly string[] | null | undefined,
): WorkspaceRoleId[] {
  const roles: WorkspaceRoleId[] = ["buyer"];
  if (!permissionCodes?.length) return roles;

  const codes = permissionCodes.map((c) => c.toLowerCase());
  const has = (prefix: string) => codes.some((c) => c.startsWith(prefix) || c.includes(prefix));

  if (has("platform.administration") || has("security.")) roles.push("admin");
  if (has("sales.") || has("crm.")) roles.push("sales");
  if (has("procurement.")) roles.push("supplier");
  if (has("projects.")) {
    roles.push("architect");
    roles.push("designer");
  }

  return unique(roles);
}

/** Extra roles the user opted into via “Become…” (local until server roles land). */
export function loadExtraWorkspaceRoles(): WorkspaceRoleId[] {
  try {
    const raw = localStorage.getItem(EXTRA_ROLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is WorkspaceRoleId => typeof r === "string");
  } catch {
    return [];
  }
}

export function addExtraWorkspaceRole(role: WorkspaceRoleId): void {
  const next = unique([...loadExtraWorkspaceRoles(), role]);
  localStorage.setItem(EXTRA_ROLES_KEY, JSON.stringify(next));
}

export function loadActiveWorkspaceRole(
  available: readonly WorkspaceRoleId[],
): WorkspaceRoleId {
  try {
    const stored = localStorage.getItem(ACTIVE_ROLE_KEY) as WorkspaceRoleId | null;
    if (stored && available.includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  if (available.includes("admin")) return "admin";
  if (available.includes("sales")) return "sales";
  return available[0] ?? "buyer";
}

export function setActiveWorkspaceRole(role: WorkspaceRoleId): void {
  localStorage.setItem(ACTIVE_ROLE_KEY, role);
}

export function resolveWorkspaceRoles(
  permissionCodes: readonly string[] | null | undefined,
): {
  available: WorkspaceRoleId[];
  active: WorkspaceRoleId;
  badge: string;
  label: string;
} {
  const inferred = inferWorkspaceRoles(permissionCodes);
  const available = unique([...inferred, ...loadExtraWorkspaceRoles()]);
  const active = loadActiveWorkspaceRole(available);
  const meta = roleById(active);
  return {
    available,
    active,
    badge: meta.badge,
    label: meta.label,
  };
}

export function displayFirstName(fullName: string | null | undefined, email: string): string {
  const name = fullName?.trim();
  if (name) return name.split(/\s+/)[0] ?? name;
  const local = email.split("@")[0] ?? "Account";
  return local.charAt(0).toUpperCase() + local.slice(1);
}
