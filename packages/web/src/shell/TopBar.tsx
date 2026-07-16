import { Link, useLocation } from "react-router-dom";
import { useSession } from "../state/session";
import { useWorkspaceUi } from "../workspace/context";
import { Button } from "../components/ui";
import { NOTIFICATIONS } from "../workspace/data";

const CRUMBS: Record<string, string> = {
  "/app": "Executive dashboard",
  "/app/me": "My workspace",
  "/app/sales": "Sales",
  "/app/procurement": "Procurement",
  "/app/inventory": "Inventory",
  "/app/finance": "Finance",
  "/app/projects": "Projects",
  "/app/crm": "CRM",
  "/app/service": "Service",
  "/app/hr": "HR",
  "/app/manufacturing": "Manufacturing",
  "/app/cms": "CMS",
  "/app/dam": "DAM",
  "/app/notifications": "Notifications",
  "/app/search": "Search",
  "/app/reporting": "Reporting",
  "/app/workflow": "Workflow",
  "/app/approvals": "Approvals",
  "/app/account/email-verification": "Email verification",
  "/app/account/mfa": "MFA",
};

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
  const crumb = CRUMBS[pathname] ?? "Workspace";
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
