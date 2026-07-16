/**
 * RC5.1 role catalog tests — 33 immutable system roles, frozen group
 * composition, hierarchy integrity, and canonical-only grants.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
    const canonical = new Set(CANONICAL_PERMISSION_CODES);
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

  it("super_admin and admin hold all 105 canonical permissions", () => {
    for (const code of ["super_admin", "admin"]) {
      assert.equal(byCode.get(code)?.permissions.length, 105);
    }
  });

  it("read-only style roles hold only read permissions", () => {
    const allReads = PERMISSION_CATALOG.filter((p) =>
      p.code.endsWith(".read"),
    ).length;
    for (const code of ["read_only", "executive", "auditor"]) {
      const role = byCode.get(code);
      assert.ok(role);
      assert.equal(role.permissions.length, allReads);
      for (const grant of role.permissions) {
        assert.ok(grant.endsWith(".read"), `${code}: non-read grant ${grant}`);
      }
    }
  });

  it("module manager roles receive their module packs", () => {
    const modulePack = (module: string): number =>
      PERMISSION_CATALOG.filter((p) => p.module === module).length;
    assert.equal(
      byCode.get("finance_manager")?.permissions.length,
      modulePack("finance"),
    );
    assert.equal(
      byCode.get("warehouse_manager")?.permissions.length,
      modulePack("inventory"),
    );
    assert.equal(
      byCode.get("service_manager")?.permissions.length,
      modulePack("service"),
    );
    assert.equal(
      byCode.get("sales_manager")?.permissions.length,
      modulePack("sales") + modulePack("crm"),
    );
  });

  it("partner and operational roles carry no backend grants in RC5.1", () => {
    for (const role of ROLE_CATALOG) {
      if (role.group === "partner" || role.group === "operational") {
        assert.deepEqual(
          [...role.permissions],
          [],
          `${role.code} must have no RC5.1 grants`,
        );
      }
    }
  });
});
