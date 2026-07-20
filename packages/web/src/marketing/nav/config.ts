/**
 * RC9.4.3 — Global navigation menus, company mega links, role-aware account menus.
 */

export type WorkspaceRoleId =
  | "buyer"
  | "designer"
  | "architect"
  | "civil"
  | "sales"
  | "supplier"
  | "admin";

export type WorkspaceRoleMeta = {
  readonly id: WorkspaceRoleId;
  readonly label: string;
  readonly badge: string;
};

export const WORKSPACE_ROLES: readonly WorkspaceRoleMeta[] = [
  { id: "buyer", label: "Buyer", badge: "Buyer" },
  { id: "designer", label: "Interior Designer", badge: "Interior Designer" },
  { id: "architect", label: "Architect", badge: "Architect" },
  { id: "civil", label: "Civil Engineer", badge: "Civil Engineer" },
  { id: "sales", label: "Sales Agent", badge: "Sales Agent" },
  { id: "supplier", label: "Manufacturer", badge: "Manufacturer" },
  { id: "admin", label: "Administrator", badge: "Admin" },
];

export function roleById(id: WorkspaceRoleId): WorkspaceRoleMeta {
  return WORKSPACE_ROLES.find((r) => r.id === id) ?? WORKSPACE_ROLES[0]!;
}

export type AccountMenuLink = {
  readonly label: string;
  readonly to: string;
  readonly icon?: string;
  readonly action?: "logout" | "notifications" | "appearance";
};

export type AccountMenuSection = {
  readonly id: string;
  readonly title?: string;
  readonly links: readonly AccountMenuLink[];
};

export const COMPANY_MEGA_LINKS: readonly { label: string; to: string }[] = [
  { label: "About", to: "/about" },
  { label: "Our Story", to: "/story" },
  { label: "Leadership", to: "/leadership" },
  { label: "Careers", to: "/careers" },
  { label: "Partners", to: "/partners" },
  { label: "Distributors", to: "/distributors" },
  { label: "News", to: "/news" },
  { label: "Events", to: "/events" },
  { label: "FAQ", to: "/faq" },
  { label: "Downloads", to: "/downloads" },
  { label: "Contact", to: "/contact" },
  { label: "Book a demo", to: "/demo" },
];

const MENU_ICONS = {
  profile: "👤",
  projects: "📁",
  wishlist: "❤️",
  compare: "⚖️",
  notifications: "🔔",
  appearance: "🌓",
  orders: "📄",
  messages: "💬",
  logout: "🚪",
  dashboard: "📊",
} as const;

const ROLE_DASHBOARD_LINKS: Record<
  WorkspaceRoleId,
  readonly { readonly label: string; readonly to: string }[]
> = {
  buyer: [{ label: "Buyer Dashboard", to: "/my-projects" }],
  designer: [{ label: "Designer Dashboard", to: "/my-projects" }],
  architect: [{ label: "Architect Dashboard", to: "/my-projects" }],
  civil: [{ label: "Engineer Dashboard", to: "/my-projects" }],
  sales: [{ label: "Sales Dashboard", to: "/app/crm" }],
  supplier: [{ label: "Manufacturer Dashboard", to: "/app" }],
  admin: [
    { label: "Admin Dashboard", to: "/app" },
    { label: "Admin Settings", to: "/app/platform" },
  ],
};

/** Build role-aware account menu sections (RC9.4.3). */
export function buildRoleAccountSections(role: WorkspaceRoleId): readonly AccountMenuSection[] {
  const dashboards = ROLE_DASHBOARD_LINKS[role].map((link) => ({
    ...link,
    icon: MENU_ICONS.dashboard,
  }));

  const sections: AccountMenuSection[] = [];

  if (dashboards.length > 0) {
    sections.push({ id: "role-dashboard", links: dashboards });
  }

  sections.push({
    id: "profile",
    links: [{ label: "Profile", to: "/app/me", icon: MENU_ICONS.profile }],
  });

  sections.push({
    id: "workspace",
    links: [
      { label: "My Projects", to: "/my-projects", icon: MENU_ICONS.projects },
      { label: "Wishlist", to: "/wishlist", icon: MENU_ICONS.wishlist },
      { label: "Compare", to: "/compare", icon: MENU_ICONS.compare },
      {
        label: "Notifications",
        to: "#notifications",
        icon: MENU_ICONS.notifications,
        action: "notifications",
      },
      {
        label: "Appearance",
        to: "#appearance",
        icon: MENU_ICONS.appearance,
        action: "appearance",
      },
    ],
  });

  sections.push({
    id: "account",
    links: [
      { label: "Orders", to: "/portal", icon: MENU_ICONS.orders },
      { label: "Messages", to: "/portal", icon: MENU_ICONS.messages },
    ],
  });

  sections.push({
    id: "logout",
    links: [{ label: "Logout", to: "#logout", icon: MENU_ICONS.logout, action: "logout" }],
  });

  return sections;
}

/** @deprecated Use buildRoleAccountSections — kept for tests migrating gradually */
export const ROLE_ACCOUNT_MENUS: Record<WorkspaceRoleId, readonly AccountMenuSection[]> = {
  buyer: buildRoleAccountSections("buyer"),
  designer: buildRoleAccountSections("designer"),
  architect: buildRoleAccountSections("architect"),
  civil: buildRoleAccountSections("civil"),
  sales: buildRoleAccountSections("sales"),
  supplier: buildRoleAccountSections("supplier"),
  admin: buildRoleAccountSections("admin"),
};

export const GUEST_ACCOUNT_SECTIONS: readonly AccountMenuSection[] = [
  {
    id: "guest",
    links: [
      { label: "Login", to: "/login" },
      { label: "Register", to: "/register" },
      { label: "Saved Wishlist", to: "/wishlist", icon: MENU_ICONS.wishlist },
    ],
  },
];

/** Buyer upgrade paths — role registration / application flow. */
export const BECOME_ROLE_OPTIONS: readonly { label: string; to: string }[] = [
  { label: "Become a Partner", to: "/register?intent=sales" },
  { label: "Register as Interior Designer", to: "/register?intent=designer" },
  { label: "Register as Sales Agent", to: "/register?intent=sales" },
];
