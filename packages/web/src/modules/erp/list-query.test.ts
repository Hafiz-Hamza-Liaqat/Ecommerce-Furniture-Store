import { describe, expect, it } from "vitest";
import { buildDefaultListPayload, readListPage } from "./list-query";

describe("RC7.3 list-query", () => {
  it("builds company-scoped ListQueryRequest with page criteria", () => {
    const payload = buildDefaultListPayload("co-1", {
      page: 2,
      pageSize: 25,
      q: "acme",
      filters: {},
    });
    expect(payload).toEqual({
      companyId: "co-1",
      q: "acme",
      criteria: { page: { page: 2, pageSize: 25 } },
    });
  });

  it("normalizes Title Case status filters and omits unknown chrome keys", () => {
    const payload = buildDefaultListPayload("co-1", {
      page: 1,
      pageSize: 25,
      filters: {
        status: "In Progress",
        presentationOnly: "Ignored",
        warehouseId: "wh-1",
      },
    });
    expect(payload.criteria).toEqual({
      page: { page: 1, pageSize: 25 },
      filters: [
        { field: "status", operator: "eq", value: "in_progress" },
        { field: "warehouseId", operator: "eq", value: "wh-1" },
      ],
    });
  });

  it("reads ListPageDto items and totalCount", () => {
    expect(readListPage({ items: [{ id: "a" }], totalCount: 9 })).toEqual({
      items: [{ id: "a" }],
      totalCount: 9,
    });
    expect(readListPage(null)).toEqual({ items: [], totalCount: 0 });
    expect(readListPage({ items: [{ id: "a" }] })).toEqual({
      items: [{ id: "a" }],
      totalCount: 1,
    });
  });
});
