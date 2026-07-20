/**
 * RC10.1 — Interior Design Studio (authenticated workspace home).
 * Evolves RC9.4 My Projects; persistence contracts unchanged.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import {
  PROJECT_STATUS_LABELS,
  createProject,
  createShareLink,
  duplicateProject,
  listProjects,
  openSharedProject,
  setProjectStatus,
  type ProjectListItem,
  type ProjectStatus,
} from "../cx/projects";
import { loadProject } from "../cx/projects/store";
import { mergeProjectsOnLogin } from "../cx/projects/store";
import {
  continueHref,
  continueTargetForProject,
  deriveActivityEvents,
  deriveStudioStats,
  mostRecentProject,
  relativeTime,
} from "../cx/projects/studio-derive";
import {
  loadStudioPrefs,
  setStudioDefaultSort,
  setStudioDensity,
  togglePinnedProject,
  type StudioDensity,
  type StudioPrefs,
  type StudioSort,
} from "../cx/projects/studio-prefs";
import { ProjectStudioCard } from "../cx/projects/ui/ProjectStudioCard";
import {
  NewProjectDialog,
  type NewProjectDraft,
} from "../cx/projects/ui/NewProjectDialog";
import { useSession } from "../../state/session";
import { useReveal } from "../useReveal";
import { BRAND } from "../../brand";

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

export function CustomerProjectsPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<StudioPrefs>(() => loadStudioPrefs());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [sort, setSort] = useState<StudioSort>(prefs.defaultSort);
  const [shareMsg, setShareMsg] = useState("");
  const [revision, setRevision] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      mergeProjectsOnLogin(user.id, user.email ?? user.id);
      setRevision((r) => r + 1);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    const focus =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("focus")
        : null;
    if (!focus) return;
    const el = document.getElementById(`project-${focus}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [revision]);

  const shareToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("share")
      : null;
  const shared = shareToken ? openSharedProject(shareToken) : null;

  // revision forces re-read after local mutations (pin/share/archive/duplicate).
  void revision;
  const items = listProjects({ search, status, sort });
  const allItems = listProjects({ sort: "updated" });
  const recent = mostRecentProject(allItems);
  const stats = deriveStudioStats(allItems);
  const activity = deriveActivityEvents(10);
  const pinnedItems = prefs.pinnedProjectIds
    .map((id) => allItems.find((i) => i.id === id))
    .filter((i): i is ProjectListItem => i != null);
  const recentStrip = allItems.filter((i) => i.status !== "archived").slice(0, 4);

  useReveal([items.length, pinnedItems.length, prefs.density, revision]);

  function refresh() {
    setRevision((r) => r + 1);
  }

  function openNewProjectDialog() {
    setCreateError(null);
    setDialogOpen(true);
  }

  function createNamedProject(draft: NewProjectDraft) {
    setCreateError(null);
    try {
      const p = createProject({
        title: draft.title,
        templateId: draft.templateId,
        ...(draft.description ? { description: draft.description } : {}),
        ...(draft.budgetPkr != null ? { budgetPkr: draft.budgetPkr } : {}),
        ...(draft.location ? { location: draft.location } : {}),
        ...(user
          ? {
              owner: {
                ownerId: user.id,
                ownerLabel: user.email ?? "You",
                ...(user.email ? { customerName: user.email } : {}),
              },
            }
          : {}),
      });
      setDialogOpen(false);
      refresh();
      void navigate(`/planner?projectId=${encodeURIComponent(p.id)}`);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not create the project. Please try again.";
      setCreateError(message);
    }
  }

  function shareProject(item: ProjectListItem) {
    const res = createShareLink(item.id, "view", "View link");
    if (res) {
      const url = `${window.location.origin}${res.url}`;
      void navigator.clipboard?.writeText(url);
      setShareMsg(`Share link copied for ${item.title}`);
      refresh();
    }
  }

  function onPin(id: string) {
    setPrefs(togglePinnedProject(id));
  }

  function onDuplicate(id: string) {
    const copy = duplicateProject(id, user?.id);
    if (copy) {
      setShareMsg(`Duplicated as ${copy.title}`);
      refresh();
    }
  }

  function onArchive(id: string) {
    setProjectStatus(id, "archived");
    refresh();
  }

  function onDensity(next: StudioDensity) {
    setPrefs(setStudioDensity(next));
  }

  function onSortChange(next: StudioSort) {
    setSort(next);
    setPrefs(setStudioDefaultSort(next));
  }

  const continueRecent = (() => {
    if (!recent) return null;
    const full = loadProject(recent.id);
    const target = full ? continueTargetForProject(full) : "planner";
    const href = continueHref(
      recent.id,
      target === "project" ? "planner" : target,
    );
    const label =
      target === "consultant"
        ? "Continue in AI Consultant"
        : "Continue in Planner";
    return { recent, href, label };
  })();

  const greeting = user?.email
    ? `Welcome back to your ${BRAND.name} studio`
    : `Your ${BRAND.name} design studio`;

  return (
    <div className={`cx-studio cx-studio--${prefs.density}`}>
      <Seo
        title="Design Studio"
        description="Your interior design studio — projects, planning, and collaboration."
        path="/my-projects"
      />

      {/* Welcome Header */}
      <header className="site-page-hero cx-studio-hero">
        <Breadcrumbs items={[{ label: "Design Studio" }]} />
        <p className="site-eyebrow">Interior Design Studio</p>
        <h1>{greeting}</h1>
        <p>
          Active furnishing projects, visual planning, and progress — crafted for homes,
          hotels, and workplaces.
        </p>
      </header>

      {/* Continue Recent Project */}
      {continueRecent ? (
        <section className="site-section cx-studio-continue site-reveal" aria-label="Continue recent project">
          <div className="cx-studio-continue__panel">
            <div>
              <p className="site-eyebrow">Continue recent</p>
              <h2>{continueRecent.recent.title}</h2>
              <p className="cx-muted">
                {PROJECT_STATUS_LABELS[continueRecent.recent.status]} · Edited{" "}
                {relativeTime(continueRecent.recent.updatedAt)}
              </p>
            </div>
            <div className="cx-studio-continue__actions">
              <Link to={continueRecent.href} className="site-btn site-btn--primary">
                {continueRecent.label}
              </Link>
              <Link
                to={`/planner?projectId=${continueRecent.recent.id}`}
                className="site-btn site-btn--outline"
              >
                Open project
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {shared ? (
        <section className="site-section cx-projects-shared" role="region" aria-label="Shared project">
          <h2>Shared with you</h2>
          <p>
            <strong>{shared.title}</strong> — {PROJECT_STATUS_LABELS[shared.status]}
          </p>
          <Link to={`/planner?projectId=${shared.id}`} className="site-btn site-btn--primary">
            Open in planner
          </Link>
        </section>
      ) : null}

      {/* Workspace Statistics */}
      <section className="site-section cx-studio-stats site-reveal" aria-label="Workspace statistics">
        <h2 className="cx-studio-section-title">Workspace overview</h2>
        <ul className="cx-studio-stats__grid cx-stagger">
          {stats.map((stat) => (
            <li key={stat.id} className="cx-studio-stat">
              <span className="cx-studio-stat__value">{stat.value}</span>
              <span className="cx-studio-stat__label">{stat.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Pinned Projects */}
      <section className="site-section cx-studio-pinned site-reveal" aria-label="Pinned projects">
        <h2 className="cx-studio-section-title">Pinned projects</h2>
        {pinnedItems.length === 0 ? (
          <p className="cx-muted" role="status">
            Pin projects you return to often. Use More → Pin on any card.
          </p>
        ) : (
          <div className="cx-studio-card-grid cx-stagger">
            {pinnedItems.map((item) => (
              <ProjectStudioCard
                key={item.id}
                item={item}
                pinned
                density={prefs.density}
                onPin={() => onPin(item.id)}
                onShare={() => shareProject(item)}
                onDuplicate={() => onDuplicate(item.id)}
                onArchive={() => onArchive(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Projects */}
      {recentStrip.length > 0 ? (
        <section className="site-section cx-studio-recent site-reveal" aria-label="Recent projects">
          <h2 className="cx-studio-section-title">Recent projects</h2>
          <ul className="cx-studio-recent__list">
            {recentStrip.map((item) => (
              <li key={item.id}>
                <Link to={`/planner?projectId=${item.id}`}>{item.title}</Link>
                <span className="cx-muted">{relativeTime(item.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Filters + Moodboard / Project Preview Cards */}
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
            onChange={(e) => onSortChange(e.target.value as StudioSort)}
            aria-label="Sort projects"
          >
            <option value="updated">Last updated</option>
            <option value="created">Created</option>
            <option value="budget">Budget</option>
            <option value="title">Title</option>
          </select>
        </label>
        <label>
          Density
          <select
            value={prefs.density}
            onChange={(e) => onDensity(e.target.value as StudioDensity)}
            aria-label="Card density"
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
      </section>

      <section className="site-section" aria-label="Project gallery">
        <h2 className="cx-studio-section-title">All projects</h2>
        {items.length === 0 ? (
          <div className="cx-studio-empty" role="status">
            <h3>No projects yet</h3>
            <p>
              Begin a furnishing plan, consult our AI designer, or browse the collection for
              inspiration.
            </p>
            <div className="cx-studio-empty__actions">
              <button type="button" className="site-btn site-btn--primary" onClick={openNewProjectDialog}>
                Start Planning
              </button>
              <Link to="/consultant" className="site-btn site-btn--outline">
                Consult AI
              </Link>
              <Link to="/products" className="site-btn site-btn--ghost">
                Browse Furniture
              </Link>
            </div>
          </div>
        ) : (
          <div className="cx-studio-card-grid cx-stagger">
            {items.map((item) => (
              <ProjectStudioCard
                key={item.id}
                item={item}
                pinned={prefs.pinnedProjectIds.includes(item.id)}
                density={prefs.density}
                onPin={() => onPin(item.id)}
                onShare={() => shareProject(item)}
                onDuplicate={() => onDuplicate(item.id)}
                onArchive={() => onArchive(item.id)}
              />
            ))}
          </div>
        )}
        {shareMsg ? (
          <p className="site-form-success" role="status">
            {shareMsg}
          </p>
        ) : null}
      </section>

      {/* Recent Activity Timeline */}
      <section className="site-section cx-studio-activity site-reveal" aria-label="Recent activity">
        <h2 className="cx-studio-section-title">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="cx-muted" role="status">
            Activity from planning, quotes, and consultations will appear here.
          </p>
        ) : (
          <ol className="cx-studio-timeline">
            {activity.map((event) => (
              <li key={event.id}>
                <time dateTime={event.at}>{relativeTime(event.at)}</time>
                <div>
                  <strong>{event.title}</strong>
                  <Link to={`/planner?projectId=${event.projectId}`}>{event.projectTitle}</Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Quick Actions */}
      <section className="site-section cx-studio-quick site-reveal" aria-label="Quick actions">
        <h2 className="cx-studio-section-title">Quick actions</h2>
        <div className="cx-studio-quick__actions">
          <button type="button" className="site-btn site-btn--primary" onClick={openNewProjectDialog}>
            New project
          </button>
          <Link to="/planner" className="site-btn site-btn--outline">
            Open planner
          </Link>
          <Link to="/consultant" className="site-btn site-btn--ghost">
            AI Consultant
          </Link>
          <Link to="/wishlist" className="site-btn site-btn--ghost">
            Wishlist
          </Link>
          <Link to="/products" className="site-btn site-btn--ghost">
            Browse furniture
          </Link>
        </div>
      </section>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setCreateError(null);
        }}
        onCreate={createNamedProject}
        error={createError}
      />
    </div>
  );
}
