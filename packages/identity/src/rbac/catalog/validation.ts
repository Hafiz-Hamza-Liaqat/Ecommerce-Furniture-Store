/**
 * RC5.1 permission/role definition validation.
 *
 * Enforces the canonical grammar, approved verb vocabulary, reserved module
 * prefixes, and wildcard prohibition frozen in
 * docs/rc5/13-Authorization-Governance-Specification.md (§1), plus catalog
 * integrity rules (§3.2): uniqueness, complete legacy mapping, parent
 * acyclicity, and valid role-permission references.
 *
 * Validation is definition-time only; it performs no runtime authorization.
 */

import type { CatalogPermissionDefinition } from "./permission-catalog.js";
import type { CatalogRoleDefinition } from "./role-catalog.js";
import type {
  RouteAccessDefinition,
  RoutePermissionDefinition,
} from "./route-permission-catalog.js";

/** Frozen RC5 verb vocabulary (governance spec §1.2). */
export const APPROVED_ACTIONS: ReadonlySet<string> = new Set([
  // CRUD
  "read",
  "create",
  "update",
  "delete",
  // Data movement
  "import",
  "export",
  "upload",
  "download",
  "bulk_update",
  "index",
  "enqueue",
  // Lifecycle
  "submit",
  "approve",
  "reject",
  "cancel",
  "archive",
  "restore",
  "publish",
  "unpublish",
  "issue",
  "close",
  "complete",
  "qualify",
  "convert",
  "revise",
  // Assignment
  "assign",
  "reassign",
  "release",
  "claim",
  "delegate",
  "escalate",
  // Operations
  "execute",
  "run",
  "schedule",
  "reschedule",
  "transition",
  "configure",
  "manage",
  "use",
  // Domain operations retained for compatibility
  "receive",
  "adjust",
  "reserve",
  "record",
  "append",
  "log",
  "transfer",
]);

/** Module prefixes reserved for their owning bounded contexts (§1.3). */
export const RESERVED_MODULE_PREFIXES: ReadonlySet<string> = new Set([
  "executive",
  "sales",
  "procurement",
  "inventory",
  "finance",
  "crm",
  "projects",
  "service",
  "hr",
  "manufacturing",
  "cms",
  "dam",
  "notifications",
  "reporting",
  "search",
  "analytics",
  "ai",
  "platform",
  "identity",
  "portal",
  "integrations",
  "calendar",
  "jobs",
]);

/** Prefixes that must never appear as permission modules (§1.3). */
export const FORBIDDEN_MODULE_PREFIXES: ReadonlySet<string> = new Set([
  "system",
  "internal",
  "root",
  "super_admin",
  "tenant",
  "company",
]);

const SEGMENT_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Validate one canonical permission code against the frozen grammar.
 * Returns an empty array when the code is valid.
 */
export function validatePermissionCode(code: string): readonly string[] {
  const errors: string[] = [];

  if (code.includes("*")) {
    errors.push(`"${code}": wildcards are not supported`);
    return errors;
  }

  const segments = code.split(".");
  if (segments.length !== 3) {
    errors.push(
      `"${code}": must have exactly three dot-separated segments, found ${segments.length}`,
    );
    return errors;
  }

  const [module, resource, action] = segments as [string, string, string];

  for (const [label, segment] of [
    ["module", module],
    ["resource", resource],
    ["action", action],
  ] as const) {
    if (!SEGMENT_PATTERN.test(segment)) {
      errors.push(
        `"${code}": ${label} segment "${segment}" must be lowercase snake_case starting with a letter`,
      );
    }
  }

  if (FORBIDDEN_MODULE_PREFIXES.has(module)) {
    errors.push(`"${code}": module prefix "${module}" is forbidden`);
  } else if (!RESERVED_MODULE_PREFIXES.has(module)) {
    errors.push(`"${code}": module prefix "${module}" is not a reserved module`);
  }

  if (SEGMENT_PATTERN.test(action) && !APPROVED_ACTIONS.has(action)) {
    errors.push(`"${code}": action "${action}" is not an approved verb`);
  }

  return errors;
}

/**
 * Validate the full permission + role catalogs before any seed mutation.
 * Returns all violations; an empty array means the catalog is seedable.
 */
