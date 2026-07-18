/**
 * RC7.1 — shared-kernel List* contract tests.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIST_MAX_PAGE_SIZE,
  decodeAuthorizedCursor,
  encodeAuthorizedCursor,
  normalizeListOffsetPage,
  requireListCompanyId,
  validateFilterAllowList,
  validateSortAllowList,
  type ListQueryRequest,
} from "../paging/list-query.js";

describe("RC7.1 ListQueryRequest contracts", () => {
  it("defaults offset page when criteria.page omitted", () => {
    const req: ListQueryRequest = { companyId: "c1" };
    const page = normalizeListOffsetPage(req);
    assert.equal(page.ok, true);
    if (!page.ok) return;
    assert.equal(page.value.page, 1);
    assert.equal(page.value.offset, 0);
    assert.ok(page.value.pageSize <= LIST_MAX_PAGE_SIZE);
  });

  it("rejects pageSize above LIST_MAX_PAGE_SIZE", () => {
    const page = normalizeListOffsetPage({
      companyId: "c1",
      criteria: { page: { page: 1, pageSize: LIST_MAX_PAGE_SIZE + 1 } },
    });
    assert.equal(page.ok, false);
    if (page.ok) return;
    assert.equal(page.error.code, "list_invalid_page_size");
  });

  it("decodes authorized cursors as offsets", () => {
    assert.equal(encodeAuthorizedCursor(25), "25");
    const decoded = decodeAuthorizedCursor("25");
    assert.equal(decoded.ok, true);
    if (!decoded.ok) return;
    assert.equal(decoded.value, 25);
  });

  it("rejects unknown sort fields via allow-list", () => {
    const result = validateSortAllowList(
      [{ field: "secret", direction: "asc" }],
      new Set(["name"]),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "list_sort_field_not_allowed");
  });

  it("rejects unknown filter fields via allow-list", () => {
    const result = validateFilterAllowList(
      [{ field: "secret", operator: "eq", value: 1 }],
      new Set(["status"]),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "list_filter_field_not_allowed");
  });

  it("requires companyId", () => {
    const result = requireListCompanyId("  ");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "list_company_id_required");
  });
});
