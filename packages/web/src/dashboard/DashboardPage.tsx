import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ACTIVITY,
  APPROVALS_PREVIEW,
  ASSIGNED_WORK,
  CRM_FUNNEL,
  DASH_WIDGETS,
  HEATMAP,
  KANBAN_PREVIEW,
  KPIS,
  MAP_POINTS,
  PIPELINE,
  PROJECT_PROGRESS,
  QUICK_ACTIONS,
  SERIES,
  SERVICE_WORKLOAD,
  type DashWidgetId,
  type WidgetSize,
} from "../workspace/data";
import {
  defaultLayout,
  loadLayout,
  saveLayout,
  type LayoutItem,
} from "../workspace/prefs";
import {
  BarChart,
  FunnelChart,
  Heatmap,
  LineChart,
  LocationMap,
  ProgressList,
} from "../workspace/charts";
import {
  ActivityFeed,
  DashboardGrid,
  StatCard,
  Toolbar,
  WidgetContainer,
  KanbanPreview,
} from "../workspace/widgets";
import { PageHeader } from "../components/ui";
import { useWorkspaceUi } from "../workspace/context";

const SIZE_CYCLE: WidgetSize[] = ["sm", "md", "lg"];

export function DashboardPage() {
  const [layout, setLayout] = useState<LayoutItem[]>(() => loadLayout());
  const [customize, setCustomize] = useState(false);
  const [dragId, setDragId] = useState<DashWidgetId | null>(null);
  const { toast } = useWorkspaceUi();

  const visible = useMemo(
    () => layout.filter((i) => !i.hidden),
    [layout],
  );

  function persist(next: LayoutItem[]) {
    setLayout(next);
    saveLayout(next);
  }

  function cycleSize(id: DashWidgetId) {
    persist(
      layout.map((i) => {
        if (i.id !== id) return i;
        const idx = SIZE_CYCLE.indexOf(i.size);
        return { ...i, size: SIZE_CYCLE[(idx + 1) % SIZE_CYCLE.length]! };
      }),
    );
  }

  function hide(id: DashWidgetId) {
    persist(layout.map((i) => (i.id === id ? { ...i, hidden: true } : i)));
    toast({ tone: "info", title: "Widget hidden", body: "Restore it from Customize." });
  }

  function toggleHidden(id: DashWidgetId) {
    persist(layout.map((i) => (i.id === id ? { ...i, hidden: !i.hidden } : i)));
  }

  function onDrop(targetId: DashWidgetId) {
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

  function reset() {
    const next = defaultLayout();
    persist(next);
    toast({ tone: "ok", title: "Layout reset" });
  }

  return (
    <div className="stack ws-exec">
      <PageHeader
        title="Executive dashboard"
        lead="Operational snapshot for leadership. Figures are presentation fixtures aligned to Reporting snapshots — calculations stay server-side."
        actions={
          <Toolbar>
            <button
              type="button"
              className={`btn ${customize ? "btn--primary" : "btn--ghost"}`}
              onClick={() => setCustomize((v) => !v)}
            >
              {customize ? "Done" : "Customize"}
            </button>
            <button type="button" className="btn btn--ghost" onClick={reset}>
              Reset layout
            </button>
          </Toolbar>
        }
      />

      {customize ? (
        <section className="ws-card ws-customize">
          <h2>Dashboard layout</h2>
          <p>Show, hide, drag to reorder, and cycle widget sizes. Preferences save in this browser.</p>
          <ul className="ws-customize__list">
            {layout.map((item) => {
              const def = DASH_WIDGETS.find((w) => w.id === item.id);
              return (
                <li key={item.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!item.hidden}
                      onChange={() => toggleHidden(item.id)}
                    />
                    {def?.title ?? item.id}
                  </label>
                  <span className="ws-badge ws-badge--neutral">{item.size}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <DashboardGrid>
        {visible.map((item) => (
          <div
            key={item.id}
            className={`ws-dash-slot ws-dash-slot--${item.size}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(item.id)}
          >
            <WidgetContainer
              title={DASH_WIDGETS.find((w) => w.id === item.id)?.title ?? item.id}
              size={item.size}
              {...(customize
                ? {
                    onHide: () => hide(item.id),
                    onResize: () => cycleSize(item.id),
                    dragHandleProps: {
                      draggable: true,
                      onDragStart: () => setDragId(item.id),
                      onDragEnd: () => setDragId(null),
                    },
                  }
                : {})}
            >
              <WidgetBody id={item.id} />
            </WidgetContainer>
          </div>
        ))}
      </DashboardGrid>
    </div>
  );
}

function WidgetBody({ id }: { readonly id: DashWidgetId }) {
  switch (id) {
    case "kpis":
      return (
        <div className="ws-kpi-strip">
          {KPIS.map((k) => (
            <StatCard
              key={k.id}
              label={k.label}
              value={k.value}
              trend={k.trend}
              href={k.href}
              {...(k.tone ? { tone: k.tone } : {})}
            />
          ))}
        </div>
      );
    case "revenue":
      return (
        <LineChart
          values={SERIES.revenue}
          labels={SERIES.months}
          label="Revenue trend"
          color="var(--afh-teal)"
        />
      );
    case "profit":
      return (
        <LineChart
          values={SERIES.profit}
          labels={SERIES.months}
          label="Profit trend"
          color="var(--afh-copper)"
        />
      );
    case "pipeline":
      return <FunnelChart stages={PIPELINE} label="Sales pipeline" />;
    case "cashflow":
      return (
        <BarChart
          values={SERIES.cashflow.slice(-6).map((v) => Math.abs(v))}
          labels={SERIES.months.slice(-6)}
          label="Cash flow"
        />
      );
    case "inventory":
      return (
        <LineChart
          values={SERIES.inventory}
          labels={SERIES.months}
          label="Inventory movement"
          color="var(--afh-teal)"
        />
      );
    case "production":
      return (
        <BarChart
          values={SERIES.production.slice(-8)}
          labels={SERIES.months.slice(-8)}
          label="Production output"
          color="var(--afh-copper)"
        />
      );
    case "utilization":
      return (
        <LineChart
          values={SERIES.utilization}
          labels={SERIES.months}
          label="Manufacturing utilization"
        />
      );
    case "funnel":
      return <FunnelChart stages={CRM_FUNNEL} label="CRM funnel" />;
    case "projects":
      return <ProgressList items={PROJECT_PROGRESS} label="Project progress" />;
    case "service":
      return (
        <BarChart
          values={SERVICE_WORKLOAD.map((s) => s.value)}
          labels={SERVICE_WORKLOAD.map((s) => s.label)}
          label="Service workload"
        />
      );
    case "attendance":
      return (
        <LineChart
          values={SERIES.attendance}
          labels={SERIES.months}
          label="Attendance overview"
          color="var(--afh-ok)"
        />
      );
    case "map":
      return <LocationMap points={MAP_POINTS} label="Warehouses, branches, customers, service regions" />;
    case "activity":
      return <ActivityFeed items={ACTIVITY} />;
    case "approvals":
      return (
        <ul className="ws-feed">
          {APPROVALS_PREVIEW.map((a) => (
            <li key={a.id}>
              <Link to="/app/approvals">
                <strong>{a.title}</strong>
              </Link>
              <span>
                {a.owner} · Due {a.due}
              </span>
            </li>
          ))}
        </ul>
      );
    case "assigned":
      return (
        <ul className="ws-feed">
          {ASSIGNED_WORK.map((w) => (
            <li key={w.id}>
              <Link to={w.href}>
                <strong>{w.title}</strong>
              </Link>
            </li>
          ))}
        </ul>
      );
    case "quick":
      return (
        <div className="ws-quick-grid">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.id} to={a.href} className="ws-quick-tile">
              <strong>{a.label}</strong>
              <span>{a.hint}</span>
            </Link>
          ))}
        </div>
      );
    case "heatmap":
      return <Heatmap grid={HEATMAP} label="Operations intensity heatmap" />;
    case "kanban":
      return <KanbanPreview columns={KANBAN_PREVIEW} />;
    default:
      return null;
  }
}
