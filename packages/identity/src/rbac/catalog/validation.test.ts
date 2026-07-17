/**
 * RC5.1 permission naming validation tests — canonical grammar, approved
 * verbs, reserved/forbidden prefixes, wildcard prohibition, and catalog
 * integrity checks (governance specification §1).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CatalogPermissionDefinition } from "./permission-catalog.js";
import {
  API_PERMISSION_DEFINITIONS,
  PERMISSION_CATALOG,
} from "./permission-catalog.js";
import type { CatalogRoleDefinition } from "./role-catalog.js";
import { ROLE_CATALOG } from "./role-catalog.js";
import {
  ROUTE_ACCESS_CATALOG,
  ROUTE_PERMISSION_DEFINITIONS,
} from "./route-permission-catalog.js";
import {
  APPROVED_ACTIONS,
  validatePermissionCode,
  validateRbacCatalog,
} from "./validation.js";

describe("validatePermissionCode", () => {
  it("accepts the documented valid examples", () => {
    for (const code of [
      "sales.orders.read",
      "procurement.purchase_orders.issue",
      "finance.credit_accounts.adjust",
      "platform.approvals.claim",
      "identity.roles.assign",
      "dam.kyc_assets.read",
      "analytics.dashboards.configure",
      "ai.assistant.use",
    ]) {
      assert.deepEqual(validatePermissionCode(code), [], code);
    }
  });

  it("rejects the documented invalid examples", () => {
    for (const code of [
      "sales.order.view", // `view` is not canonical
      "po.issue", // only two segments
      "finance.credit.edit", // noncanonical verb
      "approval.claim", // only two segments
      "role.grant_admin", // two segments, unapproved verb
      "kyc.view", // two segments
      "analytics.configure", // missing resource
      "ai.settings.manage.extra", // four segments
    ]) {
      assert.ok(
        validatePermissionCode(code).length > 0,
        `${code} must be rejected`,
      );
    }
  });

  it("rejects wildcards everywhere", () => {
    for (const code of [
      "sales.*.*",
      "sales.orders.*",
      "*.orders.read",
      "*",
    ]) {
      assert.ok(validatePermissionCode(code).length > 0, code);
    }
  });

  it("rejects malformed segments", () => {
    for (const code of [
      "", // empty
      "sales..read", // empty segment
      ".sales.orders.read", // leading dot
      "sales.orders.read.", // trailing dot
      "Sales.orders.read", // uppercase
      "sales.sales-orders.read", // hyphen
      "sales.orders read.read", // space
      "sales.1orders.read", // segment starts with digit
    ]) {
      assert.ok(validatePermissionCode(code).length > 0, `"${code}"`);
    }
  });

  it("rejects forbidden and unreserved module prefixes", () => {
    for (const code of [
      "system.settings.read",
      "internal.jobs.run",
      "root.users.manage",
      "super_admin.grants.assign",
      "tenant.records.read",
      "company.records.read",
      "unknown_module.things.read",
    ]) {
      assert.ok(validatePermissionCode(code).length > 0, code);
    }
  });

  it("rejects unapproved verbs", () => {
    assert.ok(!APPROVED_ACTIONS.has("view"));
    assert.ok(!APPROVED_ACTIONS.has("get"));
    assert.ok(validatePermissionCode("sales.orders.get").length > 0);
    assert.ok(validatePermissionCode("sales.orders.destroy").length > 0);
  });
});

describe("validateRbacCatalog", () => {
  it("accepts the frozen RC5.1 catalog", () => {
    assert.deepEqual(
      validateRbacCatalog(
        [...PERMISSION_CATALOG, ...API_PERMISSION_DEFINITIONS],
        ROLE_CATALOG,
        ROUTE_PERMISSION_DEFINITIONS,
        ROUTE_ACCESS_CATALOG,
      ),
      [],
    );
  });

  it("rejects duplicate canonical codes", () => {
    const first = PERMISSION_CATALOG[0] as CatalogPermissionDefinition;
    const duplicate: CatalogPermissionDefinition = {
      ...first,
      legacyKey: "another.key",
    };
    const errors = validateRbacCatalog(
      [...PERMISSION_CATALOG, ...API_PERMISSION_DEFINITIONS, duplicate],
      ROLE_CATALOG,
      ROUTE_PERMISSION_DEFINITIONS,
      ROUTE_ACCESS_CATALOG,
    );
    assert.ok(errors.some((e) => e.includes("duplicate canonical")));
  });

  it("rejects a legacy key mapped more than once", () => {
    const first = PERMISSION_CATALOG[0] as CatalogPermissionDefinition;
    const duplicate: CatalogPermissionDefinition = {
      ...first,
      code: "sales.opportunities.delete",
    };
    const errors = validateRbacCatalog(
      [...PERMISSION_CATALOG, ...API_PERMISSION_DEFINITIONS, duplicate],
      ROLE_CATALOG,
      ROUTE_PERMISSION_DEFINITIONS,
      ROUTE_ACCESS_CATALOG,
    );
    assert.ok(errors.some((e) => e.includes("mapped more than once")));
  });

  it("rejects unknown role parents and hierarchy cycles", () => {
    const orphan: CatalogRoleDefinition = {
      code: "orphan_role",
      name: "Orphan",
      group: "operational",
      parentCode: "missing_parent",
      permissions: [],
    };
    const cycleA: CatalogRoleDefinition = {
      code: "cycle_a",
      name: "Cycle A",
      group: "operational",
      parentCode: "cycle_b",
      permissions: [],
    };
    const cycleB: CatalogRoleDefinition = {
      code: "cycle_b",
      name: "Cycle B",
      group: "operational",
      parentCode: "cycle_a",
      permissions: [],
    };
    const errors = validateRbacCatalog(
      [...PERMISSION_CATALOG, ...API_PERMISSION_DEFINITIONS],
      [...ROLE_CATALOG, orphan, cycleA, cycleB],
      ROUTE_PERMISSION_DEFINITIONS,
      ROUTE_ACCESS_CATALOG,
    );
    assert.ok(errors.some((e) => e.includes("not a catalog role")));
    assert.ok(errors.some((e) => e.includes("cycle")));
  });

  it("rejects grants outside the canonical catalog and wildcard grants", () => {
    const badRole: CatalogRoleDefinition = {
      code: "bad_role",
      name: "Bad Role",
      group: "operational",
      parentCode: null,
      permissions: ["opportunity.create", "sales.orders.*"],
    };
    const errors = validateRbacCatalog(
      [...PERMISSION_CATALOG, ...API_PERMISSION_DEFINITIONS],
      [...ROLE_CATALOG, badRole],
      ROUTE_PERMISSION_DEFINITIONS,
      ROUTE_ACCESS_CATALOG,
    );
    assert.ok(errors.some((e) => e.includes("not in the canonical catalog")));
    assert.ok(errors.some((e) => e.includes("wildcard grant")));
  });
});
