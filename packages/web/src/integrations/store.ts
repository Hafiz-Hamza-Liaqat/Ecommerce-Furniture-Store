import type {
  ApiKeyRecord,
  ConnectedIntegration,
  IntegrationAuditEvent,
  IntegrationHealthRow,
  SyncJob,
  WebhookEndpoint,
  WebhookEvent,
} from "./types";
import { getProviderDef, INTEGRATION_PROVIDERS } from "./catalog";

const CONN_KEY = "afh.web.integrations.connected";
const WH_KEY = "afh.web.integrations.webhooks";
const WH_EVENTS_KEY = "afh.web.integrations.webhook.events";
const KEYS_KEY = "afh.web.integrations.api.keys";
const SYNC_KEY = "afh.web.integrations.sync";
const AUDIT_KEY = "afh.web.integrations.audit";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function pushAudit(kind: IntegrationAuditEvent["kind"], summary: string): void {
  const next: IntegrationAuditEvent[] = [
    {
      id: `ia-${Date.now()}`,
      at: Date.now(),
      kind,
      summary,
      actor: "workspace-user",
    },
    ...loadAudit(),
  ].slice(0, 80);
  writeJson(AUDIT_KEY, next);
}

export function loadAudit(): IntegrationAuditEvent[] {
  return readJson(AUDIT_KEY, [
    {
      id: "ia-seed-1",
      at: Date.now() - 86400000,
      kind: "connect",
      summary: "Connected SendGrid (presentation)",
      actor: "workspace-user",
    },
    {
      id: "ia-seed-2",
      at: Date.now() - 43200000,
      kind: "webhook",
      summary: "Outgoing webhook order.created delivered",
      actor: "system",
    },
  ]);
}

export function defaultConnections(): ConnectedIntegration[] {
  return [
    {
      id: "c-sendgrid",
      providerId: "email-sendgrid",
      label: "SendGrid production",
      status: "connected",
      configuredAt: Date.now() - 7 * 86400000,
      lastSyncAt: Date.now() - 3600000,
      settings: { from: "noreply@afh.local", region: "eu" },
      enabled: true,
    },
    {
      id: "c-s3",
      providerId: "storage-s3",
      label: "DAM media bucket",
      status: "connected",
      configuredAt: Date.now() - 14 * 86400000,
      lastSyncAt: Date.now() - 7200000,
      settings: { bucket: "afh-dam", region: "eu-central-1" },
      enabled: true,
    },
    {
      id: "c-stripe",
      providerId: "pay-stripe",
      label: "Stripe invoices",
      status: "degraded",
      configuredAt: Date.now() - 3 * 86400000,
      lastSyncAt: Date.now() - 1800000,
      lastError: "Webhook signature lag — presentation only",
      settings: { mode: "test" },
      enabled: true,
    },
  ];
}

export function loadConnections(): ConnectedIntegration[] {
  const stored = readJson<ConnectedIntegration[] | null>(CONN_KEY, null);
  return stored && stored.length ? stored : defaultConnections();
}

export function saveConnections(items: ConnectedIntegration[]): void {
  writeJson(CONN_KEY, items);
}

export function connectProvider(
  providerId: string,
  label: string,
  settings: Record<string, string>,
): ConnectedIntegration[] {
  const list = loadConnections();
  const next: ConnectedIntegration = {
    id: `c-${Date.now()}`,
    providerId,
    label,
    status: "connected",
    configuredAt: Date.now(),
    lastSyncAt: Date.now(),
    settings,
    enabled: true,
  };
  const merged = [next, ...list.filter((c) => c.providerId !== providerId)];
  saveConnections(merged);
  pushAudit("connect", `Connected ${label} (${providerId})`);
  return merged;
}

export function disconnectProvider(connectionId: string): ConnectedIntegration[] {
  const list = loadConnections().filter((c) => c.id !== connectionId);
  saveConnections(list);
  pushAudit("disconnect", `Disconnected ${connectionId}`);
  return list;
}

export function setConnectionEnabled(connectionId: string, enabled: boolean): ConnectedIntegration[] {
  const list = loadConnections().map((c) =>
    c.id === connectionId
      ? { ...c, enabled, status: enabled ? ("connected" as const) : ("disconnected" as const) }
      : c,
  );
  saveConnections(list);
  pushAudit("configure", `${enabled ? "Enabled" : "Disabled"} ${connectionId}`);
  return list;
}

export function defaultWebhooks(): WebhookEndpoint[] {
  return [
    {
      id: "wh-in-1",
      name: "Stripe events",
      direction: "incoming",
      url: "https://api.afh.local/webhooks/stripe",
      secretHint: "whsec_••••ab12",
      events: ["invoice.paid", "refund.created"],
      enabled: true,
      createdAt: Date.now() - 5 * 86400000,
    },
    {
      id: "wh-out-1",
      name: "Partner order feed",
      direction: "outgoing",
      url: "https://partners.example/hooks/afh",
      secretHint: "out_••••9f3c",
      events: ["order.created", "order.updated"],
      enabled: true,
      createdAt: Date.now() - 2 * 86400000,
    },
  ];
}