export function validateRbacCatalog(
  permissions: readonly CatalogPermissionDefinition[],
  roles: readonly CatalogRoleDefinition[],
  routePermissions: readonly RoutePermissionDefinition[] = [],
  routeAccess: readonly RouteAccessDefinition[] = [],
): readonly string[] {
  const errors: string[] = [];

  // Permission grammar, module consistency, uniqueness.
  const canonicalCodes = new Set<string>();
  const legacyKeys = new Set<string>();
  for (const permission of permissions) {
    errors.push(...validatePermissionCode(permission.code));

    if (!permission.code.startsWith(`${permission.module}.`)) {
      errors.push(
        `"${permission.code}": declared module "${permission.module}" does not match code prefix`,
      );
    }
    if (canonicalCodes.has(permission.code)) {
      errors.push(`duplicate canonical permission code "${permission.code}"`);
    }
    canonicalCodes.add(permission.code);

    if (permission.legacyKey.includes("*")) {
      errors.push(
        `"${permission.code}": legacy key "${permission.legacyKey}" contains a wildcard`,
      );
    }
    if (legacyKeys.has(permission.legacyKey)) {
      errors.push(
        `legacy action key "${permission.legacyKey}" is mapped more than once`,
      );
    }
    legacyKeys.add(permission.legacyKey);
  }

  for (const permission of routePermissions) {
    errors.push(...validatePermissionCode(permission.code));
    if (!permission.code.startsWith(`${permission.module}.`)) {
      errors.push(
        `"${permission.code}": declared module "${permission.module}" does not match code prefix`,
      );
    }
    if (canonicalCodes.has(permission.code)) {
      errors.push(`duplicate canonical permission code "${permission.code}"`);
    }
    canonicalCodes.add(permission.code);
  }

  const routeKeys = new Set<string>();
  for (const route of routeAccess) {
    const key = `${route.match}:${route.path}`;
    if (routeKeys.has(key)) {
      errors.push(`duplicate route access definition "${key}"`);
    }
    routeKeys.add(key);
    if (!route.path.startsWith("/")) {
      errors.push(`route path "${route.path}" must start with "/"`);
    }
    for (const code of route.requiredPermissions) {
      if (!canonicalCodes.has(code)) {
        errors.push(
          `route "${route.path}": permission "${code}" is not in the canonical catalog`,
        );
      }
    }
  }

  // Role code uniqueness and grammar.
  const roleCodes = new Set<string>();
  for (const role of roles) {
    if (!SEGMENT_PATTERN.test(role.code)) {
      errors.push(
        `role "${role.code}": code must be lowercase snake_case starting with a letter`,
      );
    }
    if (roleCodes.has(role.code)) {
      errors.push(`duplicate system role code "${role.code}"`);
    }
    roleCodes.add(role.code);
  }

  // Parent references and acyclicity (single-parent hierarchy).
  for (const role of roles) {
    if (role.parentCode !== null && !roleCodes.has(role.parentCode)) {
      errors.push(
        `role "${role.code}": parent "${role.parentCode}" is not a catalog role`,
      );
    }
  }
  const parentByCode = new Map(roles.map((r) => [r.code, r.parentCode]));
  for (const role of roles) {
    const seen = new Set<string>([role.code]);
    let current = role.parentCode;
    while (current !== null && current !== undefined) {
      if (seen.has(current)) {
        errors.push(`role hierarchy cycle detected at "${role.code}"`);
        break;
      }
      seen.add(current);
      current = parentByCode.get(current) ?? null;
    }
  }

  // Role-permission references must be canonical catalog codes.
  for (const role of roles) {
    const granted = new Set<string>();
    for (const code of role.permissions) {
      if (code.includes("*")) {
        errors.push(`role "${role.code}": wildcard grant "${code}" is forbidden`);
        continue;
      }
      if (!canonicalCodes.has(code)) {
        errors.push(
          `role "${role.code}": permission "${code}" is not in the canonical catalog`,
        );
      }
      if (granted.has(code)) {
        errors.push(`role "${role.code}": duplicate grant "${code}"`);
      }
      granted.add(code);
    }
  }

  return errors;
}
