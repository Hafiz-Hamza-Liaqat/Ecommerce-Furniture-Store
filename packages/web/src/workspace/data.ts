/**
 * Presentation workspace data — illustrative Reporting / activity snapshots.
 * No client-side calculation engine; values are display fixtures for UX.
 */

export const WORKSPACES = [
  { id: "executive", label: "Executive" },
  { id: "operations", label: "Operations" },
  { id: "finance", label: "Finance" },
] as const;

export const COMPANIES = [
  { id: "afh-pk", label: "Artisan Furnish Hub PK" },
  { id: "afh-export", label: "AFH Export Ltd" },
] as const;

export const BRANCHES = [
  { id: "lahore-hq", label: "Lahore HQ" },
  { id: "karachi", label: "Karachi Showroom" },
  { id: "factory", label: "Industrial Estate Factory" },
] as const;

export type KpiId =
  | "revenue"
  | "grossProfit"
  | "netProfit"
  | "salesOrders"
  | "purchaseOrders"
  | "inventoryValue"
  | "productionCapacity"
  | "manufacturingOrders"
  | "customers"
  | "activeProjects"
  | "serviceRequests"
  | "employees"
  | "openApprovals"
  | "pendingTasks"
  | "notifications";

export type KpiDef = {
  readonly id: KpiId;
  readonly label: string;
  readonly value: string;
  readonly trend: number;
  readonly tone?: "ok" | "warn" | "neutral";
  readonly href: string;
};

export const KPIS: readonly KpiDef[] = [
  { id: "revenue", label: "Revenue", value: "₨ 48.2M", trend: 8.4, tone: "ok", href: "/app/finance" },
  { id: "grossProfit", label: "Gross profit", value: "₨ 16.1M", trend: 5.2, tone: "ok", href: "/app/finance" },
  { id: "netProfit", label: "Net profit", value: "₨ 9.4M", trend: 3.1, tone: "ok", href: "/app/finance" },
  { id: "salesOrders", label: "Sales orders", value: "312", trend: 12.0, tone: "ok", href: "/app/sales" },
  { id: "purchaseOrders", label: "Purchase orders", value: "148", trend: -2.4, tone: "warn", href: "/app/procurement" },
  { id: "inventoryValue", label: "Inventory value", value: "₨ 22.7M", trend: 1.8, tone: "neutral", href: "/app/inventory" },
  { id: "productionCapacity", label: "Production capacity", value: "86%", trend: 4.0, tone: "ok", href: "/app/manufacturing" },
  { id: "manufacturingOrders", label: "Mfg orders", value: "64", trend: 6.5, tone: "ok", href: "/app/manufacturing" },
  { id: "customers", label: "Customers", value: "1,284", trend: 2.1, tone: "ok", href: "/app/crm" },
  { id: "activeProjects", label: "Active projects", value: "37", trend: 0.0, tone: "neutral", href: "/app/projects" },
  { id: "serviceRequests", label: "Service requests", value: "29", trend: -8.0, tone: "warn", href: "/app/service" },
  { id: "employees", label: "Employees", value: "418", trend: 1.2, tone: "neutral", href: "/app/hr" },
  { id: "openApprovals", label: "Open approvals", value: "14", trend: -3.0, tone: "warn", href: "/app/approvals" },
  { id: "pendingTasks", label: "Pending tasks", value: "41", trend: 5.0, tone: "neutral", href: "/app/me" },
  { id: "notifications", label: "Notifications", value: "8", trend: 0.0, tone: "neutral", href: "/app/notifications" },
];

export const SERIES = {
  revenue: [32, 34, 31, 38, 41, 39, 44, 46, 45, 48, 47, 52],
  profit: [8, 9, 7, 10, 11, 10, 12, 13, 12, 14, 13, 15],
  cashflow: [4, 6, -2, 8, 5, 9, 3, 7, 10, 6, 8, 11],
  inventory: [18, 19, 20, 21, 20, 22, 23, 22, 24, 23, 22, 23],
  production: [62, 68, 71, 74, 70, 78, 80, 82, 79, 84, 86, 88],
  utilization: [72, 75, 78, 80, 76, 82, 85, 84, 86, 87, 86, 89],
  attendance: [91, 93, 92, 94, 95, 93, 96, 94, 95, 97, 96, 95],
  months: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
} as const;

