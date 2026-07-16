import { NavLink } from "react-router-dom";

const GROUPS = [
  {
    label: "Workspace",
    items: [
      { to: "/app", label: "Dashboard" },
      { to: "/app/approvals", label: "Approvals" },
      { to: "/app/workflow", label: "Workflow" },
      { to: "/app/notifications", label: "Notifications" },
      { to: "/app/search", label: "Search" },
      { to: "/app/account/email-verification", label: "Email verification" },
      { to: "/app/account/mfa", label: "MFA" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/app/sales", label: "Sales" },
      { to: "/app/procurement", label: "Procurement" },
      { to: "/app/inventory", label: "Inventory" },
      { to: "/app/finance", label: "Finance" },
      { to: "/app/projects", label: "Projects" },
      { to: "/app/crm", label: "CRM" },
      { to: "/app/service", label: "Service" },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/app/hr", label: "HR" },
      { to: "/app/manufacturing", label: "Manufacturing" },
      { to: "/app/cms", label: "CMS" },
      { to: "/app/dam", label: "DAM" },
      { to: "/", label: "Public website" },
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
                end={item.to === "/app"}
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
