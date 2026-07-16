import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { COMMANDS, QUICK_ACTIONS, SHORTCUTS } from "./data";
import { useWorkspaceUi } from "./context";
import { Drawer, Modal } from "./widgets";
import {
  loadFavoriteCommands,
  loadInbox,
  loadRecentPages,
  saveInbox,
  toggleFavoriteCommand,
  type InboxNotification,
} from "./prefs";

export function ToastHost() {
  const { toasts, dismissToast } = useWorkspaceUi();
  if (toasts.length === 0) return null;
  return (
    <div className="ws-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`ws-toast ws-toast--${t.tone}`} role="status">
          <div>
            <strong>{t.title}</strong>
            {t.body ? <p>{t.body}</p> : null}
          </div>
          <button type="button" className="ws-icon-btn" onClick={() => dismissToast(t.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}

type Cmd = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly group: string;
  readonly keywords: string;
};

export function CommandPalette() {
  const {
    paletteOpen,
    setPaletteOpen,
    recentCommands,
    rememberCommand,
    favorites,
    favoriteCommands,
    setFavoriteCommands,
    recentPages,
    setShortcutsOpen,
    setCreateOpen,
    toast,
  } = useWorkspaceUi();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"all" | "recent" | "favorites" | "modules">("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setActive(0);
      setMode("all");
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [paletteOpen]);

  const moduleCommands = useMemo(
    () => COMMANDS.filter((c) => c.group === "Navigate"),
    [],
  );

  const contextActions: Cmd[] = useMemo(() => {
    const path = location.pathname;
    const extras: Cmd[] = [
      {
        id: "ctx-prefs",
        label: "Open preferences",
        href: "/app/preferences",
        group: "Context",
        keywords: "settings theme",
      },
      {
        id: "ctx-cal",
        label: "Open enterprise calendar",
        href: "/app/calendar",
        group: "Context",
        keywords: "schedule",
      },
    ];
    if (path.includes("/sales")) {
      extras.push({
        id: "ctx-sales-new",
        label: "Create sales record",
        href: "/app/sales",
        group: "Context",
        keywords: "quote order",
      });
    }
    if (path.includes("/projects")) {
      extras.push({
        id: "ctx-proj-board",
        label: "Open project pipeline",
        href: "/app/projects/pipeline",
        group: "Context",
        keywords: "kanban",
      });
    }
    return extras;
  }, [location.pathname]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = [...COMMANDS, ...contextActions];

    if (mode === "modules" && !needle) {
      return [...moduleCommands];
    }
    if (mode === "recent" && !needle) {
      const recent = recentCommands
        .map((id) => base.find((c) => c.id === id))
        .filter(Boolean) as Cmd[];
      const pages = recentPages.map(
        (p, i) =>
          ({
            id: `page-${i}`,
            label: p.label,
            href: p.path,
            group: "Recent pages",
            keywords: "history",
          }) satisfies Cmd,
      );
      return [...recent, ...pages].slice(0, 16);
    }
    if (mode === "favorites" && !needle) {
      const favCmds = favoriteCommands
        .map((id) => base.find((c) => c.id === id))
        .filter(Boolean) as Cmd[];
      const favPaths = favorites
        .map((href) => base.find((c) => c.href === href))
        .filter(Boolean) as Cmd[];
      return [...favCmds, ...favPaths]
        .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
        .slice(0, 16);
    }

    if (!needle) {
      const recent = recentCommands
        .map((id) => base.find((c) => c.id === id))
        .filter(Boolean) as Cmd[];
      const fav = favoriteCommands
        .map((id) => base.find((c) => c.id === id))
        .filter(Boolean) as Cmd[];
      return [...contextActions, ...recent, ...fav, ...base]
        .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
        .slice(0, 16);
    }

    return base
      .filter((c) => `${c.label} ${c.group} ${c.keywords}`.toLowerCase().includes(needle))
      .slice(0, 16);
  }, [q, recentCommands, favorites, favoriteCommands, recentPages, mode, contextActions, moduleCommands]);

  useEffect(() => {
    setActive(0);
  }, [q, mode]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!paletteOpen) return null;

  function run(cmd: Cmd) {
    rememberCommand(cmd.id);
    setPaletteOpen(false);
    if (cmd.href === "#shortcuts") {
      setShortcutsOpen(true);
      return;
    }
    if (cmd.href === "#create") {
      setCreateOpen(true);
      return;
    }
    navigate(cmd.href);
  }

  function starCmd(e: MouseEvent, id: string) {
    e.stopPropagation();
    const next = toggleFavoriteCommand(id);
    setFavoriteCommands(next);
    toast({ tone: "ok", title: next.includes(id) ? "Command favorited" : "Command unfavorited" });
  }

  return (
    <div className="ws-palette-root" role="presentation">
      <button
        type="button"
        className="ws-drawer-backdrop"
        aria-label="Close command center"
        onClick={() => setPaletteOpen(false)}
      />
      <div
        className="ws-palette p5-cmd"
        role="dialog"
        aria-modal="true"
        aria-label="Command center"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(results.length - 1, i + 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          }
          if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            run(results[active]!);
          }
        }}
      >
        <label htmlFor="ws-cmd" className="sr-only">
          Universal search
        </label>
        <input
          id="ws-cmd"
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search modules, actions, pages, help…"
          aria-controls="ws-cmd-list"
          aria-activedescendant={results[active] ? `cmd-${results[active]!.id}` : undefined}
          autoComplete="off"
        />
        <div className="p5-cmd__modes" role="tablist" aria-label="Command modes">
          {(
            [
              ["all", "All"],
              ["recent", "History"],
              ["favorites", "Favorites"],
              ["modules", "Modules"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              className={mode === id ? "is-active" : undefined}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <ul id="ws-cmd-list" className="ws-palette__list" role="listbox" ref={listRef}>
          {results.map((cmd, idx) => (
            <li key={cmd.id} role="option" aria-selected={idx === active} data-idx={idx}>
              <button
                type="button"
                id={`cmd-${cmd.id}`}
                className={idx === active ? "is-active" : undefined}
                onMouseEnter={() => setActive(idx)}
                onClick={() => run(cmd)}
              >
                <span>{cmd.group}</span>
                <strong>{cmd.label}</strong>
              </button>
              <button
                type="button"
                className="p5-cmd__star"
                aria-label={favoriteCommands.includes(cmd.id) ? "Unfavorite" : "Favorite"}
                onClick={(e) => starCmd(e, cmd.id)}
              >
                {favoriteCommands.includes(cmd.id) ? "★" : "☆"}
              </button>
            </li>
          ))}
          {results.length === 0 ? <li className="ws-palette__empty">No matches</li> : null}
        </ul>
        <p className="ws-palette__hint">
          ↑↓ navigate · Enter open · ★ favorite · Esc close · ⌘/Ctrl K
        </p>
      </div>
    </div>
  );
}

export function QuickCreateLauncher() {
  const { createOpen, setCreateOpen, toast } = useWorkspaceUi();
  const navigate = useNavigate();
  return (
    <Modal open={createOpen} title="Quick create" onClose={() => setCreateOpen(false)}>
      <div className="ws-quick-grid">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="ws-quick-tile"
            onClick={() => {
              setCreateOpen(false);
              toast({ tone: "ok", title: `Opening ${a.label}`, body: a.hint });
              navigate(a.href);
            }}
          >
            <strong>{a.label}</strong>
            <span>{a.hint}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function NotificationDrawer() {
  const { notifOpen, setNotifOpen, toast } = useWorkspaceUi();
  const navigate = useNavigate();
  const [items, setItems] = useState<InboxNotification[]>(() => loadInbox());
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (notifOpen) setItems(loadInbox());
  }, [notifOpen]);

  // Lightweight "realtime" tick — refreshes from storage when drawer is open
  useEffect(() => {
    if (!notifOpen) return;
    const t = window.setInterval(() => setItems(loadInbox()), 4000);
    return () => window.clearInterval(t);
  }, [notifOpen]);

  function commit(next: InboxNotification[]) {
    setItems(next);
    saveInbox(next);
  }

  const visible = items.filter((n) => {
    if (!showArchived && n.archived) return false;
    if (n.snoozedUntil && n.snoozedUntil > Date.now()) return false;
    if (category !== "all" && n.category !== category) return false;
    if (q) {
      const hay = `${n.title} ${n.body}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <Drawer open={notifOpen} title="Notification center" onClose={() => setNotifOpen(false)}>
      <div className="p5-notif stack">
        <div className="row">
          <input
            className="field__input"
            placeholder="Search notifications…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search notifications"
          />
        </div>
        <div className="p5-seg" role="group" aria-label="Category">
          {["all", "approvals", "ops", "mentions", "reports", "security", "system"].map((c) => (
            <button
              key={c}
              type="button"
              className={category === c ? "is-active" : undefined}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              commit(items.map((n) => ({ ...n, unread: false })))
            }
          >
            Mark all read
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            aria-pressed={showArchived}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "Hide archive" : "Show archive"}
          </button>
        </div>
        <ul className="ws-feed p5-notif__list">
          {visible.map((n) => (
            <li
              key={n.id}
              className={`${n.unread ? "is-unread" : ""} p5-notif__item p5-notif__item--${n.priority}`}
            >
              <button
                type="button"
                className="p5-notif__main"
                onClick={() => {
                  commit(items.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
                  setNotifOpen(false);
                  if (n.href) navigate(n.href);
                }}
              >
                <strong>{n.title}</strong>
                <span>{n.body}</span>
                <em>
                  {n.category} · {n.priority} · {n.time}
                </em>
              </button>
              <div className="p5-notif__actions">
                <button
                  type="button"
                  className="ws-icon-btn"
                  onClick={() => {
                    commit(
                      items.map((x) =>
                        x.id === n.id
                          ? { ...x, snoozedUntil: Date.now() + 60 * 60 * 1000, unread: false }
                          : x,
                      ),
                    );
                    toast({ tone: "info", title: "Snoozed 1 hour" });
                  }}
                >
                  Snooze
                </button>
                <button
                  type="button"
                  className="ws-icon-btn"
                  onClick={() =>
                    commit(
                      items.map((x) =>
                        x.id === n.id ? { ...x, archived: true, unread: false } : x,
                      ),
                    )
                  }
                >
                  Archive
                </button>
              </div>
            </li>
          ))}
          {visible.length === 0 ? <li><span>No notifications match.</span></li> : null}
        </ul>
        <div className="p5-notif__timeline">
          <h3>Timeline</h3>
          <ol>
            {items
              .filter((n) => !n.archived)
              .slice(0, 8)
              .map((n) => (
                <li key={`t-${n.id}`}>
                  <time>{n.time}</time>
                  <span>{n.title}</span>
                </li>
              ))}
          </ol>
        </div>
        <Link to="/app/notifications" className="btn btn--ghost" onClick={() => setNotifOpen(false)}>
          Open full notification module
        </Link>
        <Link to="/app/preferences" className="btn btn--ghost" onClick={() => setNotifOpen(false)}>
          Notification preferences
        </Link>
      </div>
    </Drawer>
  );
}

export function ShortcutsOverlay() {
  const { shortcutsOpen, setShortcutsOpen } = useWorkspaceUi();
  return (
    <Modal open={shortcutsOpen} title="Keyboard shortcuts" onClose={() => setShortcutsOpen(false)}>
      <ul className="ws-shortcuts">
        {SHORTCUTS.map((s) => (
          <li key={s.keys}>
            <kbd>{s.keys}</kbd>
            <span>{s.action}</span>
          </li>
        ))}
        <li>
          <kbd>⌘/Ctrl ,</kbd>
          <span>Preferences</span>
        </li>
      </ul>
    </Modal>
  );
}

export function HelpModal() {
  const { helpOpen, setHelpOpen } = useWorkspaceUi();
  return (
    <Modal open={helpOpen} title="Workspace help" onClose={() => setHelpOpen(false)}>
      <p>
        AFH enterprise workspace — command center, advanced tables, collaboration, calendars, and
        preferences are presentation enhancements over existing Application and Reporting APIs.
      </p>
      <ul>
        <li>⌘/Ctrl K opens the command center with history, favorites, and module launcher.</li>
        <li>Tables support column chooser, density, saved views, and multi-sort (Shift+click).</li>
        <li>Authorization and calculations remain server-side.</li>
      </ul>
    </Modal>
  );
}

/** Seed favorite commands once for first paint consistency. */
export function ensureFavoriteCommandsSeeded(): string[] {
  return loadFavoriteCommands();
}

export function ensureRecentPagesSeeded() {
  return loadRecentPages();
}
