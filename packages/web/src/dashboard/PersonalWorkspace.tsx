import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui";
import {
  APPROVALS_PREVIEW,
  ASSIGNED_WORK,
  DRAFTS,
  MY_CALENDAR,
  MY_TASKS,
  RECENT_RECORDS,
  SAVED_VIEWS,
} from "../workspace/data";
import {
  Accordion,
  DataTable,
  EmptyState,
  FilterBar,
  SidePanel,
  Skeleton,
  StatusBadge,
  Tabs,
  Toolbar,
} from "../workspace/widgets";
import { EnterpriseCalendar } from "../productivity/EnterpriseCalendar";
import { useWorkspaceUi } from "../workspace/context";
import { useSession } from "../state/session";
import { ApiClientError } from "../api/types";
import { readListPage } from "../modules/erp/list-query";

function LiveInboxPreview() {
  const { api, user, setLastCorrelationId } = useSession();
  const [items, setItems] = useState<{ id: string; title: string; status: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.companyId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.dispatchQuery({
          queryType: "notifications.ListInAppNotifications",
          payload: {
            companyId: user.companyId,
            criteria: { page: { page: 1, pageSize: 5 } },
          },
        });
        if (cancelled) return;
        setLastCorrelationId(res.correlationId);
        const { items: pageItems } = readListPage(res.data);
        setItems(
          pageItems.map((raw) => {
            const n = raw as { id?: string; title?: string; subject?: string; readAt?: string | null };
            return {
              id: n.id ?? "—",
              title: n.title ?? n.subject ?? n.id ?? "Notification",
              status: n.readAt ? "Read" : "Unread",
            };
          }),
        );
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setError(err instanceof ApiClientError ? err.message : "Notifications unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, setLastCorrelationId, user?.companyId]);

  return (
    <section className="ws-card">
      <header className="ws-card__head">
        <h2>Notifications</h2>
        <Link className="btn btn--ghost" to="/app/notifications/center">
          Open center
        </Link>
      </header>
      {error ? <p className="muted">{error}</p> : null}
      {!items ? <Skeleton rows={2} /> : null}
      {items && items.length === 0 ? (
        <EmptyState title="Inbox clear" body="No in-app notifications for this session." />
      ) : null}
      {items && items.length > 0 ? (
        <DataTable
          columns={["Notification", "Status"]}
          rows={items.map((n) => [n.title, n.status])}
        />
      ) : null}
    </section>
  );
}

export function PersonalWorkspacePage() {
  const [tab, setTab] = useState("tasks");
  const { favorites, toast } = useWorkspaceUi();

  return (
    <div className="stack ws-personal">
      <PageHeader
        title="My workspace"
        lead="Personal queue for tasks, calendar, approvals, notifications, and recent work — live inbox via Notifications CQRS when available."
        actions={
          <Toolbar>
            <Link className="btn btn--ghost" to="/app/preferences">
              Settings
            </Link>
            <Link className="btn btn--ghost" to="/app/account/security">
              Profile security
            </Link>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() =>
                toast({ tone: "ok", title: "Task draft saved locally", body: "Create flows wire to modules in later phases." })
              }
            >
              New task
            </button>
          </Toolbar>
        }
      />

      <LiveInboxPreview />

      <Tabs
        tabs={[
          { id: "tasks", label: "My tasks" },
          { id: "calendar", label: "My calendar" },
          { id: "approvals", label: "My approvals" },
          { id: "projects", label: "Assigned projects" },
          { id: "tickets", label: "Assigned tickets" },
          { id: "saved", label: "Saved views" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="ws-personal__grid">
        <div className="stack">
          {tab === "tasks" ? (
            <section className="ws-card">
              <header className="ws-card__head">
                <h2>My tasks</h2>
                <FilterBar>
                  <select aria-label="Priority filter" defaultValue="all">
                    <option value="all">All priorities</option>
                    <option value="high">High</option>
                    <option value="med">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </FilterBar>
              </header>
              <DataTable
                columns={["Task", "Status", "Priority"]}
                rows={MY_TASKS.map((t) => [
                  t.title,
                  t.status,
                  t.priority === "high" ? "High" : t.priority === "med" ? "Medium" : "Low",
                ])}
              />
            </section>
          ) : null}

          {tab === "calendar" ? (
            <EnterpriseCalendar
              title="My calendar"
              lead="Personal schedule with drag-and-drop UI."
              events={MY_CALENDAR.map((c, i) => ({
                id: c.id,
                title: c.title,
                day: Math.min(28, new Date().getDate() + (i % 5) - 1),
                lane: "personal",
                href: "/app/me",
                tone: "ok" as const,
              }))}
              onMove={(id, day) =>
                toast({ tone: "info", title: "Rescheduled locally", body: `${id} → day ${day}` })
              }
            />
          ) : null}

          {tab === "approvals" ? (
            <section className="ws-card">
              <header className="ws-card__head">
                <h2>My approvals</h2>
                <Link to="/app/approvals" className="btn btn--ghost">
                  Open queue
                </Link>
              </header>
              <ul className="ws-feed">
                {APPROVALS_PREVIEW.map((a) => (
                  <li key={a.id}>
                    <strong>{a.title}</strong>
                    <span>
                      {a.owner} · <StatusBadge status={`Due ${a.due}`} tone="warn" />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {tab === "projects" ? (
            <section className="ws-card">
              <header className="ws-card__head">
                <h2>Assigned projects</h2>
              </header>
              <ul className="ws-feed">
                {ASSIGNED_WORK.filter((w) => w.href === "/app/projects").map((w) => (
                  <li key={w.id}>
                    <Link to={w.href}>
                      <strong>{w.title}</strong>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/app/projects">
                    <strong>View all projects</strong>
                  </Link>
                </li>
              </ul>
            </section>
          ) : null}

          {tab === "tickets" ? (
            <section className="ws-card">
              <header className="ws-card__head">
                <h2>Assigned tickets</h2>
              </header>
              <ul className="ws-feed">
                {ASSIGNED_WORK.filter((w) => w.href === "/app/service").map((w) => (
                  <li key={w.id}>
                    <Link to={w.href}>
                      <strong>{w.title}</strong>
                    </Link>
                  </li>
                ))}
                {ASSIGNED_WORK.filter((w) => w.href === "/app/service").length === 0 ? (
                  <EmptyState
                    title="No open tickets"
                    body="Service assignments from the Service module appear here."
                  />
                ) : null}
              </ul>
            </section>
          ) : null}

          {tab === "saved" ? (
            <section className="ws-card">
              <header className="ws-card__head">
                <h2>Saved views</h2>
              </header>
              <ul className="ws-feed">
                {SAVED_VIEWS.map((v) => (
                  <li key={v.id}>
                    <Link to={v.href}>
                      <strong>{v.label}</strong>
                    </Link>
                  </li>
                ))}
              </ul>
              <Accordion
                items={[
                  {
                    id: "bookmarks",
                    title: "Bookmarks & favorites",
                    body: favorites.length
                      ? favorites.join(", ")
                      : "Star pages from the header to bookmark them here.",
                  },
                  {
                    id: "drafts",
                    title: "Draft items",
                    body: DRAFTS.map((d) => d.label).join(" · "),
                  },
                ]}
              />
            </section>
          ) : null}
        </div>

        <SidePanel title="Recent & drafts">
          <h3>Recent records</h3>
          <ul className="ws-feed">
            {RECENT_RECORDS.map((r) => (
              <li key={r.id}>
                <Link to={r.href}>
                  <strong>{r.label}</strong>
                </Link>
                <span>{r.type}</span>
              </li>
            ))}
          </ul>
          <h3>Drafts</h3>
          <ul className="ws-feed">
            {DRAFTS.map((d) => (
              <li key={d.id}>
                <Link to={d.href}>
                  <strong>{d.label}</strong>
                </Link>
              </li>
            ))}
          </ul>
          <h3>Favorites</h3>
          <ul className="ws-feed">
            {favorites.map((f) => (
              <li key={f}>
                <Link to={f}>
                  <strong>{f}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </SidePanel>
      </div>
    </div>
  );
}
