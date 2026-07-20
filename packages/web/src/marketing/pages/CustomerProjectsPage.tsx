/**
 * RC9.4 — My Projects dashboard (customer furnishing projects).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { formatPkr } from "../data/catalogue";
import {
  PROJECT_STATUS_LABELS,
  createProject,
  createShareLink,
  listProjects,
  openSharedProject,
  type ProjectListItem,
  type ProjectStatus,
} from "../cx/projects";
import { TEMPLATE_LABELS } from "../cx/intelligent/space-brief";
import { useSession } from "../../state/session";
import { mergeProjectsOnLogin } from "../cx/projects/store";

const STATUSES: (ProjectStatus | "all")[] = [
  "all",
  "draft",
  "planning",
  "quoted",
  "pending_approval",
  "approved",
  "production",
  "completed",
  "archived",
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export function CustomerProjectsPage() {
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [sort, setSort] = useState<"updated" | "created" | "budget" | "title">("updated");
  const [shareMsg, setShareMsg] = useState("");

  useEffect(() => {
    if (user?.id) {
      mergeProjectsOnLogin(user.id, user.email ?? user.id);
    }
  }, [user?.id, user?.email]);

  const shareToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("share")
      : null;
  const shared = shareToken ? openSharedProject(shareToken) : null;

  const items = useMemo(
    () => listProjects({ search, status, sort }),
    [search, status, sort],
  );

  function startNewProject() {
    const p = createProject({
      title: "New furnishing project",
      templateId: "office",
      ...(user
        ? {
            owner: {
              ownerId: user.id,
              ownerLabel: user.email ?? "You",
              customerName: user.email,
            },
          }
        : {}),
    });
    window.location.href = `/planner?projectId=${p.id}`;
  }

  function shareProject(item: ProjectListItem) {
    const res = createShareLink(item.id, "view", "View link");
    if (res) {
      const url = `${window.location.origin}${res.url}`;
      void navigator.clipboard?.writeText(url);
      setShareMsg(`Share link copied for ${item.title}`);
    }
  }

  return (
    <>
      <Seo title="My Projects" description="Saved furnishing projects and collaboration." path="/my-projects" />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "My Projects" }]} />
        <p className="site-eyebrow">Projects</p>
        <h1>My Projects</h1>
        <p>Save, resume, and collaborate on furnishing plans across the AI Consultant and Budget Planner.</p>
        <div className="site-hero__actions">
          <button type="button" className="site-btn site-btn--primary" onClick={startNewProject}>
            New project
          </button>
          <Link to="/planner" className="site-btn site-btn--ghost">
            Open planner
          </Link>
          <Link to="/consultant" className="site-btn site-btn--ghost">
            AI Consultant
          </Link>
        </div>
      </header>

      {shared ? (
        <section className="site-section cx-projects-shared" role="region" aria-label="Shared project">
          <h2>Shared with you</h2>
          <p>
            <strong>{shared.title}</strong> — {PROJECT_STATUS_LABELS[shared.status]}
          </p>
          <Link
            to={`/planner?projectId=${shared.id}`}
            className="site-btn site-btn--primary"
          >
            Open in planner
          </Link>
        </section>
      ) : null}

      <section className="site-section cx-projects-toolbar" aria-label="Project filters">
        <label>
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Office, Jahez, customer…"
            aria-label="Search projects"
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus | "all")}
            aria-label="Filter by status"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label="Sort projects"
          >
            <option value="updated">Last updated</option>
            <option value="created">Created</option>
            <option value="budget">Budget</option>
            <option value="title">Title</option>
          </select>
        </label>
      </section>

      <section className="site-section" aria-label="Project list">
        {items.length === 0 ? (
          <p className="cx-muted" role="status">
            No projects yet. Start in the Budget Planner or AI Consultant, then save a project.
          </p>
        ) : (
          <ul className="cx-projects-list">
            {items.map((item) => (
              <li key={item.id} className="cx-projects-card">
                <div className="cx-projects-card__head">
                  <h2>
                    <Link to={`/planner?projectId=${item.id}`}>{item.title}</Link>
                  </h2>
                  <span className={`cx-projects-status cx-projects-status--${item.status}`}>
                    {PROJECT_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p className="cx-muted">
                  {TEMPLATE_LABELS[item.templateId]} · {item.roomCount} room
                  {item.roomCount === 1 ? "" : "s"} · Updated {relativeTime(item.updatedAt)}
                </p>
                <p>
                  Budget {formatPkr(item.budgetPkr)} · Package {formatPkr(item.totalPkr)}
                  {item.aiAssisted ? " · AI assisted" : ""}
                  {item.quotationStatus ? ` · ${item.quotationStatus}` : ""}
                </p>
                <div className="cx-projects-card__actions">
                  <Link to={`/planner?projectId=${item.id}`} className="site-btn site-btn--ghost">
                    Planner
                  </Link>
                  <Link
                    to={`/consultant?projectId=${item.id}`}
                    className="site-btn site-btn--ghost"
                  >
                    Consultant
                  </Link>
                  <button
                    type="button"
                    className="site-btn site-btn--ghost"
                    onClick={() => shareProject(item)}
                  >
                    Share
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {shareMsg ? (
          <p className="site-form-success" role="status">
            {shareMsg}
          </p>
        ) : null}
      </section>
    </>
  );
}