export const PIPELINE = [
  { stage: "Lead", value: 120 },
  { stage: "Qualified", value: 78 },
  { stage: "Proposal", value: 44 },
  { stage: "Negotiation", value: 26 },
  { stage: "Won", value: 18 },
] as const;

export const CRM_FUNNEL = [
  { stage: "Aware", value: 420 },
  { stage: "Engage", value: 210 },
  { stage: "Opportunity", value: 96 },
  { stage: "Customer", value: 52 },
] as const;

export const PROJECT_PROGRESS = [
  { name: "Indus HQ", pct: 78 },
  { name: "Marina Residences", pct: 54 },
  { name: "Cedar Club", pct: 91 },
  { name: "Northline Fit-out", pct: 33 },
] as const;

export const SERVICE_WORKLOAD = [
  { label: "Open", value: 12 },
  { label: "In progress", value: 9 },
  { label: "Waiting parts", value: 5 },
  { label: "Resolved", value: 41 },
] as const;

export const MAP_POINTS = [
  { id: "w1", kind: "warehouse", label: "Lahore DC", x: 42, y: 48 },
  { id: "w2", kind: "warehouse", label: "Karachi DC", x: 28, y: 78 },
  { id: "b1", kind: "branch", label: "Lahore HQ", x: 45, y: 44 },
  { id: "b2", kind: "branch", label: "Karachi Showroom", x: 30, y: 74 },
  { id: "c1", kind: "customer", label: "Indus Group", x: 55, y: 36 },
  { id: "c2", kind: "customer", label: "Marina Hospitality", x: 62, y: 70 },
  { id: "s1", kind: "service", label: "North service region", x: 48, y: 28 },
  { id: "s2", kind: "service", label: "South service region", x: 35, y: 82 },
] as const;

export const ACTIVITY = [
  { id: "a1", title: "PO-10482 submitted for approval", meta: "Procurement · 12 min ago", kind: "approval" as const },
  { id: "a2", title: "SO-22901 confirmed", meta: "Sales · 34 min ago", kind: "order" as const },
  { id: "a3", title: "You were mentioned in Indus HQ", meta: "Projects · 1 h ago", kind: "mention" as const },
  { id: "a4", title: "Inventory adjustment INV-ADJ-88", meta: "Inventory · 2 h ago", kind: "inventory" as const },
  { id: "a5", title: "MFA reminder for finance role", meta: "Security · 3 h ago", kind: "security" as const },
  { id: "a6", title: "Audit: price list published", meta: "Audit · Yesterday", kind: "audit" as const },
] as const;

export const NOTIFICATIONS = [
  { id: "n1", title: "3 approvals await your decision", time: "10 min ago", unread: true },
  { id: "n2", title: "Service ticket SR-441 escalated", time: "45 min ago", unread: true },
  { id: "n3", title: "Weekly capacity report ready", time: "Today", unread: false },
  { id: "n4", title: "Catalogue PDF export completed", time: "Yesterday", unread: false },
] as const;

export const APPROVALS_PREVIEW = [
  { id: "ap1", title: "Discount exception 12%", owner: "Sales", due: "Today" },
  { id: "ap2", title: "Capex > ₨ 500k", owner: "Finance", due: "Tomorrow" },
  { id: "ap3", title: "Vendor onboarding", owner: "Procurement", due: "Fri" },
] as const;

export const ASSIGNED_WORK = [
  { id: "w1", title: "Finalize Marina finish samples", href: "/app/projects" },
  { id: "w2", title: "Review PO-10482", href: "/app/approvals" },
  { id: "w3", title: "Close SR-438 site visit", href: "/app/service" },
] as const;

export const QUICK_ACTIONS = [
  { id: "qa1", label: "New customer", href: "/app/crm", hint: "CRM" },
  { id: "qa2", label: "New quote", href: "/app/sales", hint: "Sales" },
  { id: "qa3", label: "New sales order", href: "/app/sales", hint: "Sales" },
  { id: "qa4", label: "Purchase request", href: "/app/procurement", hint: "Procurement" },
  { id: "qa5", label: "Inventory adjustment", href: "/app/inventory", hint: "Inventory" },
  { id: "qa6", label: "New project", href: "/app/projects", hint: "Projects" },
  { id: "qa7", label: "New task", href: "/app/me", hint: "Workspace" },
  { id: "qa8", label: "New employee", href: "/app/hr", hint: "HR" },
  { id: "qa9", label: "Service request", href: "/app/service", hint: "Service" },
  { id: "qa10", label: "Upload document", href: "/app/dam", hint: "DAM" },
] as const;

