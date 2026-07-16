import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";

function useFocusTrap(active: boolean, onClose: () => void) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    if (!root) return;
    const focusable = root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || focusable.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [active, onClose]);
  return rootRef;
}

export function StatCard({
  label,
  value,
  trend,
  hint,
  href,
  tone = "neutral",
}: {
  readonly label: string;
  readonly value: string;
  readonly trend?: number;
  readonly hint?: string;
  readonly href?: string;
  readonly tone?: "ok" | "warn" | "neutral";
}) {
  const body = (
    <>
      <div className="ws-stat__label">{label}</div>
      <div className="ws-stat__value">{value}</div>
      <div className="ws-stat__foot">
        {typeof trend === "number" ? (
          <TrendBadge value={trend} />
        ) : null}
        {hint ? <span className="ws-stat__hint">{hint}</span> : null}
      </div>
    </>
  );
  if (href) {
    return (
      <Link to={href} className={`ws-stat ws-stat--${tone}`}>
        {body}
      </Link>
    );
  }
  return <article className={`ws-stat ws-stat--${tone}`}>{body}</article>;
}

export function TrendBadge({ value }: { readonly value: number }) {
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  return (
    <span className={`ws-trend ws-trend--${dir}`}>
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export function StatusBadge({
  status,
  tone = "neutral",
}: {
  readonly status: string;
  readonly tone?: "ok" | "warn" | "danger" | "neutral";
}) {
  return <span className={`ws-badge ws-badge--${tone}`}>{status}</span>;
}

export function ChartCard({
  title,
  children,
  actions,
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}) {
  return (
    <section className="ws-card">
      <header className="ws-card__head">
        <h2>{title}</h2>
        {actions}
      </header>
      <div className="ws-card__body">{children}</div>
    </section>
  );
}

export function WidgetContainer({
  title,
  children,
  onHide,
  onResize,
  size,
  dragHandleProps,
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly onHide?: () => void;
  readonly onResize?: () => void;
  readonly size: "sm" | "md" | "lg";
  readonly dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <section className={`ws-widget ws-widget--${size}`} data-size={size}>
      <header className="ws-widget__head">
        <button type="button" className="ws-widget__drag" aria-label={`Drag ${title}`} {...dragHandleProps}>
          ⋮⋮
        </button>
        <h2>{title}</h2>
        <div className="ws-widget__tools">
          {onResize ? (
            <button type="button" className="ws-icon-btn" onClick={onResize} aria-label="Resize widget">
              Size
            </button>
          ) : null}
          {onHide ? (
            <button type="button" className="ws-icon-btn" onClick={onHide} aria-label="Hide widget">
              Hide
            </button>
          ) : null}
        </div>
      </header>
      <div className="ws-widget__body">{children}</div>
    </section>
  );
}

export function ActivityFeed({
  items,
}: {
  readonly items: readonly { id: string; title: string; meta: string }[];
}) {
  if (items.length === 0) {
    return <EmptyState title="No activity" body="When events arrive from Notifications and audit streams, they appear here." />;
  }
  return (
    <ul className="ws-feed">
      {items.map((item) => (
        <li key={item.id}>
          <strong>{item.title}</strong>
          <span>{item.meta}</span>
        </li>
      ))}
    </ul>
  );
}

export function Timeline({
  items,
}: {
  readonly items: readonly { id: string; time: string; title: string; place?: string }[];
}) {
  return (
    <ol className="ws-timeline">
      {items.map((item) => (
        <li key={item.id}>
          <time>{item.time}</time>
          <div>
            <strong>{item.title}</strong>
            {item.place ? <span>{item.place}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CalendarPreview({
  items,
}: {
  readonly items: readonly { id: string; time: string; title: string; place?: string }[];
}) {
  return (
    <div className="ws-calendar">
      <div className="ws-calendar__head">Today</div>
      <Timeline items={items} />
    </div>
  );
}

export function KanbanPreview({
  columns,
}: {
  readonly columns: readonly { column: string; cards: readonly string[] }[];
}) {
  return (
    <div className="ws-kanban">
      {columns.map((col) => (
        <div key={col.column} className="ws-kanban__col">
          <h3>{col.column}</h3>
          <ul>
            {col.cards.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
}) {
  return (
    <div className="ws-table-wrap">
      <table className="ws-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilterBar({ children }: { readonly children: ReactNode }) {
  return <div className="ws-filter-bar">{children}</div>;
}

export function Toolbar({ children }: { readonly children: ReactNode }) {
  return <div className="ws-toolbar">{children}</div>;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  readonly tabs: readonly { id: string; label: string }[];
  readonly active: string;
  readonly onChange: (id: string) => void;
}) {
  return (
    <div className="ws-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={active === t.id ? "is-active" : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Accordion({
  items,
}: {
  readonly items: readonly { id: string; title: string; body: string }[];
}) {
  return (
    <div className="ws-accordion">
      {items.map((item) => (
        <details key={item.id} className="ws-accordion__item">
          <summary>{item.title}</summary>
          <p>{item.body}</p>
        </details>
      ))}
    </div>
  );
}

export function Drawer({
  open,
  title,
  onClose,
  children,
  side = "right",
}: {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly side?: "right" | "left";
}) {
  const rootRef = useFocusTrap(open, onClose);
  if (!open) return null;
  return (
    <div className="ws-drawer-root" role="presentation" ref={rootRef}>
      <button type="button" className="ws-drawer-backdrop" aria-label="Close panel" onClick={onClose} />
      <aside className={`ws-drawer ws-drawer--${side}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="ws-drawer__head">
          <h2>{title}</h2>
          <button type="button" className="ws-icon-btn" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="ws-drawer__body">{children}</div>
      </aside>
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  const rootRef = useFocusTrap(open, onClose);
  if (!open) return null;
  return (
    <div className="ws-modal-root" role="presentation" ref={rootRef}>
      <button type="button" className="ws-drawer-backdrop" aria-label="Close dialog" onClick={onClose} />
      <div className="ws-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="ws-drawer__head">
          <h2>{title}</h2>
          <button type="button" className="ws-icon-btn" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="ws-modal__body">{children}</div>
      </div>
    </div>
  );
}

export function SidePanel({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <aside className="ws-side-panel">
      <h2>{title}</h2>
      {children}
    </aside>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  readonly title: string;
  readonly body: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="ws-empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  body,
  onRetry,
}: {
  readonly title?: string;
  readonly body: string;
  readonly onRetry?: () => void;
}) {
  return (
    <div className="ws-empty ws-empty--error" role="alert">
      <h3>{title}</h3>
      <p>{body}</p>
      {onRetry ? (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { readonly rows?: number }) {
  return (
    <div className="ws-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ws-skeleton__row" />
      ))}
    </div>
  );
}

export function DashboardGrid({ children }: { readonly children: ReactNode }) {
  return <div className="ws-dash-grid">{children}</div>;
}
