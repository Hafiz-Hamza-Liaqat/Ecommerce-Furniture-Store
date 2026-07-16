import { MONITOR_METRICS_SEED, PLANS } from "./catalog";
import type {
  AuditEvent,
  BackupJob,
  DemoState,
  DeploymentHistoryItem,
  FeatureRequest,
  InvoiceRecord,
  LicenseEntitlement,
  MetricSnapshot,
  OnboardingDraft,
  PaymentMethod,
  PortalInvoice,
  PortalOrder,
  PortalProject,
  PortalTicket,
  ReleaseMeta,
  SubscriptionState,
  SupportTicket,
  TenantRecord,
} from "./types";

const K = {
  onboarding: "afh.web.platform.onboarding",
  subscription: "afh.web.platform.subscription",
  invoices: "afh.web.platform.invoices",
  methods: "afh.web.platform.methods",
  backups: "afh.web.platform.backups",
  audit: "afh.web.platform.audit",
  tenants: "afh.web.platform.tenants",
  tickets: "afh.web.platform.tickets",
  features: "afh.web.platform.features",
  demo: "afh.web.platform.demo",
  sync: "afh.web.platform.syncAt",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function now(): number {
  return Date.now();
}

const DEFAULT_ONBOARDING: OnboardingDraft = {
  step: 0,
  companyName: "",
  brandColor: "#1f6f6a",
  logoName: "",
  branchName: "",
  warehouseName: "",
  fiscalYearStart: "2026-07-01",
  currency: "PKR",
  taxProfile: "GST-standard",
  inviteEmails: "",
  rolePreset: "admin",
  completed: [],
};

const DEFAULT_SUB: SubscriptionState = {
  planId: "professional",
  status: "active",
  renewsAt: Date.now() + 30 * 86400000,
  seatsUsed: 28,
  seatsLimit: 50,
  aiUsed: 3240,
  aiLimit: 10_000,
  storageUsedGb: 47,
  storageLimitGb: 200,
  apiUsed: 84_200,
  apiLimit: 250_000,
};

function seedInvoices(): InvoiceRecord[] {
  return [
    {
      id: "inv-1",
      number: "AFH-2026-0142",
      amount: "₨ 89,000",
      status: "paid",
      issuedAt: now() - 20 * 86400000,
      dueAt: now() - 10 * 86400000,
      taxInvoice: true,
    },
    {
      id: "inv-2",
      number: "AFH-2026-0158",
      amount: "₨ 89,000",
      status: "open",
      issuedAt: now() - 2 * 86400000,
      dueAt: now() + 12 * 86400000,
      taxInvoice: true,
    },
    {
      id: "inv-3",
      number: "AFH-CR-0041",
      amount: "₨ 12,000",
      status: "credit",
      issuedAt: now() - 40 * 86400000,
      dueAt: null,
      taxInvoice: false,
    },
  ];
}

function seedMethods(): PaymentMethod[] {
  return [
    { id: "pm-1", brand: "Visa", last4: "4242", exp: "09/28", primary: true },
    { id: "pm-2", brand: "PayPal", last4: "hub@", exp: "—", primary: false },
  ];
}

function seedBackups(): BackupJob[] {
  return [
    {
      id: "bk-1",
      createdAt: now() - 86400000,
      status: "validated",
      sizeHint: "2.4 GB",
      retentionDays: 30,
      note: "Nightly automated",
    },
    {
      id: "bk-2",
      createdAt: now() - 3 * 86400000,
      status: "success",
      sizeHint: "2.3 GB",
      retentionDays: 30,
    },
    {
      id: "bk-3",
      createdAt: now() - 8 * 86400000,
      status: "failed",
      sizeHint: "—",
      retentionDays: 30,
      note: "Object store timeout (UI fixture)",
    },
  ];
}

function seedAudit(): AuditEvent[] {
  return [
    {
      id: "ae-1",
      at: now() - 3600000,
      category: "login",
      actor: "ops@afh.local",
      summary: "Successful login · MFA verified",
    },
    {
      id: "ae-2",
      at: now() - 7200000,
      category: "billing",
      actor: "system",
      summary: "Invoice AFH-2026-0158 issued",
    },
    {
      id: "ae-3",
      at: now() - 10800000,
      category: "ai",
      actor: "exec@afh.local",
      summary: "AI Copilot session · 12 turns",
    },
    {
      id: "ae-4",
      at: now() - 14400000,
      category: "api",
      actor: "key:afh_live_…",
      summary: "API quota 84.2k / 250k",
    },
    {
      id: "ae-5",
      at: now() - 18000000,
      category: "integration",
      actor: "admin@afh.local",
      summary: "Stripe payment provider health probe OK",
    },
    {
      id: "ae-6",
      at: now() - 21600000,
      category: "security",
      actor: "system",
      summary: "Credential rotation reminder · SSO Microsoft",
    },
    {
      id: "ae-7",
      at: now() - 25200000,
      category: "user",
      actor: "hr@afh.local",
      summary: "Invited 3 users · Operations role",
    },
    {
      id: "ae-8",
      at: now() - 28800000,
      category: "config",
      actor: "admin@afh.local",
      summary: "Plan unchanged · Professional",
    },
  ];
}

function seedTenants(): TenantRecord[] {
  return [
    {
      id: "t-afh",
      name: "Artisan Furnish Hub PK",
      planId: "enterprise",
      status: "active",
      users: 118,
      storageUsedGb: 412,
      aiUsage: 18200,
      apiUsage: 910000,
      createdAt: now() - 400 * 86400000,
    },
    {
      id: "t-cedar",
      name: "Cedar Living Group",
      planId: "professional",
      status: "active",
      users: 34,
      storageUsedGb: 61,
      aiUsage: 4100,
      apiUsage: 120000,
      createdAt: now() - 90 * 86400000,
    },
    {
      id: "t-trial",
      name: "Northline Interiors (trial)",
      planId: "trial",
      status: "provisioning",
      users: 2,
      storageUsedGb: 0.4,
      aiUsage: 40,
      apiUsage: 800,
      createdAt: now() - 2 * 86400000,
    },
  ];
}

export function loadOnboarding(): OnboardingDraft {
  return read(K.onboarding, DEFAULT_ONBOARDING);
}

export function saveOnboarding(draft: OnboardingDraft): void {
  write(K.onboarding, draft);
  pushAudit("config", `Onboarding step ${draft.step + 1} saved`);
}

export function loadSubscription(): SubscriptionState {
  return read(K.subscription, DEFAULT_SUB);
}

export function saveSubscription(sub: SubscriptionState): void {
  write(K.subscription, sub);
  pushAudit("billing", `Subscription set to ${sub.planId} (${sub.status})`);
}

export function loadInvoices(): InvoiceRecord[] {
  return read(K.invoices, seedInvoices());
}

export function saveInvoices(list: InvoiceRecord[]): void {
  write(K.invoices, list);
}

export function loadPaymentMethods(): PaymentMethod[] {
  return read(K.methods, seedMethods());
}

export function savePaymentMethods(list: PaymentMethod[]): void {
  write(K.methods, list);
}

export function loadBackups(): BackupJob[] {
  return read(K.backups, seedBackups());
}

export function saveBackups(list: BackupJob[]): void {
  write(K.backups, list);
}

export function loadAudit(): AuditEvent[] {
  return read(K.audit, seedAudit());
}

export function pushAudit(category: AuditEvent["category"], summary: string, actor = "workspace"): void {
  const next: AuditEvent = {
    id: `ae-${Date.now()}`,
    at: now(),
    category,
    actor,
    summary,
  };
  const list = [next, ...loadAudit()].slice(0, 200);
  write(K.audit, list);
}

export function loadTenants(): TenantRecord[] {
  return read(K.tenants, seedTenants());
}

export function loadLicenses(sub = loadSubscription()): LicenseEntitlement[] {
  return [
    { id: "seats", label: "Seats", used: sub.seatsUsed, limit: sub.seatsLimit, unit: "users" },
    { id: "ai", label: "AI credits", used: sub.aiUsed, limit: sub.aiLimit, unit: "credits" },
    { id: "storage", label: "Storage", used: sub.storageUsedGb, limit: sub.storageLimitGb, unit: "GB" },
    { id: "api", label: "API quota", used: sub.apiUsed, limit: sub.apiLimit, unit: "calls/mo" },
  ];
}

export function loadReleaseMeta(): ReleaseMeta {
  return {
    version: "0.9.0",
    build: "plt-2026.07.15",
    migrationVersion: "m-0f-frozen",
    deployedAt: now() - 6 * 3600000,
    environment: "production-ui",
    notes: "SaaS operations & onboarding presentation layer",
  };
}

export function loadDeploymentHistory(): DeploymentHistoryItem[] {
  return [
    {
      id: "dh-1",
      at: now() - 6 * 3600000,
      version: "0.9.0",
      action: "deploy",
      by: "release-bot",
      result: "ok",
    },
    {
      id: "dh-2",
      at: now() - 4 * 86400000,
      version: "0.8.0",
      action: "deploy",
      by: "release-bot",
      result: "ok",
    },
    {
      id: "dh-3",
      at: now() - 12 * 86400000,
      version: "0.7.2",
      action: "rollback",
      by: "sre@afh.local",
      result: "ok",
    },
  ];
}

export function loadTickets(): SupportTicket[] {
  return read(K.tickets, [
    {
      id: "tk-1",
      subject: "Help connecting Microsoft 365 email",
      status: "open",
      createdAt: now() - 2 * 86400000,
    },
    {
      id: "tk-2",
      subject: "Request fiscal calendar change",
      status: "pending",
      createdAt: now() - 5 * 86400000,
    },
  ]);
}

export function saveTickets(list: SupportTicket[]): void {
  write(K.tickets, list);
}

export function loadFeatureRequests(): FeatureRequest[] {
  return read(K.features, [
    { id: "fr-1", title: "Regional payment gateways", votes: 42, status: "planned" },
    { id: "fr-2", title: "Offline field service packs", votes: 18, status: "triage" },
    { id: "fr-3", title: "Advanced warehouse heatmaps", votes: 67, status: "shipped" },
  ]);
}

export function loadDemo(): DemoState {
  return read(K.demo, { active: false, seededAt: null, companyName: "AFH Demo Co" });
}

export function saveDemo(state: DemoState): void {
  write(K.demo, state);
}

export function resetDemo(): DemoState {
  const state: DemoState = {
    active: true,
    seededAt: now(),
    companyName: "AFH Demo Co",
  };
  saveDemo(state);
  saveOnboarding({
    ...DEFAULT_ONBOARDING,
    companyName: state.companyName,
    branchName: "Demo Branch",
    warehouseName: "Demo Warehouse",
    completed: ONBOARDING_COMPLETE_IDS,
    step: ONBOARDING_COMPLETE_IDS.length - 1,
  });
  pushAudit("config", "Demo workspace seeded (no production data)");
  return state;
}

const ONBOARDING_COMPLETE_IDS = [
  "welcome",
  "company",
  "branding",
  "branch",
  "warehouse",
  "fiscal",
  "currency",
  "tax",
  "invites",
  "roles",
  "prefs",
  "checklist",
  "tour",
] as const;

export function clearDemo(): DemoState {
  const state: DemoState = { active: false, seededAt: null, companyName: "AFH Demo Co" };
  saveDemo(state);
  saveOnboarding(DEFAULT_ONBOARDING);
  pushAudit("config", "Demo workspace reset");
  return state;
}

export function loadPortalOrders(): PortalOrder[] {
  return [
    { id: "so-22901", title: "Marina Residences · lounge set", status: "Confirmed", amount: "₨ 1.8M", updatedAt: now() - 86400000 },
    { id: "so-22840", title: "Indus HQ · boardroom", status: "In production", amount: "₨ 3.2M", updatedAt: now() - 3 * 86400000 },
  ];
}

export function loadPortalInvoices(): PortalInvoice[] {
  return [
    { id: "pi-1", number: "C-INV-8841", amount: "₨ 640,000", status: "Paid", dueAt: null },
    { id: "pi-2", number: "C-INV-8910", amount: "₨ 220,000", status: "Open", dueAt: now() + 10 * 86400000 },
  ];
}

export function loadPortalProjects(): PortalProject[] {
  return [
    { id: "pr-1", name: "Marina Residences", progress: 54, status: "Active" },
    { id: "pr-2", name: "Cedar Club", progress: 91, status: "Near complete" },
  ];
}

export function loadPortalTickets(): PortalTicket[] {
  return [
    { id: "ct-1", subject: "Delivery window confirmation", status: "Open" },
    { id: "ct-2", subject: "Finish sample request", status: "Resolved" },
  ];
}

export function loadMetrics(): MetricSnapshot[] {
  return MONITOR_METRICS_SEED.map((m) => ({ ...m }));
}

export function touchSync(): number {
  const t = now();
  localStorage.setItem(K.sync, String(t));
  return t;
}

export function lastSyncAt(): number | null {
  const raw = localStorage.getItem(K.sync);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function usageOverview() {
  const sub = loadSubscription();
  const plan = PLANS.find((p) => p.id === sub.planId);
  return { sub, plan, tenants: loadTenants(), licenses: loadLicenses(sub) };
}
