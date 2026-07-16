import { Link, useLocation } from "react-router-dom";
import { useSession } from "../state/session";
import { useWorkspaceUi } from "../workspace/context";
import { Button } from "../components/ui";
import { NOTIFICATIONS } from "../workspace/data";

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
};

function breadcrumbLabel(pathname: string): string {
  if (pathname === "/app") return "Executive dashboard";
  if (pathname.startsWith("/app/account/")) {
    return pathname.includes("mfa") ? "MFA" : "Email verification";
  }
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "app" && parts[1]) {
    const mod = MODULE_LABELS[parts[1]] ?? parts[1];
    if (parts.length === 2) return mod;
    return `${mod} · ${parts.slice(2).join(" / ")}`;
  }
  return "Workspace";
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
  const unread = NOTIFICATIONS.filter((n) => n.unread).length;
  const crumb = breadcrumbLabel(pathname);
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
          <span aria-hidden>/</span>
          <span>{crumb}</span>
        </nav>
      </div>

      <div className="ws-topbar__center">
        <button
          type="button"
          className="ws-search-trigger"
          onClick={() => setPaletteOpen(true)}
        >
          <span>Search or jump…</span>
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
