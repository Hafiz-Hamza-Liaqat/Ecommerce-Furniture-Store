import type { AnalyticsFilters } from "./shared";

const BUILDER_KEY = "afh.web.bi.builder.layout";
const SHARED_KEY = "afh.web.bi.shared.dashboards";
const FAV_REPORTS_KEY = "afh.web.bi.favorite.reports";
const SAVED_VIEWS_KEY = "afh.web.bi.saved.report.views";

export type BuilderLayoutItem = {
  readonly id: string;
  readonly label: string;
  readonly kind: string;
  readonly size: "sm" | "md" | "lg";
  readonly hidden: boolean;
};

export type SharedDashboard = {
  readonly id: string;
  readonly name: string;
  readonly layout: BuilderLayoutItem[];
};

export type SavedReportView = {
  readonly id: string;
  readonly reportId: string;
  readonly label: string;
  readonly filters: AnalyticsFilters;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function defaultBuilderLayout(): BuilderLayoutItem[] {
  return [
    { id: "kpi-strip", label: "KPI strip", kind: "kpis", size: "lg", hidden: false },
    { id: "revenue-line", label: "Revenue line", kind: "line", size: "md", hidden: false },
    { id: "orders-bar", label: "Orders bar", kind: "bar", size: "md", hidden: false },
    { id: "pipeline-funnel", label: "Pipeline funnel", kind: "funnel", size: "md", hidden: false },
    { id: "compare", label: "Comparison cards", kind: "compare", size: "md", hidden: false },
  ];
}

export function loadBuilderLayout(): BuilderLayoutItem[] {
  const stored = readJson<BuilderLayoutItem[] | null>(BUILDER_KEY, null);
  return stored && stored.length ? stored : defaultBuilderLayout();
}

export function saveBuilderLayout(items: BuilderLayoutItem[]): void {
  localStorage.setItem(BUILDER_KEY, JSON.stringify(items));
}

export function loadSharedDashboards(): SharedDashboard[] {
  return readJson(SHARED_KEY, []);
}

export function saveSharedDashboards(items: SharedDashboard[]): void {
  localStorage.setItem(SHARED_KEY, JSON.stringify(items));
}

export function loadFavoriteReports(): string[] {
  return readJson(FAV_REPORTS_KEY, ["r-exec", "r-fin", "r-sales"]);
}

export function saveFavoriteReports(ids: string[]): void {
  localStorage.setItem(FAV_REPORTS_KEY, JSON.stringify(ids));
}

export function loadSavedReportViews(): SavedReportView[] {
  return readJson(SAVED_VIEWS_KEY, []);
}

export function saveSavedReportViews(items: SavedReportView[]): void {
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(items));
}
