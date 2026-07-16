import type { HealthProbeResult } from "./types";

/** Thin adapters over existing health APIs and payment provider abstractions. */

export async function probeHealthReady(api: {
  healthReady: () => Promise<unknown>;
}): Promise<HealthProbeResult> {
  const started = performance.now();
  try {
    const res = await api.healthReady();
    const latencyMs = Math.round(performance.now() - started);
    const ok =
      typeof res === "object" &&
      res !== null &&
      ("status" in res ? String((res as { status?: string }).status).toLowerCase() !== "error" : true);
    return {
      ok,
      label: "Ready",
      detail: ok ? "Runtime readiness probe returned" : "Ready probe reported error",
      latencyMs,
    };
  } catch (err) {
    return {
      ok: false,
      label: "Ready",
      detail: err instanceof Error ? err.message : "Ready probe unavailable",
      latencyMs: Math.round(performance.now() - started),
    };
  }
}

export async function probeHealthPath(
  baseUrl: string,
  path: "/health/live" | "/health/startup" | "/health/version",
  label: string,
): Promise<HealthProbeResult> {
  const started = performance.now();
  try {
    const res = await fetch(`${baseUrl}${path}`);
    const latencyMs = Math.round(performance.now() - started);
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      ok: res.ok,
      label,
      detail: res.ok
        ? JSON.stringify(body).slice(0, 120)
        : `HTTP ${res.status}`,
      latencyMs,
    };
  } catch (err) {
    return {
      ok: false,
      label,
      detail: err instanceof Error ? err.message : "Unreachable",
      latencyMs: Math.round(performance.now() - started),
    };
  }
}

export type BillingPortalAction = "pay" | "refund-hook" | "verify-webhook";

/** Presentation stub — reuses payment provider abstraction language from integrations. */
export function billingProviderAction(
  provider: "stripe" | "paypal",
  action: BillingPortalAction,
): { readonly queued: boolean; readonly ref: string } {
  return {
    queued: true,
    ref: `${provider}:${action}:${Date.now().toString(36)}`,
  };
}

export function secretsStatusRows(): readonly { readonly name: string; readonly status: string }[] {
  return [
    { name: "Database credentials", status: "Present (server)" },
    { name: "Object storage keys", status: "Present (server)" },
    { name: "Payment webhooks", status: "Configured via integrations" },
    { name: "SSO client secrets", status: "Rotated · Identity" },
    { name: "AI provider keys", status: "Optional · Settings/AI" },
  ];
}

export function queueStatusRows(): readonly { readonly name: string; readonly depth: number; readonly status: string }[] {
  return [
    { name: "Outbound email", depth: 12, status: "ok" },
    { name: "Webhook delivery", depth: 4, status: "ok" },
    { name: "Report schedules", depth: 7, status: "ok" },
    { name: "Sync jobs", depth: 19, status: "warn" },
  ];
}
