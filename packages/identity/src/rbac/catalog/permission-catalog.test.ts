/**
 * RC5.1 permission catalog tests — catalog completeness, canonical grammar,
 * and full legacy action key mapping coverage (107 unique keys, 110 handler
 * action references).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALL_CANONICAL_PERMISSION_CODES,
  API_PERMISSION_DEFINITIONS,
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
 * 110 action references across 110 handlers; 107 unique keys (the sales and
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
  // dam (3 references)
  "dam.asset.create",
  "dam.asset.read",
  "dam.asset.read",
];

describe("RC5.1 permission catalog", () => {
  it("has the frozen catalog version", () => {
    assert.equal(RBAC_CATALOG_VERSION, "rc5.rbac-catalog.v3");
  });

  it("contains exactly 107 canonical backend permissions", () => {
    assert.equal(PERMISSION_CATALOG.length, 107);
    assert.equal(CANONICAL_PERMISSION_CODES.length, 107);
  });

  it("includes the RC5.4 API upload permission outside the CQRS catalog", () => {
    assert.equal(API_PERMISSION_DEFINITIONS.length, 1);
    assert.equal(API_PERMISSION_DEFINITIONS[0]?.code, "dam.assets.upload");
    assert.equal(API_PERMISSION_DEFINITIONS[0]?.module, "dam");
    assert.ok(!CANONICAL_PERMISSION_CODES.includes("dam.assets.upload"));
    assert.ok(ALL_CANONICAL_PERMISSION_CODES.includes("dam.assets.upload"));
  });

  it("has unique canonical codes", () => {
    const codes = new Set(PERMISSION_CATALOG.map((p) => p.code));
    assert.equal(codes.size, 107);
  });

  it("has unique legacy action keys (107)", () => {
    const keys = new Set(PERMISSION_CATALOG.map((p) => p.legacyKey));
    assert.equal(keys.size, 107);
    assert.equal(Object.keys(LEGACY_ACTION_MAP).length, 107);
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
  it("mirrors 110 handler action references and 107 unique keys", () => {
    assert.equal(HANDLER_ACTION_REFERENCES.length, 110);
    assert.equal(new Set(HANDLER_ACTION_REFERENCES).size, 107);
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
