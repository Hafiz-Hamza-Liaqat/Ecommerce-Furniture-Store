/**
 * Provider abstractions for connected services.
 * Presentation adapters only — transport/credentials remain on Application + Identity contracts.
 */

import type { IntegrationCapability, IntegrationCategory, IntegrationProviderDef } from "./types";
import { INTEGRATION_PROVIDERS, getProviderDef } from "./catalog";

export type ProviderHealth = {
  readonly ok: boolean;
  readonly latencyMs: number;
  readonly message: string;
};

export type IntegrationAdapter = {
  readonly def: IntegrationProviderDef;
  testConnection(settings: Record<string, string>): Promise<ProviderHealth>;
  describeCapabilities(): readonly IntegrationCapability[];
};

function makeAdapter(def: IntegrationProviderDef): IntegrationAdapter {
  return {
    def,
    async testConnection(settings) {
      // Simulated probe — real probes use existing /health + provider credentials server-side.
      await new Promise((r) => window.setTimeout(r, 120 + Math.random() * 180));
      const hasCred = Object.keys(settings).length > 0;
      return {
        ok: hasCred,
        latencyMs: 80 + Math.floor(Math.random() * 120),
        message: hasCred
          ? `${def.label} probe OK (presentation)`
          : `${def.label} needs configuration`,
      };
    },
    describeCapabilities() {
      return def.capabilities;
    },
  };
}

const ADAPTERS: readonly IntegrationAdapter[] = INTEGRATION_PROVIDERS.map(makeAdapter);

export function listAdapters(category?: IntegrationCategory): IntegrationAdapter[] {
  return ADAPTERS.filter((a) => (category ? a.def.category === category : true));
}

export function getAdapter(providerId: string): IntegrationAdapter | undefined {
  return ADAPTERS.find((a) => a.def.id === providerId);
}

export function resolveProvider(providerId: string): IntegrationProviderDef | undefined {
  return getProviderDef(providerId);
}

/** Email channel adapter surface (SMTP / M365 / Gmail / SendGrid / Mailgun / SES). */
export type EmailSendRequest = {
  readonly to: string;
  readonly subject: string;
  readonly templateId?: string;
  readonly attachments?: readonly string[];
};

export async function emailSendPreview(
  providerId: string,
  req: EmailSendRequest,
): Promise<{ queued: boolean; providerRef: string }> {
  const adapter = getAdapter(providerId);
  if (!adapter || adapter.def.category !== "email") {
    return { queued: false, providerRef: "invalid-provider" };
  }
  await adapter.testConnection({ to: req.to });
  return { queued: true, providerRef: `${providerId}:${Date.now()}` };
}

/** SMS / WhatsApp / Push preview helpers — no vendor SDK. */
export async function messageSendPreview(
  providerId: string,
  to: string,
  body: string,
): Promise<{ queued: boolean; providerRef: string }> {
  const adapter = getAdapter(providerId);
  if (!adapter) return { queued: false, providerRef: "invalid-provider" };
  await adapter.testConnection({ to, body: body.slice(0, 40) });
  return { queued: true, providerRef: `${providerId}:${Date.now()}` };
}
