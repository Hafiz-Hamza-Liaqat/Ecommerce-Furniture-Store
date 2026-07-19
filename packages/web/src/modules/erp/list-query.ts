/**
 * RC7.3 — default ListQueryRequest builder for ModuleApp live lists.
 */

export type ListFetchArgs = {
  readonly page: number;
  readonly pageSize: number;
  readonly q?: string;
  readonly filters: Readonly<Record<string, string>>;
  readonly sortField?: string;
  readonly sortDir?: "asc" | "desc";
};

/**
 * Build a shared-kernel ListQueryRequest-shaped payload.
 * Only forwards allow-listed-looking filter keys that List* handlers typically accept
 * (status and exact id fields). Unknown UI presentation filters are omitted so
 * validation does not fail closed on Demo filter chrome.
 */
export function buildDefaultListPayload(
  companyId: string,
  args: ListFetchArgs,
  options?: {
    readonly filterFieldMap?: Readonly<Record<string, string>>;
    readonly allowedFilterKeys?: ReadonlySet<string>;
  },
): Record<string, unknown> {
  const allowed =
    options?.allowedFilterKeys ??
    new Set([
      "status",
      "code",
      "name",
      "number",
      "kind",
      "accountType",
      "projectType",
      "priority",
      "customerId",
      "organizationId",
      "warehouseId",
      "inventoryItemId",
      "invoiceId",
      "projectId",
    ]);
  const map = options?.filterFieldMap ?? {};
  const filters: Array<{
    field: string;
    operator: "eq";
    value: string;
  }> = [];

  for (const [key, raw] of Object.entries(args.filters)) {
    if (!raw.trim()) continue;
    const field = map[key] ?? key;
    if (!allowed.has(field)) continue;
    const value =
      field === "status" || field === "kind" || field === "priority"
        ? normalizeStatusLike(raw)
        : raw.trim();
    filters.push({ field, operator: "eq", value });
  }

  const criteria: Record<string, unknown> = {
    page: { page: Math.max(1, args.page), pageSize: Math.max(1, args.pageSize) },
  };
  if (filters.length > 0) {
    criteria.filters = filters;
  }
  if (args.sortField) {
    criteria.sort = [
      {
        field: args.sortField,
        direction: args.sortDir === "desc" ? "desc" : "asc",
      },
    ];
  }

  return {
    companyId,
    ...(args.q && args.q.trim() ? { q: args.q.trim() } : {}),
    criteria,
  };
}

function normalizeStatusLike(raw: string): string {
  const trimmed = raw.trim();
  // Domain statuses are snake_case / lowercase; UI chrome often Title Case.
  return trimmed.includes(" ")
    ? trimmed.toLowerCase().replace(/\s+/g, "_")
    : trimmed.toLowerCase();
}

export type ListPageDto<T = unknown> = {
  readonly items?: readonly T[];
  readonly totalCount?: number;
  readonly page?: number;
  readonly pageSize?: number;
  readonly hasMore?: boolean;
};

export function readListPage(data: unknown): {
  readonly items: readonly unknown[];
  readonly totalCount: number;
} {
  if (!data || typeof data !== "object") {
    return { items: [], totalCount: 0 };
  }
  const page = data as ListPageDto & {
    readonly jobs?: readonly unknown[];
    readonly hits?: readonly unknown[];
    readonly notes?: readonly unknown[];
    readonly attachments?: readonly unknown[];
    readonly total?: number;
  };
  const items = Array.isArray(page.items)
    ? page.items
    : Array.isArray(page.jobs)
      ? page.jobs
      : Array.isArray(page.hits)
        ? page.hits
        : Array.isArray(page.notes)
          ? page.notes
          : Array.isArray(page.attachments)
            ? page.attachments
            : [];
  const totalCount =
    typeof page.totalCount === "number"
      ? page.totalCount
      : typeof page.total === "number"
        ? page.total
        : items.length;
  return { items, totalCount };
}
