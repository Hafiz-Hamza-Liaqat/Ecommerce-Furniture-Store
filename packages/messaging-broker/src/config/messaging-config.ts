/**
 * Typed messaging configuration — no hardcoded production endpoints.
 */

import type { ConfigurationSource } from "@afh/shared-kernel";

export type MessagingAckMode = "auto" | "manual";

export type MessagingConfig = {
  readonly brokerDatabasePath: string;
  readonly brokerEndpoint: string;
  readonly maxAttempts: number;
  readonly backoffMs: readonly number[];
  readonly consumerConcurrency: number;
  readonly batchSize: number;
  readonly acknowledgement: MessagingAckMode;
  readonly claimLeaseMs: number;
  readonly poisonThreshold: number;
};

export const DEFAULT_MESSAGING_CONFIG: MessagingConfig = {
  brokerDatabasePath: ":memory:",
  brokerEndpoint: "local://durable-broker",
  maxAttempts: 8,
  backoffMs: [5_000, 30_000, 120_000, 600_000, 3_600_000],
  consumerConcurrency: 4,
  batchSize: 50,
  acknowledgement: "manual",
  claimLeaseMs: 60_000,
  poisonThreshold: 1,
};

function readNumber(
  source: ConfigurationSource,
  key: string,
  fallback: number,
): number {
  const value = source.get(key);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(
  source: ConfigurationSource,
  key: string,
  fallback: string,
): string {
  const value = source.get(key);
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function bindMessagingConfig(
  source: ConfigurationSource,
  overrides: Partial<MessagingConfig> = {},
): MessagingConfig {
  const base = DEFAULT_MESSAGING_CONFIG;
  return {
    brokerDatabasePath: readString(
      source,
      "messaging.brokerDatabasePath",
      overrides.brokerDatabasePath ?? base.brokerDatabasePath,
    ),
    brokerEndpoint: readString(
      source,
      "messaging.brokerEndpoint",
      overrides.brokerEndpoint ?? base.brokerEndpoint,
    ),
    maxAttempts: readNumber(
      source,
      "messaging.maxAttempts",
      overrides.maxAttempts ?? base.maxAttempts,
    ),
    backoffMs: overrides.backoffMs ?? base.backoffMs,
    consumerConcurrency: readNumber(
      source,
      "messaging.consumerConcurrency",
      overrides.consumerConcurrency ?? base.consumerConcurrency,
    ),
    batchSize: readNumber(
      source,
      "messaging.batchSize",
      overrides.batchSize ?? base.batchSize,
    ),
    acknowledgement:
      (source.get("messaging.acknowledgement") as MessagingAckMode | undefined) ??
      overrides.acknowledgement ??
      base.acknowledgement,
    claimLeaseMs: readNumber(
      source,
      "messaging.claimLeaseMs",
      overrides.claimLeaseMs ?? base.claimLeaseMs,
    ),
    poisonThreshold: readNumber(
      source,
      "messaging.poisonThreshold",
      overrides.poisonThreshold ?? base.poisonThreshold,
    ),
  };
}
