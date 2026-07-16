import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui";
import { EmptyState, Skeleton, StatusBadge } from "../workspace/widgets";
import { useWorkspaceUi } from "../workspace/context";
import type { KpiDef } from "./data";
import { Sparkline } from "../workspace/charts";

export type AnalyticsFilters = {
  dateFrom: string;
  dateTo: string;
  relative: string;
  company: string;
  branch: string;
  department: string;
  warehouse: string;
  customer: string;
  supplier: string;
  employee: string;
  project: string;
  currency: string;
  region: string;
  status: string;
  tags: string;
};

export const DEFAULT_FILTERS: AnalyticsFilters = {
  dateFrom: "",
  dateTo: "",
  relative: "mtd",
  company: "all",
  branch: "all",
  department: "all",
  warehouse: "all",
  customer: "",
  supplier: "",
  employee: "",
  project: "",
  currency: "PKR",
  region: "all",
  status: "all",
  tags: "",
};

export function AnalyticsFilterBar({
  value,
  onChange,
}: {
  readonly value: AnalyticsFilters;
  readonly onChange: (next: AnalyticsFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  function set<K extends keyof AnalyticsFilters>(key: K, v: AnalyticsFilters[K]) {
    onChange({ ...value, [key]: v });
  }
  return (
    <div className="bi-filters">
      <div className="bi-filters__row">
        <label>
          <span>Relative</span>
          <select value={value.relative} onChange={(e) => set("relative", e.target.value)}>
            <option value="today">Today</option>
            <option value="wtd">Week to date</option>
            <option value="mtd">Month to date</option>
            <option value="qtd">Quarter to date</option>
            <option value="ytd">Year to date</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        <label>
          <span>From</span>
          <input type="date" value={value.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} />
        </label>
        <label>
          <span>To</span>
          <input type="date" value={value.dateTo} onChange={(e) => set("dateTo", e.target.value)} />
        </label>
        <label>
          <span>Company</span>
          <select value={value.company} onChange={(e) => set("company", e.target.value)}>
            <option value="all">All</option>
            <option value="afh-pk">AFH Pakistan</option>
          </select>
        </label>
        <label>
          <span>Branch</span>
          <select value={value.branch} onChange={(e) => set("branch", e.target.value)}>
            <option value="all">All</option>
            <option value="lahore">Lahore HQ</option>
            <option value="karachi">Karachi</option>
          </select>
        </label>
        <button type="button" className="btn btn--ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "Fewer filters" : "More filters"}
        </button>
      </div>
      {open ? (
        <div className="bi-filters__row">
          {(
            [
              ["department", "Department", ["all", "Sales", "Finance", "Ops"]],
              ["warehouse", "Warehouse", ["all", "WH-A", "WH-B"]],
              ["currency", "Currency", ["PKR", "USD", "EUR"]],
              ["region", "Region", ["all", "North", "South", "Central"]],
              ["status", "Status", ["all", "Open", "Closed", "At risk"]],
            ] as const
          ).map(([key, label, opts]) => (
            <label key={key}>
              <span>{label}</span>
              <select
                value={value[key]}
                onChange={(e) => set(key, e.target.value)}
              >
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            <span>Customer</span>
            <input value={value.customer} onChange={(e) => set("customer", e.target.value)} />
          </label>
          <label>
            <span>Supplier</span>
            <input value={value.supplier} onChange={(e) => set("supplier", e.target.value)} />
          </label>
          <label>
            <span>Employee</span>
            <input value={value.employee} onChange={(e) => set("employee", e.target.value)} />
          </label>
          <label>
            <span>Project</span>
            <input value={value.project} onChange={(e) => set("project", e.target.value)} />
          </label>
          <label>
            <span>Tags</span>
            <input value={value.tags} onChange={(e) => set("tags", e.target.value)} placeholder="custom tags" />
          </label>
        </div>
      ) : null}
    </div>
  );
}

export function KpiCard({
  kpi,
  spark,
}: {
  readonly kpi: KpiDef;
  readonly spark?: readonly number[];
}) {
  return (
    <Link to={kpi.href} className="bi-kpi">
      <span className="bi-kpi__label">{kpi.label}</span>
      <strong className="bi-kpi__value">{kpi.value}</strong>
      <div className="bi-kpi__meta">
        {typeof kpi.trend === "number" ? (
          <StatusBadge
            status={`${kpi.trend >= 0 ? "+" : ""}${kpi.trend}%`}
            tone={kpi.trend >= 0 ? "ok" : "warn"}
          />
        ) : null}
        {kpi.hint ? <span className="p5-muted">{kpi.hint}</span> : null}
        {spark ? <Sparkline values={spark} label={kpi.label} /> : null}
      </div>
      <span className="bi-kpi__drill">Drill down →</span>
    </Link>
  );
}

export function ComparisonCard({
  label,
  current,
  previous,
  delta,
}: {
  readonly label: string;
  readonly current: string;
  readonly previous: string;
  readonly delta: string;
}) {
  return (
    <article className="bi-compare">
      <h3>{label}</h3>
      <div className="bi-compare__grid">
        <div>
          <span>Current</span>
          <strong>{current}</strong>
        </div>
        <div>
          <span>Compare</span>
          <strong>{previous}</strong>
        </div>
      </div>
      <StatusBadge status={delta} tone={delta.startsWith("-") ? "warn" : "ok"} />
    </article>
  );
}

export function ForecastPanel({
  available,
  values,
  label,
}: {
  readonly available: boolean;
  readonly values: readonly number[];
  readonly label: string;
}) {
  if (!available || values.length === 0) {
    return (
      <EmptyState
        title="Forecast unavailable"
        body="Display forecast series when Reporting/forecast APIs return data. No prediction engine runs in the browser."
      />
    );
  }
  return (
    <div className="ws-card">
      <div className="ws-card__body">
        <h3>{label}</h3>
        <Sparkline values={values} label={label} />
      </div>
    </div>
  );
}

export function ExportActions({ reportName }: { readonly reportName: string }) {
  const { toast } = useWorkspaceUi();
  function run(fmt: string) {
    toast({
      tone: "ok",
      title: `${fmt} export queued`,
      body: `${reportName} — generation remains on existing export contracts.`,
    });
  }
  return (
    <div className="bi-export row">
      <Button variant="ghost" onClick={() => run("PDF")}>PDF</Button>
      <Button variant="ghost" onClick={() => run("Excel")}>Excel</Button>
      <Button variant="ghost" onClick={() => run("CSV")}>CSV</Button>
      <Button variant="ghost" onClick={() => run("Image")}>Image</Button>
      <Button variant="ghost" onClick={() => window.print()}>Print</Button>
    </div>
  );
}

export function ScheduleReportUi({ reportName }: { readonly reportName: string }) {
  const { toast } = useWorkspaceUi();
  const [freq, setFreq] = useState("weekly");
  const [dest, setDest] = useState("");
  const [format, setFormat] = useState("PDF");
  return (
    <section className="ws-card bi-schedule">
      <div className="ws-card__body stack">
        <h3>Schedule report (UI only)</h3>
        <p className="p5-muted">Presentation — no scheduler is started from the browser.</p>
        <div className="erp-form-grid">
          <label className="field">
            <span className="field__label">Frequency</span>
            <select className="field__input" value={freq} onChange={(e) => setFreq(e.target.value)}>
              {["daily", "weekly", "monthly", "quarterly", "yearly"].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Email destination</span>
            <input className="field__input" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="ops@afh.local" />
          </label>
          <label className="field">
            <span className="field__label">Format</span>
            <select className="field__input" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option>PDF</option>
              <option>Excel</option>
              <option>CSV</option>
            </select>
          </label>
        </div>
        <Button
          onClick={() =>
            toast({
              tone: "info",
              title: "Schedule draft saved locally",
              body: `${reportName} · ${freq} · ${format}${dest ? ` · ${dest}` : ""} — delivery via notification preferences UI.`,
            })
          }
        >
          Save schedule draft
        </Button>
      </div>
    </section>
  );
}

export function VirtualizedTable({
  columns,
  rows,
  rowHeight = 40,
  height = 280,
}: {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly rowHeight?: number;
  readonly height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const visibleCount = Math.ceil(height / rowHeight) + 4;
  const slice = rows.slice(start, start + visibleCount);
  const offsetY = start * rowHeight;

  return (
    <div
      className="bi-vtable"
      style={{ height }}
      ref={ref}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: rows.length * rowHeight, position: "relative" }}>
        <table className="ws-table" style={{ transform: `translateY(${offsetY}px)` }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr key={`${start + i}-${row[0]}`} style={{ height: rowHeight }}>
                {row.map((cell, ci) => (
                  <td key={ci}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LazyChartCard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setReady(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section className="ws-card" ref={ref}>
      <header className="ws-card__head">
        <h2>{title}</h2>
      </header>
      <div className="ws-card__body">{ready ? children : <Skeleton rows={3} />}</div>
    </section>
  );
}

export class AnalyticsErrorBoundary extends Component<
  { readonly children: ReactNode; readonly fallback?: ReactNode },
  { error: string | null }
> {
  override state: { error: string | null } = { error: null };
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  override render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <EmptyState title="Analytics panel failed" body={this.state.error} />
        )
      );
    }
    return this.props.children;
  }
}

export function useIncrementalItems<T>(items: readonly T[], step = 4, delay = 80): T[] {
  const [count, setCount] = useState(Math.min(step, items.length));
  useEffect(() => {
    setCount(Math.min(step, items.length));
    if (items.length <= step) return;
    const t = window.setInterval(() => {
      setCount((c) => {
        if (c >= items.length) {
          window.clearInterval(t);
          return c;
        }
        return Math.min(items.length, c + step);
      });
    }, delay);
    return () => window.clearInterval(t);
  }, [items, step, delay]);
  return useMemo(() => items.slice(0, count), [items, count]);
}
