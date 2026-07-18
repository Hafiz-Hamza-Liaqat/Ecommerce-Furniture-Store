/**
 * RC5.1 idempotent RBAC catalog seed (versioned).
 *
 * Frozen behavior (docs/rc5/13-Authorization-Governance-Specification.md §1.6, §3.2):
 * - Validates the catalog before any mutation and fails closed.
 * - Upserts by stable code; never depends on generated ids; safely rerunnable.
 * - Seeds one canonical permission record per capability plus a compatibility
 *   permission record for every legacy executable action key that differs
 *   from its canonical code, so current handlers keep working unchanged.
 * - Grants each role its canonical permissions and the matching legacy
 *   compatibility permissions, keeping the Policy Engine's exact
 *   `permissionCodes.includes(action)` check satisfied for legacy keys.
 * - Never touches user assignments or tenant custom roles.
 * - Records a seed audit event with version, checksum, and counts.
 *
 * This module changes no runtime authorization behavior: it defines data only.
 */

import { createHash } from "node:crypto";
import { ValidationError, fail, ok, type Result } from "@afh/shared-kernel";
import type { SecurityAuditService } from "../../audit/security-audit.js";
import type {
  PermissionRecord,
  RolePermissionRecord,
  RoleRecord,
} from "../../models/models.js";
import type { IdentityStore } from "../../stores/identity-store.js";
import { newId } from "../../util/ids.js";
import {
  API_PERMISSION_DEFINITIONS,
  PERMISSION_CATALOG,
  PLATFORM_PERMISSION_DEFINITIONS,
  RBAC_CATALOG_VERSION,
  type CatalogPermissionDefinition,
} from "./permission-catalog.js";
import { ROLE_CATALOG, type CatalogRoleDefinition } from "./role-catalog.js";
import {
  ROUTE_ACCESS_CATALOG,
  ROUTE_PERMISSION_DEFINITIONS,
} from "./route-permission-catalog.js";
import { validateRbacCatalog } from "./validation.js";

export type SeedCounts = {
  readonly created: number;
  readonly existing: number;
};

export type RbacCatalogSeedReport = {
  readonly catalogVersion: string;
  readonly checksum: string;
  readonly canonicalPermissions: SeedCounts;
  readonly platformPermissions: SeedCounts;
  readonly apiPermissions: SeedCounts;
  readonly routePermissions: SeedCounts;
  readonly legacyCompatibilityPermissions: SeedCounts;
  readonly systemRoles: SeedCounts;
  readonly rolePermissionLinks: SeedCounts;
  readonly legacyMappingCount: number;
};

export type SeedRbacCatalogDependencies = {
  readonly store: IdentityStore;
  readonly audit?: SecurityAuditService;
  readonly actorUserId?: string | null;
};

/** Deterministic checksum over the frozen catalog definitions. */
export function computeCatalogChecksum(
  permissions: readonly CatalogPermissionDefinition[] = PERMISSION_CATALOG,
  roles: readonly CatalogRoleDefinition[] = ROLE_CATALOG,
): string {
  const payload = JSON.stringify({
    version: RBAC_CATALOG_VERSION,
    permissions: permissions.map((p) => ({
      code: p.code,
      module: p.module,
      legacyKey: p.legacyKey,
    })),
    platformPermissions: PLATFORM_PERMISSION_DEFINITIONS.map((p) => ({
      code: p.code,
      module: p.module,
      legacyKey: p.legacyKey,
    })),
    apiPermissions: API_PERMISSION_DEFINITIONS.map((p) => ({
      code: p.code,
      module: p.module,
      legacyKey: p.legacyKey,
    })),
    routePermissions: ROUTE_PERMISSION_DEFINITIONS.map((p) => ({
      code: p.code,
      module: p.module,
    })),
    routeAccess: ROUTE_ACCESS_CATALOG,
    roles: roles.map((r) => ({
      code: r.code,
      parentCode: r.parentCode,
      permissions: [...r.permissions].sort(),
    })),
  });
  return createHash("sha256").update(payload).digest("hex");
}

