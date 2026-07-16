/**
 * RC5.1 permission catalog tests — catalog completeness, canonical grammar,
 * and full legacy action key mapping coverage (105 unique keys, 107 handler
 * action references).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANONICAL_PERMISSION_CODES,
  LEGACY_ACTION_MAP,
  PERMISSION_CATALOG,
  RBAC_CATALOG_VERSION,
  resolveLegacyActionKey,
} from "./permission-catalog.js";
import { validatePermissionCode } from "./validation.js";

/**
 * Verbatim mirror of the seven `*PolicyActions` constants in the application
 * packages (sales/procurement/inventory/finance/crm/projects/service).
 * This fixture is the tripwire: if a handler action key changes or is added,
 * this test must be updated together with the catalog.
 * 107 action references across 107 handlers; 105 unique keys (the sales and
 * procurement summary queries reuse `order.read` / `po.read`).
 */
const HANDLER_ACTION_REFERENCES: readonly string[] = [
  // sales (10 references)
  "opportunity.create",
  "opportunity.update",
  "opportunity.read",
  "quote.create",
  "quote.revise",
  "quote.read",
  "order.create",
  "order.cancel",
  "order.read",
  "order.read", // GetCustomerSalesSummary reuses order.read
  // procurement (11 references)
  "supplier.create",
  "supplier.update",
  "supplier.read",
  "requisition.create",
  "requisition.submit",
  "requisition.read",
  "po.create",
  "po.issue",
  "po.cancel",
  "po.read",
  "po.read", // GetProcurementSummary reuses po.read
  // inventory (17 references)
  "inventory.item.create",
  "inventory.item.update",
  "inventory.item.read",
  "inventory.warehouse.create",
  "inventory.warehouse.read",
  "inventory.location.create",
  "inventory.stock.receive",
  "inventory.stock.adjust",
  "inventory.stock.reserve",
  "inventory.stock.release",
  "inventory.stock.transfer",
  "inventory.stock.read",
  "inventory.ledger.read",
  "inventory.batch.read",
  "inventory.lot.read",
  "inventory.serial.read",
  "inventory.summary.read",
  // finance (14 references)
  "finance.account.create",
  "finance.account.update",
  "finance.account.read",
  "finance.invoice.create",
  "finance.invoice.update",
  "finance.invoice.read",
  "finance.payment.record",
  "finance.payment.read",
  "finance.credit.adjust",
  "finance.credit.read",
  "finance.ledger.create",
  "finance.ledger.append",
  "finance.ledger.read",
  "finance.summary.read",
  // crm (19 references)
  "lead.create",
  "lead.update",
  "lead.qualify",
  "lead.convert",
  "lead.read",
  "contact.create",
  "contact.update",
  "contact.read",
  "account.create",
  "account.update",
  "account.read",
  "activity.log",
  "activity.read",
  "communication.record",
  "communication.read",
  "campaign.create",
  "campaign.update",
  "campaign.read",
  "crm.summary.read",
  // projects (20 references)
  "project.create",
  "project.update",
  "project.archive",
  "project.read",
  "task.create",
  "task.update",
  "task.assign",
  "task.complete",
  "task.read",
  "milestone.create",
  "milestone.update",
  "milestone.read",
  "resource.assign",
  "resource.release",
  "resource.read",
  "team.read",
  "schedule.update",
  "schedule.read",
  "work_item.read",
  "project.summary.read",
  // service (16 references)
  "service_request.create",
  "service_request.update",
  "service_request.close",
  "service_request.read",
  "technician.assign",
  "technician.reassign",
  "technician_assignment.read",
  "appointment.schedule",
  "appointment.reschedule",
  "appointment.read",
  "work_order.create",
  "work_order.update",
  "work_order.complete",
  "work_order.read",
  "service.history.read",
  "service.summary.read",
];

describe("RC5.1 permission catalog", () => {
  it("has the frozen catalog version", () => {
    assert.equal(RBAC_CATALOG_VERSION, "rc5.rbac-catalog.v2");
  });

  it("contains exactly 105 canonical backend permissions", () => {
    assert.equal(PERMISSION_CATALOG.length, 105);
    assert.equal(CANONICAL_PERMISSION_CODES.length, 105);
  });

  it("has unique canonical codes", () => {
    const codes = new Set(PERMISSION_CATALOG.map((p) => p.code));
    assert.equal(codes.size, 105);
  });

  it("has unique legacy action keys (105)", () => {
    const keys = new Set(PERMISSION_CATALOG.map((p) => p.legacyKey));
    assert.equal(keys.size, 105);
    assert.equal(Object.keys(LEGACY_ACTION_MAP).length, 105);
  });

  it("every canonical code satisfies the frozen grammar", () => {
    for (const permission of PERMISSION_CATALOG) {
      assert.deepEqual(
        validatePermissionCode(permission.code),
        [],
        `invalid canonical code: ${permission.code}`,
      );
    }
  });

  it("declared module always matches the code prefix", () => {
    for (const permission of PERMISSION_CATALOG) {
      assert.ok(
        permission.code.startsWith(`${permission.module}.`),
        `${permission.code} does not start with ${permission.module}.`,
      );
    }
  });

  it("contains no wildcards in codes or legacy keys", () => {
    for (const permission of PERMISSION_CATALOG) {
      assert.ok(!permission.code.includes("*"));
      assert.ok(!permission.legacyKey.includes("*"));
    }
  });
});

describe("RC5.1 legacy action key mapping coverage", () => {
  it("mirrors 107 handler action references and 105 unique keys", () => {
    assert.equal(HANDLER_ACTION_REFERENCES.length, 107);
    assert.equal(new Set(HANDLER_ACTION_REFERENCES).size, 105);
  });

  it("maps every handler action reference (0 unmapped keys)", () => {
    const unmapped = HANDLER_ACTION_REFERENCES.filter(
      (key) => resolveLegacyActionKey(key) === null,
    );
    assert.deepEqual(unmapped, []);
  });

  it("maps only keys that handlers actually use (no orphan mappings)", () => {
    const used = new Set(HANDLER_ACTION_REFERENCES);
    const orphans = Object.keys(LEGACY_ACTION_MAP).filter(
      (key) => !used.has(key),
    );
    assert.deepEqual(orphans, []);
  });

  it("maps each legacy key to exactly one canonical catalog code", () => {
    const canonical = new Set(CANONICAL_PERMISSION_CODES);
    for (const [legacyKey, canonicalCode] of Object.entries(
      LEGACY_ACTION_MAP,
    )) {
      assert.ok(
        canonical.has(canonicalCode),
        `${legacyKey} maps to unknown code ${canonicalCode}`,
      );
    }
  });

  it("keeps the two reused summary keys as single permissions", () => {
    assert.equal(resolveLegacyActionKey("order.read"), "sales.orders.read");
    assert.equal(
      resolveLegacyActionKey("po.read"),
      "procurement.purchase_orders.read",
    );
  });

  it("returns null for unknown keys (fail closed, no guessing)", () => {
    assert.equal(resolveLegacyActionKey("unknown.key"), null);
    assert.equal(resolveLegacyActionKey("sales.orders.read"), null);
    assert.equal(resolveLegacyActionKey(""), null);
  });
});
