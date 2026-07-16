/**
 * Operational diagnostics — runtime info without exposing secrets.
 */

import { createHash } from "node:crypto";
import type { ApiHost } from "@afh/api";
import type { MessagingRuntime } from "@afh/messaging-broker";
import type { SqlPersistenceFoundation } from "@afh/persistence-sql";
import type { ProductionRuntimeConfig } from "../config/runtime-config.js";
import { summarizeBrokerHardening } from "./broker-hardening.js";

export type RuntimeDiagnostics = {
  readonly serviceName: string;
  readonly profile: string;
  readonly packageVersion: string;
  readonly apiVersionHint: string;
  readonly persistenceAdapter: string;
  readonly messagingAdapter: string;
  readonly databasePathFingerprint: string;
  readonly brokerEndpoint: string;
  readonly configFingerprint: string;
  readonly dependencyStatus: {
    readonly sqlMigrationCompatible: boolean;
    readonly brokerHealthy: boolean | null;
    readonly healthOverall: string | null;
  };
  readonly brokerHardening: ReturnType<typeof summarizeBrokerHardening>;
  readonly startup: {
    readonly validateOnStartup: boolean;
    readonly requireSecrets: boolean;
    readonly busyTimeoutMs: number;
    readonly shutdownTimeoutMs: number;
  };
};

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/**
 * Builds a diagnostics snapshot. Never includes secret values.
 */
export async function collectRuntimeDiagnostics(options: {
  readonly config: ProductionRuntimeConfig;
  readonly sql: SqlPersistenceFoundation;
  readonly messaging: MessagingRuntime;
  readonly host: ApiHost;
  readonly packageVersion: string;
}): Promise<RuntimeDiagnostics> {
  const broker = await options.messaging.broker.healthCheck();
  const health = await options.host.composition.infrastructure.health.checkAll();

  const fingerprintSource = JSON.stringify({
    profile: options.config.profile,
    serviceName: options.config.serviceName,
    host: options.config.host,
    port: options.config.port,
    logLevel: options.config.logLevel,
    outboxBatchSize: options.config.outboxBatchSize,
    outboxMaxAttempts: options.config.outboxMaxAttempts,
    busyTimeoutMs: options.config.busyTimeoutMs,
    messagingConsumerConcurrency: options.config.messagingConsumerConcurrency,
    messagingMaxAttempts: options.config.messagingMaxAttempts,
    messagingPoisonThreshold: options.config.messagingPoisonThreshold,
    eventBusEnabled: options.config.eventBusEnabled,
    validateOnStartup: options.config.validateOnStartup,
  });

  return {
    serviceName: options.config.serviceName,
    profile: options.config.profile,
    packageVersion: options.packageVersion,
    apiVersionHint: "v1",
    persistenceAdapter: "sql",
    messagingAdapter: "broker",
    databasePathFingerprint: fingerprint(options.config.databasePath),
    brokerEndpoint: options.config.brokerEndpoint,
    configFingerprint: fingerprint(fingerprintSource),
    dependencyStatus: {
      sqlMigrationCompatible: options.sql.migrationCompatible,
      brokerHealthy: broker.ok ? broker.value.healthy : false,
      healthOverall: health.ok ? health.value.status : "error",
    },
    brokerHardening: summarizeBrokerHardening(options.messaging),
    startup: {
      validateOnStartup: options.config.validateOnStartup,
      requireSecrets: options.config.requireSecrets,
      busyTimeoutMs: options.config.busyTimeoutMs,
      shutdownTimeoutMs: options.config.shutdownTimeoutMs,
    },
  };
}
