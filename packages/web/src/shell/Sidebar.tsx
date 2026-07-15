import { NavLink } from "react-router-dom";

const GROUPS = [
  {
    label: "Workspace",
    items: [
      { to: "/", label: "Dashboard" },
      { to: "/approvals", label: "Approvals" },
      { to: "/workflow", label: "Workflow" },
      { to: "/notifications", label: "Notifications" },
      { to: "/search", label: "Search" },
      { to: "/account/email-verification", label: "Email verification" },
      { to: "/account/mfa", label: "MFA" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/sales", label: "Sales" },
      { to: "/procurement", label: "Procurement" },
      { to: "/inventory", label: "Inventory" },
      { to: "/finance", label: "Finance" },
      { to: "/projects", label: "Projects" },
      { to: "/crm", label: "CRM" },
      { to: "/service", label: "Service" },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/hr", label: "HR" },
      { to: "/manufacturing", label: "Manufacturing" },
      { to: "/cms", label: "CMS" },
      { to: "/dam", label: "DAM" },
    ],
  },
] as const;

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="brand">
        Artisan Furnish Hub
        <span>Enterprise console</span>
      </div>
      <nav className="stack" aria-label="Modules">
        {GROUPS.map((group) => (
          <div key={group.label} className="nav-group">
            <div className="nav-group__label">{group.label}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="nav-link"
                end={item.to === "/"}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
