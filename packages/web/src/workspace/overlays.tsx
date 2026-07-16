import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COMMANDS, NOTIFICATIONS, QUICK_ACTIONS, SHORTCUTS } from "./data";
import { useWorkspaceUi } from "./context";
import { Drawer, Modal } from "./widgets";

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

export function CommandPalette() {
  const {
    paletteOpen,
    setPaletteOpen,
    recentCommands,
    rememberCommand,
    favorites,
    setShortcutsOpen,
  } = useWorkspaceUi();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [paletteOpen]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = [...COMMANDS];
    if (!needle) {
      const recent = recentCommands
        .map((id) => base.find((c) => c.id === id))
        .filter(Boolean) as (typeof COMMANDS)[number][];
      const fav = favorites
        .map((href) => base.find((c) => c.href === href))
        .filter(Boolean) as (typeof COMMANDS)[number][];
      return [...recent, ...fav, ...base]
        .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
        .slice(0, 12);
    }
    return base
      .filter((c) =>
        `${c.label} ${c.group} ${c.keywords}`.toLowerCase().includes(needle),
      )
      .slice(0, 12);
  }, [q, recentCommands, favorites]);

  if (!paletteOpen) return null;

  function run(cmd: (typeof COMMANDS)[number]) {
    rememberCommand(cmd.id);
    setPaletteOpen(false);
    if (cmd.href === "#shortcuts") {
      setShortcutsOpen(true);
      return;
    }
    navigate(cmd.href);
  }

  return (
    <div className="ws-palette-root" role="presentation">
      <button
        type="button"
        className="ws-drawer-backdrop"
        aria-label="Close command palette"
        onClick={() => setPaletteOpen(false)}
      />
      <div className="ws-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <label htmlFor="ws-cmd" className="sr-only">
          Search commands
        </label>
        <input
          id="ws-cmd"
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search modules, create actions, help…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) run(results[0]);
          }}
        />
        <ul className="ws-palette__list">
          {results.map((cmd) => (
            <li key={cmd.id}>
              <button type="button" onClick={() => run(cmd)}>
                <span>{cmd.group}</span>
                <strong>{cmd.label}</strong>
              </button>
            </li>
          ))}
          {results.length === 0 ? <li className="ws-palette__empty">No matches</li> : null}
        </ul>
        <p className="ws-palette__hint">Enter to open · Esc to close · ⌘/Ctrl K</p>
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
  const { notifOpen, setNotifOpen } = useWorkspaceUi();
  return (
    <Drawer open={notifOpen} title="Notifications" onClose={() => setNotifOpen(false)}>
      <ul className="ws-feed">
        {NOTIFICATIONS.map((n) => (
          <li key={n.id} className={n.unread ? "is-unread" : undefined}>
            <strong>{n.title}</strong>
            <span>{n.time}</span>
          </li>
        ))}
      </ul>
      <Link to="/app/notifications" className="btn btn--ghost" onClick={() => setNotifOpen(false)}>
        Open notification center
      </Link>
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
      </ul>
    </Modal>
  );
}

export function HelpModal() {
  const { helpOpen, setHelpOpen } = useWorkspaceUi();
  return (
    <Modal open={helpOpen} title="Workspace help" onClose={() => setHelpOpen(false)}>
      <p>
        This console is a presentation workspace over existing Application and Reporting APIs.
        Use the command palette for navigation and quick create. Module CRUD experiences arrive in
        later phases.
      </p>
      <ul>
        <li>Dashboard widgets can be rearranged and resized; layouts save locally.</li>
        <li>Company, branch, and workspace switchers are preference selectors for UX context.</li>
        <li>Authorization and calculations remain server-side.</li>
      </ul>
    </Modal>
  );
}
