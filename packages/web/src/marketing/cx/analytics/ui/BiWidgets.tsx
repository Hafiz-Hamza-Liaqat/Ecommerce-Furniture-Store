/**
 * RC10.6 — Analytics UI widgets (reuse design system; no third-party BI).
 */

import type { KpiMetric, NamedCount, NamedMoney, TrendPoint } from "../types";
import { BarChart, DonutChart, LineChart } from "../../../../workspace/charts";

const DONUT_COLORS = [
  "var(--afh-teal)",
  "var(--afh-copper)",
  "#4b5563",
  "#0f766e",
  "#b45309",
  "#1d4ed8",
  "#7c3aed",
  "#be123c",
];

export function BiKpiGrid({ items }: { readonly items: readonly KpiMetric[] }) {
  if (items.length === 0) {
    return <BiEmpty title="No KPIs" body="Operational data will appear here once workspace activity exists." />;
  }
  return (
    <div className="bi-kpi-grid cx-bi-kpi-grid" role="list">
      {items.map((k) => (
        <article key={k.id} className="bi-kpi" role="listitem">
          <span className="bi-kpi__label">{k.label}</span>
          <strong className="bi-kpi__value">{k.value}</strong>
          {k.hint ? <span className="bi-kpi__meta">{k.hint}</span> : null}
          {typeof k.trendPct === "number" ? (
            <span className={`cx-bi-trend ${k.trendPct >= 0 ? "is-up" : "is-down"}`}>
              {k.trendPct >= 0 ? "+" : ""}
              {k.trendPct}%
            </span>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function BiEmpty({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <div className="cx-bi-empty" role="status">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function BiLoading() {
  return (
    <div className="cx-bi-loading" aria-busy="true">
      Loading analytics…
    </div>
  );
}

export function BiComparisonCard({
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
      <span className={`cx-bi-trend ${delta.startsWith("-") ? "is-down" : "is-up"}`}>{delta}</span>
    </article>
  );
}

export function BiLinePanel({
  title,
  points,
}: {
  readonly title: string;
  readonly points: readonly TrendPoint[];
}) {
  if (points.length < 2) {
    return (
      <section className="ws-card">
        <header className="ws-card__head">
          <h2>{title}</h2>
        </header>
        <div className="ws-card__body">
          <BiEmpty title="Not enough trend data" body="Revenue points appear after delivered orders accumulate across months." />
        </div>
      </section>
    );
  }
  return (
    <section className="ws-card">
      <header className="ws-card__head">
        <h2>{title}</h2>
      </header>
      <div className="ws-card__body">
        <LineChart
          values={points.map((p) => p.value)}
          labels={points.map((p) => p.label)}
          label={title}
        />
      </div>
    </section>
  );
}

export function BiBarPanel({
  title,
  items,
  mode = "count",
}: {
  readonly title: string;
  readonly items: readonly NamedCount[] | readonly NamedMoney[];
  readonly mode?: "count" | "money";
}) {
  if (items.length === 0) {
    return (
      <section className="ws-card">
        <header className="ws-card__head">
          <h2>{title}</h2>
        </header>
        <div className="ws-card__body">
          <BiEmpty title="No data" body="Charts populate from filtered workspace records." />
        </div>
      </section>
    );
  }
  const values = items.map((i) => ("valuePkr" in i ? i.valuePkr : i.value));
  const labels = items.map((i) => i.name);
  return (
    <section className="ws-card">
      <header className="ws-card__head">
        <h2>{title}</h2>
      </header>
      <div className="ws-card__body">
        <BarChart values={values} labels={labels} label={title} />
        {mode === "money" ? (
          <ul className="cx-bi-legend">
            {items.map((i) => (
              <li key={i.name}>
                {i.name}:{" "}
                {"valuePkr" in i
                  ? `PKR ${i.valuePkr.toLocaleString("en-PK")}`
                  : i.value}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export function BiDonutPanel({
  title,
  items,
}: {
  readonly title: string;
  readonly items: readonly NamedCount[];
}) {
  if (items.length === 0 || items.every((i) => i.value === 0)) {
    return (
      <section className="ws-card">
        <header className="ws-card__head">
          <h2>{title}</h2>
        </header>
        <div className="ws-card__body">
          <BiEmpty title="No distribution" body="Pipeline or status counts will appear here." />
        </div>
      </section>
    );
  }
  return (
    <section className="ws-card">
      <header className="ws-card__head">
        <h2>{title}</h2>
      </header>
      <div className="ws-card__body cx-bi-donut">
        <DonutChart
          slices={items.map((i, idx) => ({
            name: i.name,
            value: i.value,
            color: DONUT_COLORS[idx % DONUT_COLORS.length]!,
          }))}
          label={title}
        />
      </div>
    </section>
  );
}

export function BiActivityList({
  title,
  items,
}: {
  readonly title: string;
  readonly items: readonly { id: string; at: string; title: string; body: string; href?: string }[];
}) {
  return (
    <section className="ws-card">
      <header className="ws-card__head">
        <h2>{title}</h2>
      </header>
      <div className="ws-card__body">
        {items.length === 0 ? (
          <BiEmpty title="No recent activity" body="Timeline and notification events will list here." />
        ) : (
          <ul className="ws-feed">
            {items.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <span className="cx-muted"> · {new Date(item.at).toLocaleString()}</span>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
