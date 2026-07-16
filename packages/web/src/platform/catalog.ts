import type { PlanDef } from "./types";

export const PLANS: readonly PlanDef[] = [
  {
    id: "trial",
    label: "Trial",
    monthlyPrice: "₨ 0",
    description: "14-day full-module evaluation with limited seats.",
    seats: 5,
    aiCredits: 500,
    storageGb: 5,
    apiQuota: 10_000,
    modules: ["sales", "inventory", "finance", "crm", "ai"],
  },
  {
    id: "free",
    label: "Free",
    monthlyPrice: "₨ 0",
    description: "Core workspace for small teams getting started.",
    seats: 3,
    aiCredits: 100,
    storageGb: 2,
    apiQuota: 2_000,
    modules: ["sales", "inventory", "crm"],
  },
  {
    id: "professional",
    label: "Professional",
    monthlyPrice: "₨ 89,000",
    description: "Operations, BI, integrations, and AI copilot for growing enterprises.",
    seats: 50,
    aiCredits: 10_000,
    storageGb: 200,
    apiQuota: 250_000,
    modules: ["all-core", "ops", "analytics", "integrations", "ai"],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    monthlyPrice: "Custom",
    description: "Unlimited seats, SSO, dedicated success, and production SLAs.",
    seats: "unlimited",
    aiCredits: "unlimited",
    storageGb: "unlimited",
    apiQuota: "unlimited",
    modules: ["all", "sso", "custom-integrations", "dedicated-support"],
  },
];

export const ONBOARDING_STEPS = [
  { id: "welcome", label: "Welcome", description: "Meet AFH and set your goals." },
  { id: "company", label: "Company", description: "Create your company profile." },
  { id: "branding", label: "Branding", description: "Logo and brand color." },
  { id: "branch", label: "Branch", description: "Primary branch location." },
  { id: "warehouse", label: "Warehouse", description: "Default warehouse setup." },
  { id: "fiscal", label: "Fiscal year", description: "Accounting calendar start." },
  { id: "currency", label: "Currency", description: "Base currency for ledgers." },
  { id: "tax", label: "Tax profile", description: "Default tax configuration." },
  { id: "invites", label: "Invitations", description: "Invite your team." },
  { id: "roles", label: "Roles", description: "Role and permission presets." },
  { id: "prefs", label: "Preferences", description: "Default workspace preferences." },
  { id: "checklist", label: "Checklist", description: "Confirm go-live readiness." },
  { id: "tour", label: "Walkthrough", description: "Guided product tour." },
] as const;

export const ROLE_PRESETS = [
  { id: "admin", label: "Administrator", permissions: "Full platform access" },
  { id: "ops", label: "Operations", permissions: "Sales, inventory, manufacturing" },
  { id: "finance", label: "Finance", permissions: "Ledger, invoices, payments" },
  { id: "viewer", label: "Viewer", permissions: "Read-only dashboards" },
] as const;

export const MODULE_ACCESS = [
  "Sales",
  "Procurement",
  "Inventory",
  "Finance",
  "Projects",
  "CRM",
  "Service",
  "HR",
  "Manufacturing",
  "Analytics",
  "AI Copilot",
  "Integrations",
] as const;

export const SUCCESS_LINKS = [
  { id: "docs", label: "Documentation", href: "/app/platform/success", kind: "docs" },
  { id: "videos", label: "Video tutorials", href: "/app/platform/success", kind: "video" },
  { id: "community", label: "Community & FAQ", href: "/faq", kind: "community" },
  { id: "changelog", label: "Changelog", href: "/app/platform/releases", kind: "release" },
] as const;

export const PRODUCT_TOURS = [
  { id: "exec", title: "Executive dashboard tour", minutes: 4 },
  { id: "sales", title: "Sales order walkthrough", minutes: 6 },
  { id: "ai", title: "AI Copilot essentials", minutes: 5 },
  { id: "integrations", title: "Connect your first integration", minutes: 7 },
] as const;

export const RELEASE_NOTES = [
  {
    version: "0.9.0",
    title: "Enterprise integrations & SaaS operations",
    bullets: [
      "Integration marketplace and health dashboards",
      "Customer onboarding wizard",
      "Billing portal and license limits UI",
      "Deployment, monitoring, and backup centers",
    ],
  },
  {
    version: "0.8.0",
    title: "AI Copilot",
    bullets: ["Provider-agnostic AI panel", "Executive insights assist"],
  },
  {
    version: "0.7.0",
    title: "Business intelligence",
    bullets: ["Analytics center", "Dashboard builder", "Report scheduling UI"],
  },
] as const;

export const MONITOR_METRICS_SEED = [
  { id: "cpu", label: "CPU", value: "34%", tone: "ok" as const, hint: "Host average" },
  { id: "mem", label: "Memory", value: "61%", tone: "ok" as const, hint: "RSS / limit" },
  { id: "req", label: "Requests", value: "1.2k/min", tone: "ok" as const, hint: "API gateway" },
  { id: "err", label: "Errors", value: "0.18%", tone: "ok" as const, hint: "5xx rate" },
  { id: "queue", label: "Queue depth", value: "42", tone: "warn" as const, hint: "Jobs waiting" },
  { id: "broker", label: "Broker", value: "Healthy", tone: "ok" as const, hint: "Event bus" },
  { id: "sql", label: "SQL", value: "12ms p50", tone: "ok" as const, hint: "Primary pool" },
  { id: "ai", label: "AI", value: "88 rpm", tone: "ok" as const, hint: "Provider calls" },
  { id: "int", label: "Integrations", value: "14 connected", tone: "ok" as const, hint: "Active providers" },
  { id: "api", label: "API", value: "99.95%", tone: "ok" as const, hint: "Availability" },
  { id: "storage", label: "Storage", value: "47%", tone: "neutral" as const, hint: "Object store" },
] as const;

export function planById(id: string): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}
