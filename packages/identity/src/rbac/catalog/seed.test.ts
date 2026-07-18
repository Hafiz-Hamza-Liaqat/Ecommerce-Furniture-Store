/**
 * RC5.1 seed mechanism tests — idempotency, catalog versioning/checksum,
 * legacy compatibility records, deterministic role hierarchy, and seed audit.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  InMemorySecurityAuditStore,
  SecurityAuditService,
} from "../../audit/security-audit.js";
import { InMemoryIdentityStore } from "../../stores/identity-store.js";
import {
  LEGACY_ACTION_MAP,
  PERMISSION_CATALOG,
  PLATFORM_PERMISSION_DEFINITIONS,
  RBAC_CATALOG_VERSION,
  API_PERMISSION_DEFINITIONS,
} from "./permission-catalog.js";
import { ROLE_CATALOG } from "./role-catalog.js";
import { ROUTE_PERMISSION_DEFINITIONS } from "./route-permission-catalog.js";
import { computeCatalogChecksum, seedRbacCatalog } from "./seed.js";

const fixedClock = { now: (): Date => new Date("2026-07-17T00:00:00.000Z") };

const compatCount = PERMISSION_CATALOG.filter(
  (p) => p.legacyKey !== p.code,
).length;

describe("seedRbacCatalog", () => {
  it("seeds the full catalog on an empty store", async () => {
    const store = new InMemoryIdentityStore();
    const result = await seedRbacCatalog({ store });

    assert.ok(result.ok, "seed must succeed");
    const report = result.value;
    assert.equal(report.catalogVersion, RBAC_CATALOG_VERSION);
    assert.equal(report.canonicalPermissions.created, 133);
    assert.equal(report.canonicalPermissions.existing, 0);
    assert.equal(
      report.platformPermissions.created,
      PLATFORM_PERMISSION_DEFINITIONS.length,
    );
    assert.equal(report.platformPermissions.existing, 0);
    assert.equal(
      report.apiPermissions.created,
      API_PERMISSION_DEFINITIONS.length,
    );
    assert.equal(report.apiPermissions.existing, 0);
    assert.equal(
      report.routePermissions.created,
      ROUTE_PERMISSION_DEFINITIONS.length,
    );
    assert.equal(report.routePermissions.existing, 0);
    assert.equal(report.legacyCompatibilityPermissions.created, compatCount);
    assert.equal(report.systemRoles.created, 33);
    assert.equal(report.systemRoles.existing, 0);
    assert.equal(report.legacyMappingCount, 133);
    assert.ok(report.rolePermissionLinks.created > 0);

    assert.equal(
      store.permissions.size,
      133 +
        PLATFORM_PERMISSION_DEFINITIONS.length +
        API_PERMISSION_DEFINITIONS.length +
        ROUTE_PERMISSION_DEFINITIONS.length +
        compatCount,
    );
    assert.equal(store.roles.size, 33);
  });

  it("is idempotent: rerunning creates nothing and changes nothing", async () => {
    const store = new InMemoryIdentityStore();
    const first = await seedRbacCatalog({ store });
    assert.ok(first.ok);

    const permissionCount = store.permissions.size;
    const roleCount = store.roles.size;
    const linkCount = [...store.rolePermissions.values()].reduce(
      (sum, links) => sum + links.length,
      0,
    );

    const second = await seedRbacCatalog({ store });
    assert.ok(second.ok);
    const report = second.value;
    assert.equal(report.canonicalPermissions.created, 0);
    assert.equal(report.canonicalPermissions.existing, 133);
    assert.equal(report.platformPermissions.created, 0);
    assert.equal(
      report.platformPermissions.existing,
      PLATFORM_PERMISSION_DEFINITIONS.length,
    );
    assert.equal(report.apiPermissions.created, 0);
    assert.equal(
      report.apiPermissions.existing,
      API_PERMISSION_DEFINITIONS.length,
    );
    assert.equal(report.routePermissions.created, 0);
    assert.equal(
      report.routePermissions.existing,
      ROUTE_PERMISSION_DEFINITIONS.length,
    );
    assert.equal(report.legacyCompatibilityPermissions.created, 0);
    assert.equal(report.legacyCompatibilityPermissions.existing, compatCount);
    assert.equal(report.systemRoles.created, 0);
    assert.equal(report.systemRoles.existing, 33);
    assert.equal(report.rolePermissionLinks.created, 0);

    assert.equal(store.permissions.size, permissionCount);
    assert.equal(store.roles.size, roleCount);
    const linkCountAfter = [...store.rolePermissions.values()].reduce(
      (sum, links) => sum + links.length,
      0,
    );
    assert.equal(linkCountAfter, linkCount);
  });

  it("produces a stable checksum tied to the catalog version", async () => {
    const store = new InMemoryIdentityStore();
    const first = await seedRbacCatalog({ store });
    const second = await seedRbacCatalog({ store });
    assert.ok(first.ok && second.ok);
    assert.equal(first.value.checksum, second.value.checksum);
    assert.equal(first.value.checksum, computeCatalogChecksum());
    assert.match(first.value.checksum, /^[0-9a-f]{64}$/);
  });

  it("seeds a resolvable permission record for every legacy action key", async () => {
    const store = new InMemoryIdentityStore();
    const result = await seedRbacCatalog({ store });
    assert.ok(result.ok);

    for (const legacyKey of Object.keys(LEGACY_ACTION_MAP)) {
      const record = await store.getPermissionByCode(legacyKey);
      assert.ok(record, `legacy key not seeded: ${legacyKey}`);
    }
    for (const permission of PERMISSION_CATALOG) {
      const record = await store.getPermissionByCode(permission.code);
      assert.ok(record, `canonical code not seeded: ${permission.code}`);
      assert.equal(record.module, permission.module);
    }
  });

  it("seeds roles as global system roles with the documented hierarchy", async () => {
    const store = new InMemoryIdentityStore();
    const result = await seedRbacCatalog({ store });
    assert.ok(result.ok);

    for (const role of ROLE_CATALOG) {
      const record = await store.getRoleByCode(null, role.code);
      assert.ok(record, `role not seeded: ${role.code}`);
      assert.equal(record.companyId, null);
      assert.equal(record.isSystem, true);
      assert.equal(record.name, role.name);
    }

    const admin = await store.getRoleByCode(null, "admin");
    const owner = await store.getRoleByCode(null, "company_owner");
    const editor = await store.getRoleByCode(null, "editor");
    const moderator = await store.getRoleByCode(null, "moderator");
    assert.ok(admin && owner && editor && moderator);
    assert.equal(owner.parentRoleId, admin.id);
    assert.equal(moderator.parentRoleId, editor.id);
    assert.equal(admin.parentRoleId, null);
  });

  it("grants canonical and legacy compatibility permissions together", async () => {
    const store = new InMemoryIdentityStore();
    const result = await seedRbacCatalog({ store });
    assert.ok(result.ok);

    const salesManager = await store.getRoleByCode(null, "sales_manager");
    assert.ok(salesManager);
    const links = await store.listRolePermissions(salesManager.id);
    const grantedCodes = new Set<string>();
    for (const link of links) {
      const permission = await store.getPermissionById(link.permissionId);
      assert.ok(permission);
      grantedCodes.add(permission.code);
    }

    // Canonical grant and its legacy executable key both resolve.
    assert.ok(grantedCodes.has("sales.orders.read"));
    assert.ok(grantedCodes.has("order.read"));
    assert.ok(grantedCodes.has("crm.leads.create"));
    assert.ok(grantedCodes.has("lead.create"));
    // No cross-module leakage.
    assert.ok(!grantedCodes.has("finance.invoices.read"));
    assert.ok(!grantedCodes.has("finance.invoice.read"));
  });

  it("seeds and grants dam.assets.upload to admin and editor", async () => {
    const store = new InMemoryIdentityStore();
    const result = await seedRbacCatalog({ store });
    assert.ok(result.ok);

    const upload = await store.getPermissionByCode("dam.assets.upload");
    assert.ok(upload);
    assert.equal(upload.module, "dam");

    for (const roleCode of ["admin", "editor", "super_admin"]) {
      const role = await store.getRoleByCode(null, roleCode);
      assert.ok(role);
      const links = await store.listRolePermissions(role.id);
      const granted = new Set<string>();
      for (const link of links) {
        const permission = await store.getPermissionById(link.permissionId);
        assert.ok(permission);
        granted.add(permission.code);
      }
      assert.ok(
        granted.has("dam.assets.upload"),
        `${roleCode} must receive dam.assets.upload`,
      );
    }

    const readOnly = await store.getRoleByCode(null, "read_only");
    assert.ok(readOnly);
    const readLinks = await store.listRolePermissions(readOnly.id);
    const readGranted = new Set<string>();
    for (const link of readLinks) {
      const permission = await store.getPermissionById(link.permissionId);
      assert.ok(permission);
      readGranted.add(permission.code);
    }
    assert.ok(!readGranted.has("dam.assets.upload"));
  });

  it("super_admin and admin cover all 133 legacy executable keys", async () => {
    const store = new InMemoryIdentityStore();
    const result = await seedRbacCatalog({ store });
    assert.ok(result.ok);

    for (const roleCode of ["super_admin", "admin"]) {
      const role = await store.getRoleByCode(null, roleCode);
      assert.ok(role);
      const links = await store.listRolePermissions(role.id);
      const grantedCodes = new Set<string>();
      for (const link of links) {
        const permission = await store.getPermissionById(link.permissionId);
        assert.ok(permission);
        grantedCodes.add(permission.code);
      }
      for (const legacyKey of Object.keys(LEGACY_ACTION_MAP)) {
        assert.ok(
          grantedCodes.has(legacyKey),
          `${roleCode} missing legacy key ${legacyKey}`,
        );
      }
    }
  });

  it("does not create or modify user role assignments", async () => {
    const store = new InMemoryIdentityStore();
    const result = await seedRbacCatalog({ store });
    assert.ok(result.ok);
    assert.equal(store.userRoles.size, 0);
    assert.equal(store.users.size, 0);
  });

  it("records a seed audit event with version, checksum, and counts", async () => {
    const store = new InMemoryIdentityStore();
    const auditStore = new InMemorySecurityAuditStore();
    const audit = new SecurityAuditService(auditStore, fixedClock);

    const result = await seedRbacCatalog({ store, audit });
    assert.ok(result.ok);

    assert.equal(auditStore.records.length, 1);
    const record = auditStore.records[0];
    assert.ok(record);
    assert.equal(record.action, "rbac.catalog_seeded");
    assert.equal(record.entityType, "rbac_catalog");
    assert.equal(record.entityId, RBAC_CATALOG_VERSION);
    assert.equal(record.outcome, "success");
    assert.equal(record.details["catalogVersion"], RBAC_CATALOG_VERSION);
    assert.equal(record.details["checksum"], result.value.checksum);
  });
});
