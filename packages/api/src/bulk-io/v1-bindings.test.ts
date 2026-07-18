import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { V1_BULK_IO_BINDINGS } from "./v1-bindings.js";

describe("RC7.7 V1 bulk I/O bindings", () => {
  it("freezes three opt-in entity bindings", () => {
    assert.equal(V1_BULK_IO_BINDINGS.length, 3);
    const types = V1_BULK_IO_BINDINGS.map((b) => b.allowedEntityType);
    assert.ok(types.includes("inventory.item"));
    assert.ok(types.includes("crm.lead"));
    assert.ok(types.includes("procurement.supplier"));
  });
});