export function loadWebhooks(): WebhookEndpoint[] {
  return readJson(WH_KEY, defaultWebhooks());
}

export function saveWebhooks(items: WebhookEndpoint[]): void {
  writeJson(WH_KEY, items);
}

export function loadWebhookEvents(): WebhookEvent[] {
  return readJson(WH_EVENTS_KEY, [
    {
      id: "we-1",
      endpointId: "wh-out-1",
      direction: "outgoing",
      event: "order.created",
      status: "delivered",
      at: Date.now() - 120000,
      latencyMs: 180,
      signatureValid: true,
    },
    {
      id: "we-2",
      endpointId: "wh-in-1",
      direction: "incoming",
      event: "invoice.paid",
      status: "delivered",
      at: Date.now() - 600000,
      latencyMs: 42,
      signatureValid: true,
    },
    {
      id: "we-3",
      endpointId: "wh-out-1",
      direction: "outgoing",
      event: "order.updated",
      status: "retrying",
      at: Date.now() - 90000,
      latencyMs: 2400,
      signatureValid: true,
    },
  ]);
}

export function saveWebhookEvents(items: WebhookEvent[]): void {
  writeJson(WH_EVENTS_KEY, items);
}

export function defaultApiKeys(): ApiKeyRecord[] {
  return [
    {
      id: "key-1",
      name: "Partner read API",
      prefix: "afh_live_3f9a",
      scopes: ["read:catalog", "read:inventory"],
      createdAt: Date.now() - 20 * 86400000,
      expiresAt: Date.now() + 60 * 86400000,
      lastUsedAt: Date.now() - 3600000,
      revoked: false,
      usageCount: 1284,
    },
    {
      id: "key-2",
      name: "Webhook signer",
      prefix: "afh_live_7c21",
      scopes: ["write:webhooks"],
      createdAt: Date.now() - 10 * 86400000,
      expiresAt: null,
      lastUsedAt: Date.now() - 86400000,
      revoked: false,
      usageCount: 420,
    },
  ];
}

export function loadApiKeys(): ApiKeyRecord[] {
  return readJson(KEYS_KEY, defaultApiKeys());
}

export function saveApiKeys(items: ApiKeyRecord[]): void {
  writeJson(KEYS_KEY, items);
}

export function defaultSyncJobs(): SyncJob[] {
  return [
    {
      id: "sync-1",
      name: "Calendar → Service appointments",
      providerId: "cal-outlook",
      status: "success",
      lastSyncAt: Date.now() - 1800000,
      nextHint: "Manual or scheduler (UI only)",
    },
    {
      id: "sync-2",
      name: "S3 DAM metadata refresh",
      providerId: "storage-s3",
      status: "idle",
      lastSyncAt: Date.now() - 7200000,
      nextHint: "On demand",
    },
    {
      id: "sync-3",
      name: "Stripe settlement pull",
      providerId: "pay-stripe",
      status: "failed",
      lastSyncAt: Date.now() - 900000,
      nextHint: "Retry from Sync center",
      failureReason: "Presentation: webhook lag simulated",
    },
  ];
}

export function loadSyncJobs(): SyncJob[] {
  return readJson(SYNC_KEY, defaultSyncJobs());
}

export function saveSyncJobs(items: SyncJob[]): void {
  writeJson(SYNC_KEY, items);
}

export function buildHealthRows(connections: ConnectedIntegration[]): IntegrationHealthRow[] {
  const byProvider = new Map(connections.map((c) => [c.providerId, c]));
  return INTEGRATION_PROVIDERS.filter((p) => byProvider.has(p.id) || p.category === "email" || p.category === "storage")
    .slice(0, 12)
    .map((p) => {
      const c = byProvider.get(p.id);
      return {
        providerId: p.id,
        label: c?.label ?? p.label,
        status: c?.status ?? "disconnected",
        availability: c?.status === "connected" ? 99.2 : c?.status === "degraded" ? 92.1 : 0,
        lastSyncAt: c?.lastSyncAt ?? null,
        failures: c?.status === "degraded" || c?.status === "error" ? 3 : 0,
        retries: c?.status === "degraded" ? 2 : 0,
        latencyMs: c ? 120 + (p.id.length % 80) : 0,
        usage: c ? 40 + (p.id.length % 200) : 0,
      };
    });
}

export function providerLabel(providerId: string): string {
  return getProviderDef(providerId)?.label ?? providerId;
}
