import type { RecordRow } from "./types";

const STATUSES = ["Draft", "Open", "In progress", "Approved", "Issued", "Closed", "On hold"] as const;
const BRANCHES = ["Lahore HQ", "Karachi Showroom", "Factory"] as const;
const REGIONS = ["North", "South", "Central", "Export"] as const;

export function row(
  id: string,
  title: string,
  status: string,
  meta: Record<string, string | number>,
  extra?: Partial<RecordRow>,
): RecordRow {
  return { id, title, status, meta, source: "fixture", ...extra };
}

export function makeRows(
  prefix: string,
  titles: readonly string[],
  metaFactory: (i: number, title: string) => Record<string, string | number>,
): RecordRow[] {
  return titles.map((title, i) => {
    const amount = i % 2 === 0 ? `₨ ${(120_000 + i * 17_500).toLocaleString()}` : undefined;
    return row(
      `${prefix}-${1000 + i}`,
      title,
      STATUSES[i % STATUSES.length]!,
      metaFactory(i, title),
      {
        ...(amount ? { amount } : {}),
        tags: [REGIONS[i % REGIONS.length]!, BRANCHES[i % BRANCHES.length]!],
        description: `${title} — operational record for presentation and API-backed workflows.`,
      },
    );
  });
}

export { STATUSES, BRANCHES, REGIONS };
