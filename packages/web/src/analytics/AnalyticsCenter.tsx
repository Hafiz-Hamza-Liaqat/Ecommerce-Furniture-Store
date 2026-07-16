import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { PageHeader, Alert } from "../components/ui";
import { Tabs, Toolbar, ChartCard } from "../workspace/widgets";
import {
  AreaChart,
  BarChart,
  CalendarHeatmap,
  DonutChart,
  GaugeChart,
  Heatmap,
  HorizontalBarChart,
  LineChart,
  LocationMap,
  ProgressList,
  ProgressRing,
  RadarChart,
  SankeyPlaceholder,
  ScatterPlot,
  StackedBarChart,
  TimelineChart,
  TreeMap,
  WaterfallChart,
} from "../workspace/charts";
import { useSession } from "../state/session";
import { ApiClientError } from "../api/types";
import { HEATMAP, MAP_POINTS, SERIES } from "../workspace/data";
import {
  COMPARISONS,
  DEPT_PERFORMANCE,
  FORECAST_SERIES,
  MODULE_KPI_PACKS,
  PERIOD_SUMMARIES,
  type ModuleKpiPack,
} from "./data";
import {
  AnalyticsErrorBoundary,
  AnalyticsFilterBar,
  ComparisonCard,
  DEFAULT_FILTERS,
  ExportActions,
  ForecastPanel,
  KpiCard,
  LazyChartCard,
  useIncrementalItems,
  type AnalyticsFilters,
} from "./shared";
import { DashboardBuilderPage } from "./DashboardBuilderPage";