export const MY_TASKS = [
  { id: "t1", title: "Approve discount exception", status: "Due today", priority: "high" as const },
  { id: "t2", title: "Review Cedar Club BOQ", status: "This week", priority: "med" as const },
  { id: "t3", title: "Confirm timber receipt", status: "Open", priority: "med" as const },
  { id: "t4", title: "Schedule factory tour", status: "Draft", priority: "low" as const },
] as const;

export const MY_CALENDAR = [
  { id: "c1", time: "09:30", title: "Ops standup", place: "Teams" },
  { id: "c2", time: "11:00", title: "Indus HQ design review", place: "Board room" },
  { id: "c3", time: "14:00", title: "Vendor negotiation", place: "Call" },
  { id: "c4", time: "16:30", title: "Factory line walk", place: "Plant" },
] as const;

export const RECENT_RECORDS = [
  { id: "r1", label: "SO-22901", type: "Sales order", href: "/app/sales" },
  { id: "r2", label: "Indus Headquarters", type: "Project", href: "/app/projects" },
  { id: "r3", label: "PO-10482", type: "Purchase order", href: "/app/procurement" },
  { id: "r4", label: "SR-441", type: "Service", href: "/app/service" },
] as const;

export const SAVED_VIEWS = [
  { id: "v1", label: "Open sales this month", href: "/app/sales" },
  { id: "v2", label: "Low stock SKUs", href: "/app/inventory" },
  { id: "v3", label: "My approvals", href: "/app/approvals" },
] as const;

export const DRAFTS = [
  { id: "d1", label: "Quote draft — Horizon Hotels", href: "/app/sales" },
  { id: "d2", label: "PR draft — hardware pack", href: "/app/procurement" },
] as const;

export const HEATMAP = [
  [2, 4, 3, 5, 6, 4, 3],
  [3, 5, 6, 7, 5, 4, 2],
  [1, 3, 4, 6, 8, 5, 3],
  [2, 4, 5, 6, 7, 6, 4],
  [3, 4, 5, 4, 5, 3, 2],
] as const;

export const KANBAN_PREVIEW = [
  { column: "Todo", cards: ["Sample set", "BOQ check"] },
  { column: "Doing", cards: ["Finish match", "CNC nest"] },
  { column: "Done", cards: ["Pack list", "QA sign-off"] },
] as const;

export type NavItem = {
  readonly to: string;
  readonly label: string;
  readonly end?: boolean;
};

export type NavGroup = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly NavItem[];
};

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { to: "/app", label: "Executive dashboard", end: true },
      { to: "/app/me", label: "My workspace" },
      { to: "/app/analytics", label: "Analytics" },
      { to: "/app/reports", label: "Report center" },
      { to: "/app/insights", label: "Insights" },
      { to: "/app/ai", label: "AI Assistant" },
      { to: "/app/integrations", label: "Integrations" },
      { to: "/app/platform", label: "SaaS operations" },
      { to: "/app/settings/ai", label: "AI Settings" },
      { to: "/app/calendar", label: "Enterprise calendar" },
      { to: "/app/approvals", label: "Approvals" },
      { to: "/app/notifications", label: "Notifications" },
      { to: "/app/search", label: "Search" },
      { to: "/app/workflow", label: "Workflow" },
      { to: "/app/reporting", label: "Reporting" },
      { to: "/app/platform/jobs", label: "Background jobs" },
      { to: "/app/preferences", label: "Settings & preferences" },
    ],
  },
  {
    id: "operations",
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
    id: "people-plant",
    label: "People & plant",
    items: [
      { to: "/app/hr", label: "HR" },
      { to: "/app/manufacturing", label: "Manufacturing" },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      { to: "/app/platform", label: "SaaS operations" },
      { to: "/app/platform/billing", label: "Billing portal" },
      { to: "/app/platform/deployment", label: "Deployment" },
      { to: "/app/platform/monitoring", label: "Monitoring" },
      { to: "/app/platform/audit", label: "Audit center" },
      { to: "/app/cms", label: "CMS" },
      { to: "/app/dam", label: "DAM" },
      { to: "/onboarding", label: "Onboarding" },
      { to: "/admin/platform", label: "SaaS admin" },
      { to: "/portal", label: "Customer portal" },
      { to: "/app/account/email-verification", label: "Email verification" },
      { to: "/app/account/mfa", label: "MFA" },
      { to: "/app/account/security", label: "Security & devices" },
      { to: "/", label: "Public website" },
    ],
  },
];