function orderRolesParentsFirst(
  roles: readonly CatalogRoleDefinition[],
): readonly CatalogRoleDefinition[] {
  const byCode = new Map(roles.map((r) => [r.code, r]));
  const ordered: CatalogRoleDefinition[] = [];
  const placed = new Set<string>();

  const place = (role: CatalogRoleDefinition): void => {
    if (placed.has(role.code)) {
      return;
    }
    // Cycles are rejected by validation before this runs.
    if (role.parentCode !== null) {
      const parent = byCode.get(role.parentCode);
      if (parent !== undefined) {
        place(parent);
      }
    }
    placed.add(role.code);
    ordered.push(role);
  };

  for (const role of roles) {
    place(role);
  }
  return ordered;
}

/**
 * Idempotently seed the RC5.1 canonical permission catalog, legacy
 * compatibility permissions, 33 immutable system roles, and role-permission
 * links. Rerunning against an already-seeded store creates nothing.
 */
export async function seedRbacCatalog(
  deps: SeedRbacCatalogDependencies,
): Promise<Result<RbacCatalogSeedReport>> {
  const { store, audit, actorUserId = null } = deps;

  const violations = validateRbacCatalog(
    [
      ...PERMISSION_CATALOG,
      ...PLATFORM_PERMISSION_DEFINITIONS,
      ...API_PERMISSION_DEFINITIONS,
    ],
    ROLE_CATALOG,
    ROUTE_PERMISSION_DEFINITIONS,
    ROUTE_ACCESS_CATALOG,
  );
  if (violations.length > 0) {
    if (audit) {
      await audit.record({
        companyId: null,
        actorUserId,
        action: "rbac.catalog_seed_rejected",
        entityType: "rbac_catalog",
        entityId: RBAC_CATALOG_VERSION,
        outcome: "failure",
        details: { catalogVersion: RBAC_CATALOG_VERSION, violations },
      });
    }
    return fail(
      new ValidationError("RBAC catalog validation failed; seed aborted", {
        code: "identity.rbac_catalog_invalid",
        details: { catalogVersion: RBAC_CATALOG_VERSION, violations },
      }),
    );
  }

  const checksum = computeCatalogChecksum();

  // 1. Canonical CQRS permissions, API-route permissions, then legacy compatibility.
  const canonical: SeedCounts & { created: number; existing: number } = {
    created: 0,
    existing: 0,
  };
  const platform: SeedCounts & { created: number; existing: number } = {
    created: 0,
    existing: 0,
  };
  const api: SeedCounts & { created: number; existing: number } = {
    created: 0,
    existing: 0,
  };
  const compat: SeedCounts & { created: number; existing: number } = {
    created: 0,
    existing: 0,
  };
  const route: SeedCounts & { created: number; existing: number } = {
    created: 0,
    existing: 0,
  };
  const permissionIdByCode = new Map<string, string>();

  const upsertPermission = async (
    code: string,
    module: string,
    description: string,
    bucket: { created: number; existing: number },
  ): Promise<void> => {
    const found = await store.getPermissionByCode(code);
    if (found !== null) {
      permissionIdByCode.set(code, found.id);
      bucket.existing += 1;
      return;
    }
    const record: PermissionRecord = {
      id: newId("perm"),
      code,
      module,
      description,
    };
    await store.savePermission(record);
    permissionIdByCode.set(code, record.id);
    bucket.created += 1;
  };

  for (const permission of PERMISSION_CATALOG) {
    await upsertPermission(
      permission.code,
      permission.module,
      `${permission.description} (${RBAC_CATALOG_VERSION})`,
      canonical,
    );
  }
  for (const permission of PLATFORM_PERMISSION_DEFINITIONS) {
    await upsertPermission(
      permission.code,
      permission.module,
      `${permission.description} (${RBAC_CATALOG_VERSION})`,
      platform,
    );
  }
  for (const permission of API_PERMISSION_DEFINITIONS) {
    await upsertPermission(
      permission.code,
      permission.module,
      `${permission.description} (${RBAC_CATALOG_VERSION})`,
      api,
    );
  }
  for (const permission of ROUTE_PERMISSION_DEFINITIONS) {
    await upsertPermission(
      permission.code,
      permission.module,
      `${permission.description} (${RBAC_CATALOG_VERSION}; inactive until RC5.2)`,
      route,
    );
  }
  for (const permission of PERMISSION_CATALOG) {
    if (permission.legacyKey === permission.code) {
      continue;
    }
    await upsertPermission(
      permission.legacyKey,
      permission.module,
      `Legacy executable action key mapped to ${permission.code} (${RBAC_CATALOG_VERSION})`,
      compat,
    );
  }

  // 2. System roles (parents before children), then role-permission links.
  const roleCounts = { created: 0, existing: 0 };
  const roleIdByCode = new Map<string, string>();

  for (const role of orderRolesParentsFirst(ROLE_CATALOG)) {
    const parentRoleId =
      role.parentCode !== null
        ? (roleIdByCode.get(role.parentCode) ?? null)
        : null;
    const found = await store.getRoleByCode(null, role.code);
    if (found !== null) {
      roleIdByCode.set(role.code, found.id);
      if (
        found.parentRoleId !== parentRoleId ||
        found.name !== role.name ||
        !found.isSystem
      ) {
        await store.saveRole({
          ...found,
          name: role.name,
          isSystem: true,
          parentRoleId,
        });
      }
      roleCounts.existing += 1;
      continue;
    }
    const record: RoleRecord = {
      id: newId("role"),
      companyId: null,
      code: role.code,
      name: role.name,
      isSystem: true,
      parentRoleId,
    };
    await store.saveRole(record);
    roleIdByCode.set(role.code, record.id);
    roleCounts.created += 1;
  }

  const linkCounts = { created: 0, existing: 0 };
  const legacyByCanonical = new Map(
    PERMISSION_CATALOG.map((p) => [p.code, p.legacyKey]),
  );

  for (const role of ROLE_CATALOG) {
    const roleId = roleIdByCode.get(role.code);
    if (roleId === undefined) {
      continue;
    }
    const existingLinks = await store.listRolePermissions(roleId);
    const linkedPermissionIds = new Set(
      existingLinks.map((link) => link.permissionId),
    );

    // Effective grant set = canonical codes + differing legacy compat codes.
    const grantCodes = new Set<string>();
    for (const code of role.permissions) {
      grantCodes.add(code);
      const legacyKey = legacyByCanonical.get(code);
      if (legacyKey !== undefined && legacyKey !== code) {
        grantCodes.add(legacyKey);
      }
    }

    for (const code of grantCodes) {
      const permissionId = permissionIdByCode.get(code);
      if (permissionId === undefined) {
        continue;
      }
      if (linkedPermissionIds.has(permissionId)) {
        linkCounts.existing += 1;
        continue;
      }
      const link: RolePermissionRecord = { roleId, permissionId };
      await store.saveRolePermission(link);
      linkedPermissionIds.add(permissionId);
      linkCounts.created += 1;
    }
  }

  const report: RbacCatalogSeedReport = {
    catalogVersion: RBAC_CATALOG_VERSION,
    checksum,
    canonicalPermissions: canonical,
    platformPermissions: platform,
    apiPermissions: api,
    routePermissions: route,
    legacyCompatibilityPermissions: compat,
    systemRoles: roleCounts,
    rolePermissionLinks: linkCounts,
    legacyMappingCount: PERMISSION_CATALOG.length,
  };

  if (audit) {
    await audit.record({
      companyId: null,
      actorUserId,
      action: "rbac.catalog_seeded",
      entityType: "rbac_catalog",
      entityId: RBAC_CATALOG_VERSION,
      outcome: "success",
      details: { ...report },
    });
  }

  return ok(report);
}
