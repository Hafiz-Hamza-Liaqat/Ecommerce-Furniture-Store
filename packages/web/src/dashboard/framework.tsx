/**
 * Dashboard framework — widgets, cards, chart placeholders, activity feeds.
 * Reporting calculations remain backend-owned.
 */

import type { ReactNode } from "react";

export function SummaryWidget({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}) {
  return (
    <article className="panel widget">
      <div className="widget__label">{label}</div>
      <div className="widget__value">{value}</div>
      {hint ? <p style={{ margin: "0.4rem 0 0", color: "var(--afh-ink-soft)" }}>{hint}</p> : null}
    </article>
  );
}

export function ChartCard({
  title,
  caption,
}: {
  readonly title: string;
  readonly caption: string;
}) {
  return (
    <section className="panel widget">
      <h2 style={{ margin: "0 0 0.75rem", fontFamily: "var(--afh-font-brand)" }}>
        {title}
      </h2>
      <div className="chart-placeholder" role="img" aria-label={caption}>
        {caption}
      </div>
    </section>
  );
}

export function ActivityFeed({
  items,
}: {
  readonly items: readonly { id: string; title: string; meta: string }[];
}) {
  return (
    <section className="panel widget">
      <h2 style={{ margin: "0 0 0.5rem", fontFamily: "var(--afh-font-brand)" }}>
        Activity
      </h2>
      <ul className="activity-feed">
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.title}</strong>
            <div style={{ color: "var(--afh-ink-soft)", fontSize: "0.9rem" }}>
              {item.meta}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardGrid({ children }: { readonly children: ReactNode }) {
  return <div className="stack">{children}</div>;
}
