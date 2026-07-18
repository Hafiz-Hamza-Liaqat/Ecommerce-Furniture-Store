/**
 * createSqlSearchRepository.search — real bounded scan over aggregate_documents.
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import type { SearchDocument } from "@afh/search";
import { createSqlPersistenceFoundation } from "../composition/composition-root.js";

const fixedClock = { now: (): Date => new Date("2026-07-19T00:00:00.000Z") };

describe("createSqlSearchRepository.search", () => {
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

  function openSql() {
    const dir = mkdtempSync(join(tmpdir(), "afh-search-repo-"));
    dirs.push(dir);
    const dbPath = join(dir, "test.sqlite");
    return createSqlPersistenceFoundation({
      config: { databasePath: dbPath },
      clock: fixedClock,
    });
  }

  function makeDoc(partial: Partial<SearchDocument> & Pick<SearchDocument, "id" | "companyId" | "entityId">): SearchDocument {
    return {
      indexCode: "crm.leads",
      entityType: "lead",
      fields: {},
      indexedAt: "2026-01-01T00:00:00.000Z",
      ...partial,
    };
  }

  it("scans aggregate_documents filtered by indexCode and companyId", async () => {
    const sql = openSql();
    const docs = sql.repositories.search.documents;

    await docs.save(makeDoc({ id: "d1", companyId: "co-1", entityId: "lead-1", fields: { name: "Acme Corp" } }));
    await docs.save(makeDoc({ id: "d2", companyId: "co-2", entityId: "lead-2", fields: { name: "Other Co" } }));
    await docs.save(
      makeDoc({ id: "d3", companyId: "co-1", entityId: "supplier-1", indexCode: "procurement.suppliers", fields: { name: "Supplier X" } }),
    );

    const result = await sql.repositories.search.search.search({
      indexCode: "crm.leads",
      queryText: null,
      filters: { filters: [{ field: "companyId", op: "eq", value: "co-1" }] },
      sort: [],
    });
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    assert.equal(result.value.total, 1);
    assert.equal(result.value.hits[0]?.entityId, "lead-1");
  });

  it("matches queryText against entityId and fields JSON", async () => {
    const sql = openSql();
    const docs = sql.repositories.search.documents;

    await docs.save(makeDoc({ id: "d1", companyId: "co-1", entityId: "lead-1", fields: { name: "Acme Corp" } }));
    await docs.save(makeDoc({ id: "d2", companyId: "co-1", entityId: "lead-2", fields: { name: "Globex Inc" } }));

    const result = await sql.repositories.search.search.search({
      indexCode: "crm.leads",
      queryText: "acme",
      filters: null,
      sort: [],
    });
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.equal(result.value.total, 1);
    assert.equal(result.value.hits[0]?.entityId, "lead-1");
  });

  it("paginates and sorts results", async () => {
    const sql = openSql();
    const docs = sql.repositories.search.documents;

    await docs.save(makeDoc({ id: "d1", companyId: "co-1", entityId: "lead-a", fields: { score: 3 } }));
    await docs.save(makeDoc({ id: "d2", companyId: "co-1", entityId: "lead-b", fields: { score: 1 } }));
    await docs.save(makeDoc({ id: "d3", companyId: "co-1", entityId: "lead-c", fields: { score: 2 } }));

    const result = await sql.repositories.search.search.search({
      indexCode: "crm.leads",
      queryText: null,
      filters: null,
      sort: [{ field: "score", direction: "asc" }],
      page: { page: 1, pageSize: 2 },
    });
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.equal(result.value.total, 3);
    assert.deepEqual(result.value.hits.map((h) => h.entityId), ["lead-b", "lead-c"]);
  });
});
