/**
 * RC5.1 role catalog tests — 33 immutable system roles, frozen group
 * composition, hierarchy integrity, and canonical-only grants.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALL_CANONICAL_PERMISSION_CODES,
  CANONICAL_PERMISSION_CODES,
  PERMISSION_CATALOG,
} from "./permission-catalog.js";
import { ROLE_CATALOG, SYSTEM_ROLE_CODES } from "./role-catalog.js";

const byCode = new Map(ROLE_CATALOG.map((role) => [role.code, role]));

describe("RC5.1 system role catalog", () => {
  it("contains exactly 33 system roles", () => {
    assert.equal(ROLE_CATALOG.length, 33);
    assert.equal(SYSTEM_ROLE_CODES.length, 33);
  });

  it("has unique role codes", () => {
    assert.equal(new Set(SYSTEM_ROLE_CODES).size, 33);
  });

  it("matches the frozen group composition (9/10/8/6)", () => {
    const count = (group: string): number =>
      ROLE_CATALOG.filter((role) => role.group === group).length;
    assert.equal(count("governance"), 9);
    assert.equal(count("management"), 10);
    assert.equal(count("partner"), 8);
    assert.equal(count("operational"), 6);
  });

  it("excludes non-seeded rows per the frozen decisions", () => {
    for (const excluded of [
      "guest", // public state, never an assignment
      "vendor", // alias of supplier
      "viewer", // presentation-only fixture
      "manufacturer_partner", // deferred to RC8
      "consultant", // deferred to RC8
    ]) {
      assert.ok(!byCode.has(excluded), `${excluded} must not be seeded`);
    }
  });

  it("every parent reference is a catalog role and hierarchy is acyclic", () => {
    for (const role of ROLE_CATALOG) {
      if (role.parentCode === null) {
        continue;
      }
      assert.ok(byCode.has(role.parentCode), `${role.code} has unknown parent`);
      const seen = new Set<string>([role.code]);
      let current: string | null = role.parentCode;
      while (current !== null) {
        assert.ok(!seen.has(current), `cycle at ${role.code}`);
        seen.add(current);
        current = byCode.get(current)?.parentCode ?? null;
      }
    }
  });

  it("keeps the documented hierarchy edges", () => {
    assert.equal(byCode.get("company_owner")?.parentCode, "admin");
    assert.equal(byCode.get("moderator")?.parentCode, "editor");
  });

  it("grants reference only canonical catalog codes with no duplicates", () => {
    const canonical = new Set(ALL_CANONICAL_PERMISSION_CODES);
    for (const role of ROLE_CATALOG) {
      const seen = new Set<string>();
      for (const code of role.permissions) {
        assert.ok(!code.includes("*"), `${role.code}: wildcard grant`);
        assert.ok(canonical.has(code), `${role.code}: unknown grant ${code}`);
        assert.ok(!seen.has(code), `${role.code}: duplicate grant ${code}`);
        seen.add(code);
      }
    }
  });

  it("super_admin holds every backend and inactive route permission", () => {
    assert.equal(
      byCode.get("super_admin")?.permissions.length,
      ALL_CANONICAL_PERMISSION_CODES.length,
    );
  });

  it("admin holds every backend permission without platform-admin or portal access", () => {
    const permissions = new Set(byCode.get("admin")?.permissions);
    for (const code of CANONICAL_PERMISSION_CODES) {
      assert.ok(permissions.has(code), `admin missing ${code}`);
    }
    assert.ok(!permissions.has("platform.administration.read"));
    assert.ok(!permissions.has("portal.customer_portal.read"));
  });

  it("read-only style roles hold only read permissions", () => {
    const allReads = PERMISSION_CATALOG.filter((p) =>
      p.code.endsWith(".read"),
    ).length;
    for (const code of ["read_only", "executive", "auditor"]) {
      const role = byCode.get(code);
      assert.ok(role);
      assert.ok(role.permissions.length >= allReads);
      for (const grant of role.permissions) {
        assert.ok(grant.endsWith(".read"), `${code}: non-read grant ${grant}`);
      }
    }
  });

  it("module manager roles receive their module packs", () => {
    const modulePack = (module: string): number =>
      PERMISSION_CATALOG.filter((p) => p.module === module).length;
    assert.ok(
      (byCode.get("finance_manager")?.permissions.length ?? 0) >
        modulePack("finance"),
    );
    assert.ok(
      (byCode.get("warehouse_manager")?.permissions.length ?? 0) >
        modulePack("inventory"),
    );
    assert.ok(
      (byCode.get("service_manager")?.permissions.length ?? 0) >
        modulePack("service"),
    );
    assert.ok(
      (byCode.get("sales_manager")?.permissions.length ?? 0) >
        modulePack("sales") + modulePack("crm"),
    );
  });

  it("partner and operational roles carry route grants only", () => {
    const backend = new Set(CANONICAL_PERMISSION_CODES);
    for (const role of ROLE_CATALOG) {
      if (role.group === "partner" || role.group === "operational") {
        for (const permission of role.permissions) {
          assert.ok(
            !backend.has(permission),
            `${role.code} received backend grant ${permission}`,
          );
        }
      }
    }
  });
});
