import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, PageHeader } from "../components/ui";
import { COMMANDS, NOTIFICATIONS } from "../workspace/data";
import { FilterBar, StatusBadge } from "../workspace/widgets";
import { useWorkspaceUi } from "../workspace/context";

export function WorkflowPage() {
  return (
    <div className="stack">
      <PageHeader
        title="Workflow"
        lead="Display status, history, assignments from backend Workflow. The engine remains server-side."
      />
      <EmptyState
        title="Lifecycle views"
        body="Bind this screen to Workflow status/history queries when exposed. UI never transitions aggregates locally."
      />
    </div>
  );
}

export function ApprovalsPage() {
  return (
    <div className="stack">
      <PageHeader
        title="Approvals"
        lead="Approval queues and decision submission. Approval engine stays on the backend."
      />
      <EmptyState
        title="Pending decisions"
        body="Load queues via Approval queries and submit decisions through commands — no local approval rules."
      />
    </div>
  );
}

export function SearchPage() {
  const [q, setQ] = useState("");
  const { setPaletteOpen } = useWorkspaceUi();
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return COMMANDS.filter((c) =>
      `${c.label} ${c.group} ${c.keywords}`.toLowerCase().includes(needle),
    ).slice(0, 10);
  }, [q]);

  return (
    <div className="stack">
      <PageHeader
        title="Search"
        lead="Quick jump across workspace destinations. Enterprise indexed search remains server-owned."
        actions={
          <button type="button" className="btn btn--ghost" onClick={() => setPaletteOpen(true)}>
            Open command palette
          </button>
        }
      />
      <FilterBar>
        <label className="field" style={{ flex: 1, minWidth: "220px" }}>
          <span className="field__label">Query</span>
          <input
            className="field__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Modules, create actions, help…"
            aria-label="Workspace search"
          />
        </label>
      </FilterBar>
      {results.length > 0 ? (
        <ul className="ws-feed ws-card" style={{ padding: "0.5rem 1rem" }}>
          {results.map((r) => (
            <li key={r.id}>
              {r.href.startsWith("#") ? (
                <strong>{r.label}</strong>
              ) : (
                <Link to={r.href}>
                  <strong>{r.label}</strong>
                </Link>
              )}
              <span>{r.group}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={q.trim().length >= 2 ? "No matches" : "Enterprise search"}
          body={
            q.trim().length >= 2
              ? "Try another keyword or open the command palette."
              : "Type to filter workspace destinations, or press ⌘/Ctrl K for the command palette. Full-text indexing stays on the server."
          }
        />
      )}
    </div>
  );
}

export function ReportingPage() {
  return (
    <div className="stack">
      <PageHeader
        title="Reporting"
        lead="Render dashboards and reports provided by Reporting. No client-side reporting engine."
      />
      <EmptyState
        title="Report gallery"
        body="Embed Reporting snapshots and exports via API responses only. The executive dashboard already previews the presentation pattern."
      />
    </div>
  );
}

export function NotificationsPage() {
  return (
    <div className="stack">
      <PageHeader
        title="Notifications"
        lead="Inbox presentation. Delivery transport remains backend Notifications."
      />
      <ul className="ws-feed ws-card" style={{ padding: "0.5rem 1rem" }}>
        {NOTIFICATIONS.map((n) => (
          <li key={n.id} className={n.unread ? "is-unread" : undefined}>
            <strong>{n.title}</strong>
            <span>
              {n.time}{" "}
              {n.unread ? <StatusBadge status="Unread" tone="warn" /> : <StatusBadge status="Read" tone="neutral" />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
