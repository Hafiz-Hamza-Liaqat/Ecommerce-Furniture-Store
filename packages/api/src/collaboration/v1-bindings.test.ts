import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { V1_COLLABORATION_BINDINGS } from "./v1-bindings.js";

describe("RC7.6 V1 collaboration bindings", () => {
  it("freezes twelve cross-module entity bindings", () => {
    assert.equal(V1_COLLABORATION_BINDINGS.length, 12);

    const entityTypes = V1_COLLABORATION_BINDINGS.map((b) => b.allowedEntityType);
    assert.equal(new Set(entityTypes).size, entityTypes.length);
    assert.ok(entityTypes.includes("inventory.item"));
    assert.ok(entityTypes.includes("sales.order"));
    assert.ok(entityTypes.includes("crm.account"));
  });
});
