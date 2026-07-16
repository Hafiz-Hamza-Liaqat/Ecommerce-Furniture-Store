/** Provider-agnostic integration types — no vendor lock-in, no domain logic. */

export type IntegrationCategory =
  | "email"
  | "sms"
  | "whatsapp"
  | "push"
  | "storage"
  | "maps"
  | "calendar"
  | "payments"
  | "shipping"
  | "sso"
  | "ai"
  | "webhooks"
  | "other";

export type IntegrationStatus = "connected" | "disconnected" | "degraded" | "error" | "configuring";

export type IntegrationProviderId = string;

export type IntegrationCapability =
  | "send"
  | "receive"
  | "templates"
  | "queue"
  | "delivery-status"
  | "attachments"
  | "tracking"
  | "retry"
  | "otp"
  | "broadcast"
  | "upload"
  | "download"
  | "signed-url"
  | "versioning"
  | "geocode"
  | "routing"
  | "appointments"
  | "invoice-pay"
  | "refund-hook"
  | "shipment"
  | "labels"
  | "sso"
  | "webhook";

export type IntegrationProviderDef = {
  readonly id: IntegrationProviderId;
  readonly category: IntegrationCategory;
  readonly label: string;
  readonly vendor: string;
  readonly description: string;
  readonly capabilities: readonly IntegrationCapability[];
  readonly docsUrl: string;
  readonly healthProbe?: string;
};

export type ConnectedIntegration = {
  readonly id: string;
  readonly providerId: IntegrationProviderId;
  readonly label: string;
  status: IntegrationStatus;
  readonly configuredAt: number;
  lastSyncAt?: number;
  lastError?: string;
  readonly settings: Record<string, string>;
  readonly enabled: boolean;
};

export type WebhookEndpoint = {
  readonly id: string;
  readonly name: string;
  readonly direction: "incoming" | "outgoing";
  readonly url: string;
  readonly secretHint: string;
  readonly events: readonly string[];
  readonly enabled: boolean;
  readonly createdAt: number;
};

export type WebhookEvent = {
  readonly id: string;
  readonly endpointId: string;
  readonly direction: "incoming" | "outgoing";
  readonly event: string;
  readonly status: "delivered" | "failed" | "retrying" | "pending";
  readonly at: number;
  readonly latencyMs: number;
  readonly signatureValid?: boolean;
};

export type ApiKeyRecord = {
  readonly id: string;
  readonly name: string;
  readonly prefix: string;
  readonly scopes: readonly string[];
  readonly createdAt: number;
  readonly expiresAt: number | null;
  readonly lastUsedAt: number | null;
  readonly rotatedFrom?: string;
  readonly revoked: boolean;
  readonly usageCount: number;
};

export type SyncJob = {
  readonly id: string;
  readonly name: string;
  readonly providerId: string;
  readonly status: "idle" | "running" | "failed" | "success";
  readonly lastSyncAt: number | null;
  readonly nextHint: string;
  readonly failureReason?: string;
};

export type IntegrationHealthRow = {
  readonly providerId: string;
  readonly label: string;
  readonly status: IntegrationStatus;
  readonly availability: number;
  readonly lastSyncAt: number | null;
  readonly failures: number;
  readonly retries: number;
  readonly latencyMs: number;
  readonly usage: number;
};

export type IntegrationAuditEvent = {
  readonly id: string;
  readonly at: number;
  readonly kind: "connect" | "disconnect" | "configure" | "webhook" | "api-key" | "sync" | "rotate" | "health";
  readonly summary: string;
  readonly actor: string;
};
