import { NavLink } from "react-router-dom";
import { useState } from "react";
import { BRANCHES, COMPANIES, NAV_GROUPS, WORKSPACES } from "../workspace/data";
import { useWorkspaceUi } from "../workspace/context";

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
  } = useWorkspaceUi();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.id, true])),
  );

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
            <div className="nav-group__label">Favorites</div>
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
  return path;
}
