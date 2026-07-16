import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Button } from "../components/ui";
import { Toolbar, EmptyState } from "../workspace/widgets";
import { BarChart, DonutChart, FunnelChart, GaugeChart, Heatmap, LineChart, LocationMap, RadarChart } from "../workspace/charts";
import { CRM_FUNNEL, HEATMAP, MAP_POINTS, SERIES } from "../workspace/data";
import { BUILDER_WIDGETS, COMPARISONS, DEPT_PERFORMANCE } from "./data";
import { ComparisonCard } from "./shared";
import { useWorkspaceUi } from "../workspace/context";
import {
  defaultBuilderLayout,
  loadBuilderLayout,
  loadSharedDashboards,
  saveBuilderLayout,
  saveSharedDashboards,
  type BuilderLayoutItem,
} from "./prefs";

const SIZE_CYCLE = ["sm", "md", "lg"] as const;

export function DashboardBuilderPage() {
  const [layout, setLayout] = useState<BuilderLayoutItem[]>(() => loadBuilderLayout());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [shared, setShared] = useState(loadSharedDashboards);
  const [name, setName] = useState("Personal analytics");
  const { toast } = useWorkspaceUi();

  const visible = useMemo(() => layout.filter((i) => !i.hidden), [layout]);

  function persist(next: BuilderLayoutItem[]) {
    setLayout(next);
    saveBuilderLayout(next);
  }

  function addWidget(id: string) {
    if (layout.some((i) => i.id === id)) {
      persist(layout.map((i) => (i.id === id ? { ...i, hidden: false } : i)));
    } else {
      const def = BUILDER_WIDGETS.find((w) => w.id === id);
      if (!def) return;
      persist([...layout, { id: def.id, label: def.label, kind: def.kind, size: "md", hidden: false }]);
    }
    setPickerOpen(false);
    toast({ tone: "ok", title: "Widget added" });
  }

  function remove(id: string) {
    persist(layout.filter((i) => i.id !== id));
  }

  function duplicate(id: string) {
    const src = layout.find((i) => i.id === id);
    if (!src) return;
    const copy: BuilderLayoutItem = {
      ...src,
      id: `${src.id}-copy-${Date.now()}`,
      label: `${src.label} (copy)`,
    };
    persist([...layout, copy]);
  }

  function cycleSize(id: string) {
    persist(
      layout.map((i) => {
        if (i.id !== id) return i;
        const idx = SIZE_CYCLE.indexOf(i.size);
        return { ...i, size: SIZE_CYCLE[(idx + 1) % SIZE_CYCLE.length]! };
      }),
    );
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...layout];
    const from = next.findIndex((i) => i.id === dragId);
    const to = next.findIndex((i) => i.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    persist(next);
    setDragId(null);
  }

  function share() {
    const next = [
      { id: `shared-${Date.now()}`, name, layout },
      ...shared,
    ].slice(0, 12);
    setShared(next);
    saveSharedDashboards(next);
    toast({ tone: "ok", title: "Shared dashboard draft saved locally" });
  }

  return (
    <div className="stack bi-page">
      <PageHeader
        title="Dashboard builder"
        lead="Pick, resize, drag, duplicate, and save personal or shared dashboards. Layouts persist locally when backend contracts are absent."
        actions={
          <Toolbar>
            <Link className="btn btn--ghost" to="/app/analytics">Back</Link>
            <Button variant="ghost" onClick={() => setPickerOpen((v) => !v)}>
              Widget picker
            </Button>
            <Button variant="ghost" onClick={() => { persist(defaultBuilderLayout()); toast({ tone: "info", title: "Layout reset" }); }}>
              Reset
            </Button>
            <Button onClick={share}>Share draft</Button>
          </Toolbar>
        }
      />

      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Dashboard name" />
        <span className="p5-muted">Favorites: pin via star on Intelligence Center · Shared drafts below</span>
      </div>

      {pickerOpen ? (
        <div className="bi-picker">
          {BUILDER_WIDGETS.map((w) => (
            <button key={w.id} type="button" className="bi-picker__tile" onClick={() => addWidget(w.id)}>
              <strong>{w.label}</strong>
              <span>{w.kind}</span>
            </button>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title="No widgets"
          body="Open the widget picker to build your dashboard."
          action={<Button onClick={() => setPickerOpen(true)}>Add widgets</Button>}
        />
      ) : (
        <div className="bi-builder-grid">
          {visible.map((item) => (
            <article
              key={item.id}
              className={`bi-builder-slot bi-builder-slot--${item.size}`}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(item.id)}
            >
              <header className="bi-builder-slot__head">
                <strong>{item.label}</strong>
                <div className="row">
                  <button type="button" className="ws-icon-btn" onClick={() => cycleSize(item.id)}>Size</button>
                  <button type="button" className="ws-icon-btn" onClick={() => duplicate(item.id)}>Duplicate</button>
                  <button type="button" className="ws-icon-btn" onClick={() => remove(item.id)}>Delete</button>
                </div>
              </header>
              <div className="bi-builder-slot__body">{renderWidget(item.kind)}</div>
            </article>
          ))}
        </div>
      )}

      {shared.length > 0 ? (
        <section className="ws-card">
          <header className="ws-card__head"><h2>Shared dashboards</h2></header>
          <div className="ws-card__body">
            <ul className="ws-feed">
              {shared.map((s) => (
                <li key={s.id}>
                  <strong>{s.name}</strong>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      persist(s.layout);
                      toast({ tone: "ok", title: "Shared layout applied" });
                    }}
                  >
                    Load
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

function renderWidget(kind: string) {
  switch (kind) {
    case "line":
      return <LineChart values={SERIES.revenue} label="Revenue" />;
    case "bar":
      return <BarChart values={SERIES.production} label="Orders" />;
    case "funnel":
      return <FunnelChart stages={CRM_FUNNEL.map((s) => ({ stage: s.stage, value: s.value }))} label="Pipeline" />;
    case "radar":
      return (
        <RadarChart
          axes={DEPT_PERFORMANCE.slice(0, 6).map((d) => d.name.slice(0, 3))}
          values={DEPT_PERFORMANCE.slice(0, 6).map((d) => d.score)}
          label="Dept"
        />
      );
    case "donut":
      return (
        <DonutChart
          label="Mix"
          slices={[
            { name: "A", value: 40, color: "#1f6f6a" },
            { name: "B", value: 35, color: "#c46b3a" },
            { name: "C", value: 25, color: "#2a3444" },
          ]}
        />
      );
    case "compare":
      return (
        <div className="bi-kpi-grid">
          {COMPARISONS.slice(0, 2).map((c) => (
            <ComparisonCard key={c.id} {...c} />
          ))}
        </div>
      );
    case "heatmap":
      return <Heatmap grid={HEATMAP} label="Heat" />;
    case "map":
      return <LocationMap points={MAP_POINTS} label="Map" />;
    case "gauge":
      return <GaugeChart value={84} label="Health" />;
    case "kpis":
    default:
      return (
        <div className="bi-kpi-grid">
          <article className="bi-kpi"><span className="bi-kpi__label">Revenue</span><strong className="bi-kpi__value">₨ 18.4M</strong></article>
          <article className="bi-kpi"><span className="bi-kpi__label">Orders</span><strong className="bi-kpi__value">312</strong></article>
          <article className="bi-kpi"><span className="bi-kpi__label">SLA</span><strong className="bi-kpi__value">97%</strong></article>
        </div>
      );
  }
}