export const COMMANDS = [
  { id: "cmd-dash", label: "Go to executive dashboard", href: "/app", group: "Navigate", keywords: "home kpi" },
  { id: "cmd-me", label: "Open my workspace", href: "/app/me", group: "Navigate", keywords: "tasks personal" },
  { id: "cmd-analytics", label: "Executive intelligence / analytics", href: "/app/analytics", group: "Navigate", keywords: "bi kpi scorecard" },
  { id: "cmd-reports", label: "Report center", href: "/app/reports", group: "Navigate", keywords: "export schedule" },
  { id: "cmd-insights", label: "Insight center", href: "/app/insights", group: "Navigate", keywords: "trends risks" },
  { id: "cmd-ai", label: "AI Assistant", href: "/app/ai", group: "Navigate", keywords: "copilot chat assist" },
  { id: "cmd-integrations", label: "Integration marketplace", href: "/app/integrations", group: "Navigate", keywords: "email sms webhook stripe" },
  { id: "cmd-webhooks", label: "Webhook center", href: "/app/integrations/webhooks", group: "Navigate", keywords: "hooks retry" },
  { id: "cmd-platform", label: "SaaS operations center", href: "/app/platform", group: "Navigate", keywords: "billing subscription deploy" },
  { id: "cmd-billing", label: "Billing portal", href: "/app/platform/billing", group: "Navigate", keywords: "invoice payment plan" },
  { id: "cmd-onboarding", label: "Customer onboarding", href: "/onboarding", group: "Navigate", keywords: "wizard company setup" },
  { id: "cmd-portal", label: "Customer portal", href: "/portal", group: "Navigate", keywords: "orders invoices tickets" },
  { id: "cmd-admin-saas", label: "SaaS administration", href: "/admin/platform", group: "Navigate", keywords: "tenants plans usage" },
  { id: "cmd-monitoring", label: "Monitoring center", href: "/app/platform/monitoring", group: "Navigate", keywords: "cpu memory queue" },
  { id: "cmd-audit-center", label: "Audit center", href: "/app/platform/audit", group: "Navigate", keywords: "security login billing" },
  { id: "cmd-demo-mode", label: "Demo mode", href: "/app/platform/demo", group: "Navigate", keywords: "seed reset tour" },
  { id: "cmd-register", label: "Create account", href: "/register", group: "Navigate", keywords: "signup register" },
  { id: "cmd-security", label: "Security & devices", href: "/app/account/security", group: "Navigate", keywords: "session devices mfa" },
  { id: "cmd-ai-settings", label: "AI Settings", href: "/app/settings/ai", group: "Navigate", keywords: "model provider" },
  { id: "cmd-ai-search", label: "Smart AI search", href: "/app/ai/search", group: "Navigate", keywords: "semantic natural language" },
  { id: "cmd-builder", label: "Dashboard builder", href: "/app/analytics/builder", group: "Navigate", keywords: "widgets layout" },
  { id: "cmd-cal", label: "Enterprise calendar", href: "/app/calendar", group: "Navigate", keywords: "schedule leave" },
  { id: "cmd-prefs", label: "Preferences center", href: "/app/preferences", group: "Navigate", keywords: "theme settings a11y" },
  { id: "cmd-sales", label: "Sales module", href: "/app/sales", group: "Navigate", keywords: "orders quotes" },
  { id: "cmd-proc", label: "Procurement module", href: "/app/procurement", group: "Navigate", keywords: "purchase" },
  { id: "cmd-inv", label: "Inventory module", href: "/app/inventory", group: "Navigate", keywords: "stock" },
  { id: "cmd-fin", label: "Finance module", href: "/app/finance", group: "Navigate", keywords: "ledger" },
  { id: "cmd-proj", label: "Projects module", href: "/app/projects", group: "Navigate", keywords: "tasks gantt" },
  { id: "cmd-crm", label: "CRM module", href: "/app/crm", group: "Navigate", keywords: "customers" },
  { id: "cmd-svc", label: "Service module", href: "/app/service", group: "Navigate", keywords: "tickets" },
  { id: "cmd-hr", label: "HR module", href: "/app/hr", group: "Navigate", keywords: "people leave" },
  { id: "cmd-mfg", label: "Manufacturing module", href: "/app/manufacturing", group: "Navigate", keywords: "bom shop" },
  { id: "cmd-cms", label: "CMS module", href: "/app/cms", group: "Navigate", keywords: "pages content" },
  { id: "cmd-dam", label: "DAM module", href: "/app/dam", group: "Navigate", keywords: "assets files" },
  { id: "cmd-appr", label: "Approvals queue", href: "/app/approvals", group: "Navigate", keywords: "decide" },
  { id: "cmd-notif", label: "Notifications", href: "/app/notifications", group: "Navigate", keywords: "inbox" },
  { id: "cmd-search", label: "Enterprise search", href: "/app/search", group: "Navigate", keywords: "find" },
  { id: "cmd-report", label: "Reporting", href: "/app/reporting", group: "Navigate", keywords: "export" },
  { id: "cmd-help", label: "Keyboard shortcuts", href: "#shortcuts", group: "Help", keywords: "keys ?" },
  { id: "cmd-create", label: "Quick create launcher", href: "#create", group: "Create", keywords: "new" },
  ...QUICK_ACTIONS.map((a) => ({
    id: `cmd-${a.id}`,
    label: a.label,
    href: a.href,
    group: "Create",
    keywords: a.hint.toLowerCase(),
  })),
] as const;