function AnalyticsHome() {
  const [tab, setTab] = useState("overview");
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const depts = useIncrementalItems(DEPT_PERFORMANCE, 3, 60);
  const periods = useIncrementalItems(PERIOD_SUMMARIES, 2, 90);

  return (
    <div className="stack bi-page">
      <PageHeader
        title="Executive Intelligence Center"
        lead="Enterprise overview, scorecards, and period briefings — visualization over Reporting snapshots and module summary queries."
        actions={
          <Toolbar>
            <Link className="btn btn--ghost" to="/app/analytics/builder">Dashboard builder</Link>
            <Link className="btn btn--ghost" to="/app/reports">Report center</Link>
            <Link className="btn btn--primary" to="/app/insights">Insights</Link>
          </Toolbar>
        }
      />
      <AnalyticsFilterBar value={filters} onChange={setFilters} />
      <ExportActions reportName="Executive intelligence" />
      <Tabs
        tabs={[
          { id: "overview", label: "Enterprise overview" },
          { id: "scorecards", label: "Scorecards" },
          { id: "departments", label: "Departments" },
          { id: "periods", label: "Period summaries" },
          { id: "compare", label: "Comparisons" },
          { id: "forecast", label: "Forecast" },
          { id: "viz", label: "Visualization lab" },
          { id: "kpis", label: "KPI center" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" ? (
        <AnalyticsErrorBoundary>
          <div className="bi-kpi-grid">
            {MODULE_KPI_PACKS.slice(0, 8).map((pack) => (
              <KpiCard key={pack.id} kpi={pack.kpis[0]!} spark={pack.series.slice(-8)} />
            ))}
          </div>
          <div className="bi-grid">
            <LazyChartCard title="Business performance">
              <LineChart values={SERIES.revenue} label="Revenue trend" labels={["Jan", "Dec"]} />
            </LazyChartCard>
            <LazyChartCard title="Operational summary">
              <BarChart values={SERIES.production} label="Production" labels={["Q1", "Q4"]} />
            </LazyChartCard>
            <LazyChartCard title="Company health">
              <GaugeChart value={84} label="Health index" />
            </LazyChartCard>
            <LazyChartCard title="Network map">
              <LocationMap points={MAP_POINTS} label="Geo" />
            </LazyChartCard>
          </div>
        </AnalyticsErrorBoundary>
      ) : null}

      {tab === "scorecards" ? (
        <div className="bi-grid">
          {DEPT_PERFORMANCE.map((d) => (
            <Link key={d.name} to={d.href} className="bi-scorecard">
              <h3>{d.name}</h3>
              <ProgressRing pct={d.score} label={d.name} />
              <span>Open module →</span>
            </Link>
          ))}
        </div>
      ) : null}

      {tab === "departments" ? (
        <div className="stack">
          <ProgressList
            label="Department performance"
            items={depts.map((d) => ({ name: d.name, pct: d.score }))}
          />
          <LazyChartCard title="Radar — relative strength">
            <RadarChart
              axes={DEPT_PERFORMANCE.slice(0, 6).map((d) => d.name.slice(0, 4))}
              values={DEPT_PERFORMANCE.slice(0, 6).map((d) => d.score)}
              label="Departments"
            />
          </LazyChartCard>
        </div>
      ) : null}

      {tab === "periods" ? (
        <div className="bi-period-grid">
          {periods.map((p) => (
            <article key={p.id} className="ws-card">
              <div className="ws-card__body stack">
                <h3>{p.label}</h3>
                <p>{p.body}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "compare" ? (
        <div className="bi-kpi-grid">
          {COMPARISONS.map((c) => (
            <ComparisonCard key={c.id} {...c} />
          ))}
        </div>
      ) : null}

      {tab === "forecast" ? (
        <ForecastPanel {...FORECAST_SERIES} />
      ) : null}

      {tab === "viz" ? (
        <div className="bi-grid">
          <LazyChartCard title="Area"><AreaChart values={SERIES.revenue} label="Area revenue" /></LazyChartCard>
          <LazyChartCard title="Horizontal bars">
            <HorizontalBarChart
              label="Branches"
              items={[{ name: "Lahore", value: 92 }, { name: "Karachi", value: 84 }, { name: "Islamabad", value: 78 }]}
            />
          </LazyChartCard>
          <LazyChartCard title="Stacked bars">
            <StackedBarChart
              label="Mix"
              labels={["Q1", "Q2", "Q3", "Q4"]}
              series={[
                { name: "Sales", values: [40, 45, 48, 52], color: "var(--afh-teal)" },
                { name: "Service", values: [12, 14, 15, 16], color: "var(--afh-copper)" },
              ]}
            />
          </LazyChartCard>
          <LazyChartCard title="Donut">
            <DonutChart
              label="Mix"
              slices={[
                { name: "Projects", value: 40, color: "#1f6f6a" },
                { name: "Catalog", value: 35, color: "#c46b3a" },
                { name: "Service", value: 25, color: "#2a3444" },
              ]}
            />
          </LazyChartCard>
          <LazyChartCard title="Scatter"><ScatterPlot label="Scatter" points={[{ x: 10, y: 20, name: "A" }, { x: 40, y: 55, name: "B" }, { x: 70, y: 40, name: "C" }, { x: 90, y: 80, name: "D" }]} /></LazyChartCard>
          <LazyChartCard title="Tree map">
            <TreeMap
              label="Segments"
              items={[
                { name: "Hospitality", value: 40, color: "rgba(31,111,106,0.55)" },
                { name: "Corporate", value: 30, color: "rgba(196,107,58,0.55)" },
                { name: "Retail", value: 20, color: "rgba(42,52,68,0.45)" },
                { name: "Other", value: 10, color: "rgba(20,26,34,0.25)" },
              ]}
            />
          </LazyChartCard>
          <LazyChartCard title="Heatmap"><Heatmap grid={HEATMAP} label="Ops heat" /></LazyChartCard>
          <LazyChartCard title="Calendar heat">
            <CalendarHeatmap label="Activity" days={Array.from({ length: 35 }, (_, i) => (i * 7) % 9)} />
          </LazyChartCard>
          <LazyChartCard title="Waterfall">
            <WaterfallChart
              label="Bridge"
              steps={[
                { name: "Start", value: 40 },
                { name: "Sales", value: 18 },
                { name: "Cost", value: -12 },
                { name: "Other", value: 4 },
              ]}
            />
          </LazyChartCard>
          <LazyChartCard title="Timeline">
            <TimelineChart
              label="Roadmap"
              items={[
                { name: "Design", start: 0, end: 30 },
                { name: "Build", start: 25, end: 70 },
                { name: "Install", start: 65, end: 95 },
              ]}
            />
          </LazyChartCard>
          <LazyChartCard title="Sankey"><SankeyPlaceholder label="Flow" /></LazyChartCard>
        </div>
      ) : null}

      {tab === "kpis" ? (
        <div className="bi-module-list">
          {MODULE_KPI_PACKS.map((pack) => (
            <Link key={pack.id} className="bi-module-link" to={`/app/analytics/kpis/${pack.id}`}>
              <strong>{pack.title}</strong>
              <span>{pack.kpis.length} KPIs · drill to module</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ModuleKpiPage() {
  const { moduleId } = useParams();
  const pack = MODULE_KPI_PACKS.find((p) => p.id === moduleId);
  const { api, user, setLastCorrelationId } = useSession();
  const [live, setLive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pack?.summaryQueryType || !user?.companyId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.dispatchQuery({
          queryType: pack.summaryQueryType!,
          payload: { companyId: user.companyId },
        });
        if (cancelled) return;
        setLastCorrelationId(res.correlationId);
        setLive(JSON.stringify(res.data, null, 2));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          setLastCorrelationId(err.correlationId);
          setError(`${err.message} (${err.code})`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, pack, setLastCorrelationId, user?.companyId]);

  if (!pack) {
    return <Navigate to="/app/analytics" replace />;
  }

  return <ModuleKpiView pack={pack} live={live} error={error} loading={loading} />;
}

function ModuleKpiView({
  pack,
  live,
  error,
  loading,
}: {
  readonly pack: ModuleKpiPack;
  readonly live: string | null;
  readonly error: string | null;
  readonly loading: boolean;
}) {
  const filtersDefault = useMemo(() => DEFAULT_FILTERS, []);
  const [filters, setFilters] = useState(filtersDefault);

  return (
    <div className="stack bi-page">
      <PageHeader
        title={`${pack.title} KPI Center`}
        lead="Module KPIs with drill-down into existing lists and records. Live summary shown when the module query is available."
        actions={
          <Toolbar>
            <Link className="btn btn--ghost" to="/app/analytics">Intelligence center</Link>
            <Link className="btn btn--primary" to={pack.modulePath}>Open module</Link>
          </Toolbar>
        }
      />
      <AnalyticsFilterBar value={filters} onChange={setFilters} />
      <ExportActions reportName={`${pack.title} KPIs`} />
      {loading ? <Alert tone="info">Loading live summary…</Alert> : null}
      {error ? <Alert tone="warn">{error} — showing presentation fixtures.</Alert> : null}
      <div className="bi-kpi-grid">
        {pack.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} spark={pack.series.slice(-8)} />
        ))}
      </div>
      <div className="bi-grid">
        <ChartCard title={pack.seriesLabel}>
          <LineChart values={pack.series} label={pack.seriesLabel} />
        </ChartCard>
        <ChartCard title="Distribution">
          <BarChart values={pack.series.slice(-6)} label={`${pack.title} bars`} />
        </ChartCard>
      </div>
      {live ? (
        <section className="ws-card">
          <header className="ws-card__head"><h2>Live summary payload</h2></header>
          <div className="ws-card__body">
            <pre className="erp-pre">{live}</pre>
          </div>
        </section>
      ) : null}
      <p className="p5-muted">
        Drill path: KPI → chart → module list → record detail (existing module pages).
      </p>
    </div>
  );
}

export function AnalyticsCenterPage() {
  return (
    <Routes>
      <Route index element={<AnalyticsHome />} />
      <Route path="builder" element={<DashboardBuilderPage />} />
      <Route path="kpis/:moduleId" element={<ModuleKpiPage />} />
      <Route path="*" element={<Navigate to="/app/analytics" replace />} />
    </Routes>
  );
}
