import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSession } from "../state/session";
import { useWorkspaceUi } from "../workspace/context";
import { Button } from "../components/ui";
import { loadInbox } from "../workspace/prefs";

const MODULE_LABELS: Record<string, string> = {
  sales: "Sales",
  procurement: "Procurement",
  inventory: "Inventory",
  finance: "Finance",
  projects: "Projects",
  crm: "CRM",
  service: "Service",
  hr: "HR",
  manufacturing: "Manufacturing",
  cms: "CMS",
  dam: "DAM",
  me: "My workspace",
  notifications: "Notifications",
  search: "Search",
  reporting: "Reporting",
  workflow: "Workflow",
  approvals: "Approvals",
  calendar: "Calendar",
  preferences: "Preferences",
};

function breadcrumbTrail(pathname: string): { label: string; to?: string }[] {
  if (pathname === "/app") return [{ label: "Executive dashboard" }];
  if (pathname.startsWith("/app/account/")) {
    return [
      { label: "Account", to: "/app/account/mfa" },
      { label: pathname.includes("mfa") ? "MFA" : "Email verification" },
    ];
  }
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "app" || !parts[1]) return [{ label: "Workspace" }];
  const trail: { label: string; to?: string }[] = [
    { label: MODULE_LABELS[parts[1]] ?? parts[1], to: `/app/${parts[1]}` },
  ];
  for (let i = 2; i < parts.length; i++) {
    const crumb: { label: string; to?: string } = {
      label: parts[i]!.replace(/-/g, " "),
    };
    if (i < parts.length - 1) {
      crumb.to = `/app/${parts.slice(1, i + 1).join("/")}`;
    }
    trail.push(crumb);
  }
  return trail;
}

export function TopBar() {
  const {
    user,
    developerMode,
    theme,
    lastCorrelationId,
    setDeveloperMode,
    setTheme,
    clearSession,
    api,
  } = useSession();
  const {
    setSidebarCollapsed,
    sidebarCollapsed,
    setMobileNavOpen,
    setPaletteOpen,
    setNotifOpen,
    setCreateOpen,
    setShortcutsOpen,
    setHelpOpen,
    toggleFavorite,
    favorites,
    toast,
  } = useWorkspaceUi();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(
    () => loadInbox().filter((n) => n.unread && !n.archived).length,
  );

  useEffect(() => {
    const refresh = () =>
      setUnread(loadInbox().filter((n) => n.unread && !n.archived).length);
    refresh();
    const t = window.setInterval(refresh, 8000);
    return () => window.clearInterval(t);
  }, [pathname]);
  const crumbs = breadcrumbTrail(pathname);
  const isFav = favorites.includes(pathname);

  async function onLogout() {
    try {
      await api.signOut();
    } catch {
      /* session may already be invalid */
    }
    clearSession();
  }

  return (
    <header className="topbar ws-topbar">
      <div className="ws-topbar__left">
        <button
          type="button"
          className="ws-icon-btn ws-mobile-nav"
          aria-label="Open navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          Menu
        </button>
        <button
          type="button"
          className="ws-icon-btn ws-collapse-nav"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? "»" : "«"}
        </button>
        <nav className="ws-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/app">Workspace</Link>
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="ws-breadcrumbs__seg">
              <span aria-hidden>/</span>
              {c.to && i < crumbs.length - 1 ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
        </nav>
      </div>

      <div className="ws-topbar__center">
        <button
          type="button"
          className="ws-search-trigger"
          onClick={() => setPaletteOpen(true)}
        >
          <span>Command center…</span>
          <kbd>⌘K</kbd>
        </button>
      </div>

      <div className="ws-topbar__right row">
        <button
          type="button"
          className="ws-icon-btn"
          aria-pressed={isFav}
          onClick={() => {
            toggleFavorite(pathname);
            toast({
              tone: "ok",
              title: isFav ? "Removed from favorites" : "Added to favorites",
            });
          }}
        >
          {isFav ? "★" : "☆"}
        </button>
        <Button variant="ghost" onClick={() => setCreateOpen(true)}>
          Create
        </Button>
        <button
          type="button"
          className="ws-icon-btn ws-notif-btn"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          onClick={() => setNotifOpen(true)}
        >
          Bell
          {unread > 0 ? <span className="ws-notif-dot">{unread}</span> : null}
        </button>
        <div className="ws-user-menu">
          <button type="button" className="ws-user-menu__trigger" aria-haspopup="menu">
            <span className="ws-avatar" aria-hidden>
              {(user?.fullName ?? user?.email ?? "U").slice(0, 1).toUpperCase()}
            </span>
            <span className="ws-user-menu__name">
              {user?.fullName ?? user?.email ?? "Signed in"}
            </span>
          </button>
          <div className="ws-user-menu__panel" role="menu">
            <button type="button" role="menuitem" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              Theme: {theme === "dark" ? "Dark" : "Light"}
            </button>
            <button type="button" role="menuitem" onClick={() => setDeveloperMode(!developerMode)}>
              Dev mode: {developerMode ? "On" : "Off"}
            </button>
            <button type="button" role="menuitem" onClick={() => setShortcutsOpen(true)}>
              Keyboard shortcuts
            </button>
            <button type="button" role="menuitem" onClick={() => setHelpOpen(true)}>
              Help
            </button>
            <Link to="/app/preferences" role="menuitem">
              Preferences
            </Link>
            <Link to="/app/calendar" role="menuitem">
              Enterprise calendar
            </Link>
            <Link to="/app/account/mfa" role="menuitem">
              Security / MFA
            </Link>
            <Link to="/app/me" role="menuitem">
              My workspace
            </Link>
            <button type="button" role="menuitem" onClick={() => void onLogout()}>
              Log out
            </button>
          </div>
        </div>
        {developerMode && lastCorrelationId ? (
          <span className="ws-corr" title="Last correlation id">
            {lastCorrelationId.slice(0, 8)}
          </span>
        ) : null}
      </div>
    </header>
  );
}