export const SHORTCUTS = [
  { keys: "⌘/Ctrl K", action: "Command center" },
  { keys: "/", action: "Open search / command palette" },
  { keys: "⌘/Ctrl B", action: "Toggle sidebar" },
  { keys: "⌘/Ctrl Shift N", action: "Notifications" },
  { keys: "⌘/Ctrl Shift C", action: "Quick create" },
  { keys: "⌘/Ctrl ,", action: "Preferences" },
  { keys: "⌘/Ctrl J", action: "AI assistant panel" },
  { keys: "?", action: "Shortcuts overlay" },
  { keys: "Esc", action: "Close overlays" },
  { keys: "Enter", action: "Submit focused form control" },
  { keys: "Tab", action: "Move focus (consistent order)" },
] as const;

export type WidgetSize = "sm" | "md" | "lg";

export type DashWidgetId =
  | "kpis"
  | "revenue"
  | "profit"
  | "pipeline"
  | "cashflow"
  | "inventory"
  | "production"
  | "utilization"
  | "funnel"
  | "projects"
  | "service"
  | "attendance"
  | "map"
  | "activity"
  | "approvals"
  | "assigned"
  | "quick"
  | "heatmap"
  | "kanban";

export type DashWidgetDef = {
  readonly id: DashWidgetId;
  readonly title: string;
  readonly defaultSize: WidgetSize;
};

export const DASH_WIDGETS: readonly DashWidgetDef[] = [
  { id: "kpis", title: "KPI strip", defaultSize: "lg" },
  { id: "revenue", title: "Revenue trend", defaultSize: "md" },
  { id: "profit", title: "Profit trend", defaultSize: "md" },
  { id: "pipeline", title: "Sales pipeline", defaultSize: "md" },
  { id: "cashflow", title: "Cash flow", defaultSize: "md" },
  { id: "inventory", title: "Inventory movement", defaultSize: "md" },
  { id: "production", title: "Production output", defaultSize: "md" },
  { id: "utilization", title: "Manufacturing utilization", defaultSize: "md" },
  { id: "funnel", title: "CRM funnel", defaultSize: "md" },
  { id: "projects", title: "Project progress", defaultSize: "md" },
  { id: "service", title: "Service workload", defaultSize: "sm" },
  { id: "attendance", title: "Attendance overview", defaultSize: "sm" },
  { id: "map", title: "Locations map", defaultSize: "lg" },
  { id: "activity", title: "Activity center", defaultSize: "md" },
  { id: "approvals", title: "Approvals", defaultSize: "sm" },
  { id: "assigned", title: "Assigned work", defaultSize: "sm" },
  { id: "quick", title: "Quick actions", defaultSize: "md" },
  { id: "heatmap", title: "Ops heatmap", defaultSize: "sm" },
  { id: "kanban", title: "Kanban preview", defaultSize: "md" },
];
