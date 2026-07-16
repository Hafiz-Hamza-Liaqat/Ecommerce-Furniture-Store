import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { BRANCHES, COMPANIES, NAV_GROUPS, WORKSPACES } from "../workspace/data";
import { useWorkspaceUi } from "../workspace/context";
import { loadBookmarks } from "../workspace/prefs";

export function Sidebar() {
  const {
    sidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
    workspaceId,
    companyId,
    branchId,
    setWorkspaceId,
    setCompanyId,
    setBranchId,
    favorites,
    recentPages,
  } = useWorkspaceUi();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.id, true])),
  );
  const [bookmarks] = useState(() => loadBookmarks());
  const { pathname } = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  const frequent = recentPages
    .slice()
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);

  return (
    <>
      {mobileNavOpen ? (
        <button
          type="button"
          className="ws-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <aside
        className={`sidebar ws-sidebar${sidebarCollapsed ? " is-collapsed" : ""}${mobileNavOpen ? " is-open" : ""}`}
        aria-label="Primary"
      >
        <div className="brand">
          <span className="brand__mark">AFH</span>
          {!sidebarCollapsed ? (
            <>
              Artisan Furnish Hub
              <span>Enterprise workspace</span>
            </>
          ) : null}
        </div>

        {!sidebarCollapsed ? (
          <div className="ws-switchers">
            <label>
              <span>Workspace</span>
              <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
                {WORKSPACES.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Company</span>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                {COMPANIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Branch</span>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {favorites.length > 0 && !sidebarCollapsed ? (
          <div className="nav-group">
            <div className="nav-group__label">Module favorites</div>
            {favorites.map((to) => (
              <NavLink
                key={to}
                to={to}
                className="nav-link"
                end={to === "/app"}
                onClick={() => setMobileNavOpen(false)}
              >
                {labelForPath(to)}
              </NavLink>
            ))}
          </div>
        ) : null}

        {!sidebarCollapsed && frequent.length > 0 ? (
          <div className="nav-group">
            <div className="nav-group__label">Recently visited</div>
            {frequent.map((p) => (
              <NavLink
                key={p.path}
                to={p.path}
                className="nav-link"
                end={p.path === "/app"}
                onClick={() => setMobileNavOpen(false)}
              >
                {p.label}
              </NavLink>
            ))}
          </div>
        ) : null}

        {!sidebarCollapsed && bookmarks.length > 0 ? (
          <div className="nav-group">
            <div className="nav-group__label">Bookmarks</div>
            {bookmarks.map((b) => (
              <NavLink
                key={b.path}
                to={b.path}
                className="nav-link"
                end={b.path === "/app"}
                onClick={() => setMobileNavOpen(false)}
              >
                {b.label}
              </NavLink>
            ))}
          </div>
        ) : null}

        {!sidebarCollapsed ? (
          <div className="nav-group">
            <div className="nav-group__label">Suggestions</div>
            <NavLink to="/app/analytics" className="nav-link" onClick={() => setMobileNavOpen(false)}>
              Executive analytics
            </NavLink>
            <NavLink to="/app/approvals" className="nav-link" onClick={() => setMobileNavOpen(false)}>
              Pending approvals
            </NavLink>
            <NavLink to="/app/calendar" className="nav-link" onClick={() => setMobileNavOpen(false)}>
              Today&apos;s calendar
            </NavLink>
            <NavLink to="/app/search" className="nav-link" onClick={() => setMobileNavOpen(false)}>
              Enterprise search
            </NavLink>
          </div>
        ) : null}

        <nav className="stack ws-sidebar__nav" aria-label="Modules">
          {NAV_GROUPS.map((group) => {
            const open = openGroups[group.id] !== false;
            return (
              <div key={group.id} className="nav-group">
                <button
                  type="button"
                  className="nav-group__label nav-group__toggle"
                  aria-expanded={open}
                  onClick={() =>
                    setOpenGroups((prev) => ({ ...prev, [group.id]: !open }))
                  }
                >
                  {sidebarCollapsed ? group.label.slice(0, 1) : group.label}
                </button>
                {open || sidebarCollapsed
                  ? group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className="nav-link"
                        end={Boolean(item.end)}
                        title={item.label}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        {sidebarCollapsed ? item.label.slice(0, 2) : item.label}
                      </NavLink>
                    ))
                  : null}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function labelForPath(path: string): string {
  for (const group of NAV_GROUPS) {
    const found = group.items.find((i) => i.to === path);
    if (found) return found.label;
  }
  if (path === "/app/calendar") return "Enterprise calendar";
  if (path === "/app/preferences") return "Preferences";
  return path;
}
