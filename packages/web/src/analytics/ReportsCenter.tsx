import { useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { PageHeader } from "../components/ui";
import { EmptyState, Tabs, Toolbar } from "../workspace/widgets";
import { BarChart, DonutChart, LineChart } from "../workspace/charts";
import { SERIES } from "../workspace/data";
import { REPORT_CATALOG, REPORT_TABLE_ROWS } from "./data";
import {
  AnalyticsFilterBar,
  DEFAULT_FILTERS,
  ExportActions,
  ScheduleReportUi,
  VirtualizedTable,
  type AnalyticsFilters,
} from "./shared";
import { useWorkspaceUi } from "../workspace/context";
import {
  loadFavoriteReports,
  loadSavedReportViews,
  saveFavoriteReports,
  saveSavedReportViews,
} from "./prefs";

function ReportsHome() {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [domain, setDomain] = useState("all");
  const [q, setQ] = useState("");
  const [favorites, setFavorites] = useState(loadFavoriteReports);
  const { toast } = useWorkspaceUi();

  const domains = useMemo(
    () => ["all", ...new Set(REPORT_CATALOG.map((r) => r.domain))],
    [],
  );

  const list = REPORT_CATALOG.filter((r) => {
    if (domain !== "all" && r.domain !== domain) return false;
    if (q && !`${r.title} ${r.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  function toggleFav(id: string) {
    const next = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
    setFavorites(next);
    saveFavoriteReports(next);
    toast({ tone: "ok", title: next.includes(id) ? "Report favorited" : "Removed favorite" });
  }

  return (
    <div className="stack bi-page">
      <PageHeader
        title="Enterprise Report Center"
        lead="Executive and operational report library — summaries, charts, filters, export, print, and schedule UI over existing Reporting contracts."
        actions={
          <Toolbar>
            <Link className="btn btn--ghost" to="/app/analytics">Intelligence</Link>
            <Link className="btn btn--ghost" to="/app/reporting">Legacy reporting module</Link>
            <Link className="btn btn--primary" to="/app/insights">Insights</Link>
          </Toolbar>
        }
      />
      <AnalyticsFilterBar value={filters} onChange={setFilters} />
      <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <input
          className="field__input"
          style={{ maxWidth: 280 }}
          placeholder="Search reports…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search reports"
        />
        <div className="p5-seg" role="group" aria-label="Domain">
          {domains.map((d) => (
            <button
              key={d}
              type="button"
              className={domain === d ? "is-active" : undefined}
              aria-pressed={domain === d}
              onClick={() => setDomain(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {favorites.length > 0 ? (
        <section className="ws-card">
          <header className="ws-card__head"><h2>Favorite reports</h2></header>
          <div className="ws-card__body bi-module-list">
            {REPORT_CATALOG.filter((r) => favorites.includes(r.id)).map((r) => (
              <Link key={r.id} to={r.href} className="bi-module-link">
                <strong>{r.title}</strong>
                <span>{r.domain}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="bi-module-list">
        {list.map((r) => (
          <div key={r.id} className="bi-report-row">
            <Link to={r.href} className="bi-module-link">
              <strong>{r.title}</strong>
              <span>{r.domain} · {r.description}</span>
            </Link>
            <button
              type="button"
              className="ws-icon-btn"
              aria-pressed={favorites.includes(r.id)}
              onClick={() => toggleFav(r.id)}
            >
              {favorites.includes(r.id) ? "★" : "☆"}
            </button>
          </div>
        ))}
        {list.length === 0 ? (
          <EmptyState title="No reports match" body="Adjust domain or search filters." />
        ) : null}
      </div>
    </div>
  );
}

function ReportDetail() {
  const { domain } = useParams();
  const report =
    REPORT_CATALOG.find((r) => r.href.endsWith(`/${domain}`)) ??
    REPORT_CATALOG.find((r) => r.domain.toLowerCase() === domain);
  const [tab, setTab] = useState("summary");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [views, setViews] = useState(loadSavedReportViews);
  const [viewName, setViewName] = useState("");
  const { toast } = useWorkspaceUi();

  if (!report) {
    return <Navigate to="/app/reports" replace />;
  }

  return (
    <div className="stack bi-page">
      <PageHeader
        title={report.title}
        lead={report.description}
        actions={
          <Toolbar>
            <Link className="btn btn--ghost" to="/app/reports">All reports</Link>
            <Link className="btn btn--primary" to={`/app/${report.domain.toLowerCase() === "executive" || report.domain === "Operational" ? "analytics" : report.domain.toLowerCase()}`}>
              Drill to module
            </Link>
          </Toolbar>
        }
      />
      <AnalyticsFilterBar value={filters} onChange={setFilters} />
      <ExportActions reportName={report.title} />
      <Tabs
        tabs={[
          { id: "summary", label: "Summary" },
          { id: "table", label: "Interactive table" },
          { id: "charts", label: "Charts" },
          { id: "schedule", label: "Schedule" },
          { id: "views", label: "Saved views" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "summary" ? (
        <div className="bi-kpi-grid">
          <article className="bi-kpi"><span className="bi-kpi__label">Records</span><strong className="bi-kpi__value">128</strong></article>
          <article className="bi-kpi"><span className="bi-kpi__label">Ready</span><strong className="bi-kpi__value">96</strong></article>
          <article className="bi-kpi"><span className="bi-kpi__label">Scheduled</span><strong className="bi-kpi__value">14</strong></article>
          <article className="bi-kpi"><span className="bi-kpi__label">Failed</span><strong className="bi-kpi__value">2</strong></article>
        </div>
      ) : null}

      {tab === "table" ? (
        <VirtualizedTable
          columns={["ID", "Report", "Status", "Period"]}
          rows={REPORT_TABLE_ROWS}
        />
      ) : null}

      {tab === "charts" ? (
        <div className="bi-grid">
          <section className="ws-card"><div className="ws-card__body"><LineChart values={SERIES.revenue} label="Trend" /></div></section>
          <section className="ws-card"><div className="ws-card__body"><BarChart values={SERIES.production} label="Volume" /></div></section>
          <section className="ws-card">
            <div className="ws-card__body">
              <DonutChart
                label="Status mix"
                slices={[
                  { name: "Ready", value: 70, color: "#1f6f6a" },
                  { name: "Draft", value: 20, color: "#c46b3a" },
                  { name: "Failed", value: 10, color: "#b42318" },
                ]}
              />
            </div>
          </section>
        </div>
      ) : null}

      {tab === "schedule" ? <ScheduleReportUi reportName={report.title} /> : null}

      {tab === "views" ? (
        <section className="ws-card">
          <div className="ws-card__body stack">
            <div className="row">
              <input
                className="field__input"
                placeholder="Saved view name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
              />
              <button
                type="button"
                className="btn btn--primary"
                disabled={!viewName.trim()}
                onClick={() => {
                  const next = [
                    ...views,
                    { id: `rv-${Date.now()}`, reportId: report.id, label: viewName.trim(), filters },
                  ].slice(0, 20);
                  setViews(next);
                  saveSavedReportViews(next);
                  setViewName("");
                  toast({ tone: "ok", title: "View saved locally" });
                }}
              >
                Save view
              </button>
            </div>
            <ul className="ws-feed">
              {views.filter((v) => v.reportId === report.id).map((v) => (
                <li key={v.id}>
                  <strong>{v.label}</strong>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setFilters(v.filters)}
                  >
                    Apply
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function ReportsCenterPage() {
  return (
    <Routes>
      <Route index element={<ReportsHome />} />
      <Route path=":domain" element={<ReportDetail />} />
      <Route path="*" element={<Navigate to="/app/reports" replace />} />
    </Routes>
  );
}
