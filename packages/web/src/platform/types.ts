/** SaaS platform presentation types — no domain/runtime coupling. */

export type PlanId = "trial" | "free" | "professional" | "enterprise";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "renewing";

export type PlanDef = {
  readonly id: PlanId;
  readonly label: string;
  readonly monthlyPrice: string;
  readonly description: string;
  readonly seats: number | "unlimited";
  readonly aiCredits: number | "unlimited";
  readonly storageGb: number | "unlimited";
  readonly apiQuota: number | "unlimited";
  readonly modules: readonly string[];
};

export type TenantRecord = {
  readonly id: string;
  readonly name: string;
  readonly planId: PlanId;
  readonly status: "active" | "suspended" | "provisioning";
  readonly users: number;
  readonly storageUsedGb: number;
  readonly aiUsage: number;
  readonly apiUsage: number;
  readonly createdAt: number;
};

export type SubscriptionState = {
  readonly planId: PlanId;
  readonly status: SubscriptionStatus;
  readonly renewsAt: number | null;
  readonly seatsUsed: number;
  readonly seatsLimit: number | "unlimited";
  readonly aiUsed: number;
  readonly aiLimit: number | "unlimited";
  readonly storageUsedGb: number;
  readonly storageLimitGb: number | "unlimited";
  readonly apiUsed: number;
  readonly apiLimit: number | "unlimited";
};

export type InvoiceRecord = {
  readonly id: string;
  readonly number: string;
  readonly amount: string;
  readonly status: "paid" | "open" | "void" | "credit";
  readonly issuedAt: number;
  readonly dueAt: number | null;
  readonly taxInvoice: boolean;
};

export type PaymentMethod = {
  readonly id: string;
  readonly brand: string;
  readonly last4: string;
  readonly exp: string;
  readonly primary: boolean;
};

export type LicenseEntitlement = {
  readonly id: string;
  readonly label: string;
  readonly used: number;
  readonly limit: number | "unlimited";
  readonly unit: string;
};

export type BackupJob = {
  readonly id: string;
  readonly createdAt: number;
  readonly status: "success" | "running" | "failed" | "validated";
  readonly sizeHint: string;
  readonly retentionDays: number;
  readonly note?: string;
};

export type AuditEvent = {
  readonly id: string;
  readonly at: number;
  readonly category:
    | "login"
    | "security"
    | "ai"
    | "api"
    | "integration"
    | "billing"
    | "user"
    | "config";
  readonly actor: string;
  readonly summary: string;
};

export type ReleaseMeta = {
  readonly version: string;
  readonly build: string;
  readonly migrationVersion: string;
  readonly deployedAt: number;
  readonly environment: string;
  readonly notes: string;
};

export type DeploymentHistoryItem = {
  readonly id: string;
  readonly at: number;
  readonly version: string;
  readonly action: "deploy" | "rollback";
  readonly by: string;
  readonly result: "ok" | "failed";
};

export type SupportTicket = {
  readonly id: string;
  readonly subject: string;
  readonly status: "open" | "pending" | "resolved";
  readonly createdAt: number;
};

export type FeatureRequest = {
  readonly id: string;
  readonly title: string;
  readonly votes: number;
  readonly status: "triage" | "planned" | "shipped";
};

export type OnboardingDraft = {
  readonly step: number;
  readonly companyName: string;
  readonly brandColor: string;
  readonly logoName: string;
  readonly branchName: string;
  readonly warehouseName: string;
  readonly fiscalYearStart: string;
  readonly currency: string;
  readonly taxProfile: string;
  readonly inviteEmails: string;
  readonly rolePreset: string;
  readonly completed: readonly string[];
};

export type PortalOrder = {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly amount: string;
  readonly updatedAt: number;
};

export type PortalInvoice = {
  readonly id: string;
  readonly number: string;
  readonly amount: string;
  readonly status: string;
  readonly dueAt: number | null;
};

export type PortalProject = {
  readonly id: string;
  readonly name: string;
  readonly progress: number;
  readonly status: string;
};

export type PortalTicket = {
  readonly id: string;
  readonly subject: string;
  readonly status: string;
};

export type DemoState = {
  readonly active: boolean;
  readonly seededAt: number | null;
  readonly companyName: string;
};

export type MetricSnapshot = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly tone: "ok" | "warn" | "danger" | "neutral";
  readonly hint: string;
};

export type HealthProbeResult = {
  readonly ok: boolean;
  readonly label: string;
  readonly detail: string;
  readonly latencyMs: number;
};
