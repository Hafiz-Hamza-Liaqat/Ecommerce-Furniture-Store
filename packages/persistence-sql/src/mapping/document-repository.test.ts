/**
 * RC7.4 — SqlDocumentRepository optimistic concurrency (OCC).
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { ConcurrencyError } from "@afh/shared-kernel";
import type { InventoryItem } from "@afh/inventory";
import { createSqlPersistenceFoundation } from "../composition/composition-root.js";

const fixedClock = { now: (): Date => new Date("2026-07-18T00:00:00.000Z") };

describe("RC7.4 SqlDocumentRepository OCC", () => {
  const dirs: string[] = [];

  after(() => {
    for (const dir of dirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  function openSql(label: string) {
    const dir = mkdtempSync(join(tmpdir(), `afh-rc74-${label}-`));
    dirs.push(dir);
    const dbPath = join(dir, "test.sqlite");
    const sql = createSqlPersistenceFoundation({
      config: { databasePath: dbPath },
      clock: fixedClock,
    });
    return sql;
  }

  it("save with stale expectedVersion fails closed", async () => {
    const sql = openSql("occ");
    const repo = sql.repositories.inventory.items;

    const item: InventoryItem = {
      id: "item-1",
      companyId: "co-1",
      code: "SKU-1",
      name: "Widget",
      skuRef: { sku: "SKU-1", productId: null, variantId: null },
      status: "active",
      classification: "finished_good",
      itemType: "stocked",
      defaultUnitCode: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const created = await repo.save(item);
    assert.ok(created.ok);

    const loaded = await repo.findByIdWithVersion({
      companyId: "co-1",
      id: "item-1",
    });
    assert.ok(loaded.ok && loaded.value);
    assert.equal(loaded.value.version, 1);

    const stale = await repo.save(
      { ...item, name: "Stale" },
      { expectedVersion: 0 },
    );
    assert.equal(stale.ok, false);
    if (stale.ok) return;
    assert.ok(stale.error instanceof ConcurrencyError);
    assert.equal(stale.error.code, "optimistic_concurrency_conflict");

    sql.dispose();
  });
});
