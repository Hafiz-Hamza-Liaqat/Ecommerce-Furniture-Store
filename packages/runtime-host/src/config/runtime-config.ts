/**
 * Environment profiles — no environment-specific business logic.
 * Phase 9B adds resilience / messaging / SQL operational knobs (defaults preserve 9A behavior).
 */

export type RuntimeProfile =
  | "development"
  | "testing"
  | "staging"
  | "production";

export type ProductionRuntimeConfig = {
  readonly profile: RuntimeProfile;
  readonly serviceName: string;
  readonly host: string;
  readonly port: number;
  readonly corsOrigin: string;
  readonly logLevel: "debug" | "info" | "warn" | "error" | "fatal";
  readonly databasePath: string;
  readonly brokerDatabasePath: string;
  readonly brokerEndpoint: string;
  readonly outboxBatchSize: number;
  readonly outboxMaxAttempts: number;
  readonly eventBusEnabled: boolean;
  readonly requireSecrets: boolean;
  readonly validateOnStartup: boolean;
  /** SQL busy timeout (ms). */
  readonly busyTimeoutMs: number;
  /** Advisory transaction timeout budget for ops tooling (ms). */
  readonly transactionTimeoutMs: number;
  readonly startupRetryAttempts: number;
  readonly startupRetryBackoffMs: readonly number[];
  readonly shutdownTimeoutMs: number;
  readonly messagingMaxAttempts: number;
  readonly messagingBackoffMs: readonly number[];
  readonly messagingConsumerConcurrency: number;
  readonly messagingBatchSize: number;
  readonly messagingPoisonThreshold: number;
  readonly messagingClaimLeaseMs: number;
  readonly integrityCheckOnStartup: boolean;
};

type ProfileDefaults = Omit<ProductionRuntimeConfig, "profile">;

const SHARED_HARDENING: Pick<
  ProfileDefaults,
  | "busyTimeoutMs"
  | "transactionTimeoutMs"
  | "startupRetryAttempts"
  | "startupRetryBackoffMs"
  | "shutdownTimeoutMs"
  | "messagingMaxAttempts"
  | "messagingBackoffMs"
  | "messagingConsumerConcurrency"
  | "messagingBatchSize"
  | "messagingPoisonThreshold"
  | "messagingClaimLeaseMs"
  | "integrityCheckOnStartup"
> = {
  busyTimeoutMs: 5_000,
  transactionTimeoutMs: 30_000,
  startupRetryAttempts: 3,
  startupRetryBackoffMs: [250, 750, 1_500],
  shutdownTimeoutMs: 30_000,
  messagingMaxAttempts: 8,
  messagingBackoffMs: [5_000, 30_000, 120_000, 600_000, 3_600_000],
  messagingConsumerConcurrency: 4,
  messagingBatchSize: 50,
  messagingPoisonThreshold: 1,
  messagingClaimLeaseMs: 60_000,
  integrityCheckOnStartup: true,
};

const PROFILE_DEFAULTS: Record<RuntimeProfile, ProfileDefaults> = {
  development: {
    serviceName: "afh-api",
    host: "127.0.0.1",
    port: 8080,
    corsOrigin: "*",
    logLevel: "debug",
    databasePath: "./data/afh.dev.sqlite",
    brokerDatabasePath: "./data/broker.dev.sqlite",
    brokerEndpoint: "local://durable-broker-dev",
    outboxBatchSize: 50,
    outboxMaxAttempts: 8,
    eventBusEnabled: true,
    requireSecrets: false,
    validateOnStartup: true,
    ...SHARED_HARDENING,
    integrityCheckOnStartup: false,
  },
  testing: {
    serviceName: "afh-api",
    host: "127.0.0.1",
    port: 8081,
    corsOrigin: "*",
    logLevel: "warn",
    databasePath: ":memory:",
    brokerDatabasePath: ":memory:",
    brokerEndpoint: "local://durable-broker-test",
    outboxBatchSize: 20,
    outboxMaxAttempts: 3,
    eventBusEnabled: true,
    requireSecrets: true,
    validateOnStartup: true,
    ...SHARED_HARDENING,
    messagingMaxAttempts: 3,
    messagingBatchSize: 20,
    messagingConsumerConcurrency: 2,
    shutdownTimeoutMs: 5_000,
  },
  staging: {
    serviceName: "afh-api",
    host: "0.0.0.0",
    port: 8080,
    corsOrigin: "*",
    logLevel: "info",
    databasePath: "./data/afh.staging.sqlite",
    brokerDatabasePath: "./data/broker.staging.sqlite",
    brokerEndpoint: "local://durable-broker-staging",
    outboxBatchSize: 50,
    outboxMaxAttempts: 8,
    eventBusEnabled: true,
    requireSecrets: true,
    validateOnStartup: true,
    ...SHARED_HARDENING,
  },
  production: {
    serviceName: "afh-api",
    host: "0.0.0.0",
    port: 8080,
    corsOrigin: "*",
    logLevel: "info",
    databasePath: "./data/afh.sqlite",
    brokerDatabasePath: "./data/broker.sqlite",
    brokerEndpoint: "local://durable-broker",
    outboxBatchSize: 50,
    outboxMaxAttempts: 8,
    eventBusEnabled: true,
    requireSecrets: true,
    validateOnStartup: true,
    ...SHARED_HARDENING,
  },
};

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value != null && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(name: string, fallback: number): number {
  const raw = readEnv(name);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = readEnv(name)?.toLowerCase();
  if (raw == null) return fallback;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return fallback;
}

function readNumberList(name: string, fallback: readonly number[]): readonly number[] {
  const raw = readEnv(name);
  if (!raw) return fallback;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n) || n < 0)) {
    return fallback;
  }
  return parts;
}

export function resolveRuntimeProfile(
  explicit?: string | null,
): RuntimeProfile {
  const raw = (explicit ?? readEnv("AFH_PROFILE") ?? readEnv("NODE_ENV") ?? "development")
    .toLowerCase();
  if (raw === "production" || raw === "prod") return "production";
  if (raw === "staging" || raw === "stage") return "staging";
  if (raw === "testing" || raw === "test") return "testing";
  return "development";
}

/**
 * Loads typed production runtime configuration from environment + profile defaults.
 * Business settings are out of scope.
 */
export function loadProductionRuntimeConfig(
  overrides: Partial<ProductionRuntimeConfig> = {},
): ProductionRuntimeConfig {
  const profile = overrides.profile ?? resolveRuntimeProfile();
  const base = PROFILE_DEFAULTS[profile];
  const logLevelRaw = readEnv("AFH_LOG_LEVEL") ?? base.logLevel;
  const logLevel = (
    ["debug", "info", "warn", "error", "fatal"] as const
  ).includes(logLevelRaw as ProductionRuntimeConfig["logLevel"])
    ? (logLevelRaw as ProductionRuntimeConfig["logLevel"])
    : base.logLevel;

  return {
    profile,
    serviceName: overrides.serviceName ?? readEnv("AFH_SERVICE_NAME") ?? base.serviceName,
    host: overrides.host ?? readEnv("AFH_HOST") ?? base.host,
    port: overrides.port ?? readNumber("AFH_PORT", base.port),
    corsOrigin: overrides.corsOrigin ?? readEnv("AFH_CORS_ORIGIN") ?? base.corsOrigin,
    logLevel: overrides.logLevel ?? logLevel,
    databasePath:
      overrides.databasePath ?? readEnv("AFH_DATABASE_PATH") ?? base.databasePath,
    brokerDatabasePath:
      overrides.brokerDatabasePath ??
      readEnv("AFH_BROKER_DATABASE_PATH") ??
      base.brokerDatabasePath,
    brokerEndpoint:
      overrides.brokerEndpoint ??
      readEnv("AFH_BROKER_ENDPOINT") ??
      base.brokerEndpoint,
    outboxBatchSize:
      overrides.outboxBatchSize ??
      readNumber("AFH_OUTBOX_BATCH_SIZE", base.outboxBatchSize),
    outboxMaxAttempts:
      overrides.outboxMaxAttempts ??
      readNumber("AFH_OUTBOX_MAX_ATTEMPTS", base.outboxMaxAttempts),
    eventBusEnabled:
      overrides.eventBusEnabled ??
      readBool("AFH_EVENT_BUS_ENABLED", base.eventBusEnabled),
    requireSecrets:
      overrides.requireSecrets ??
      readBool("AFH_REQUIRE_SECRETS", base.requireSecrets),
    validateOnStartup:
      overrides.validateOnStartup ??
      readBool("AFH_VALIDATE_ON_STARTUP", base.validateOnStartup),
    busyTimeoutMs:
      overrides.busyTimeoutMs ??
      readNumber("AFH_SQL_BUSY_TIMEOUT_MS", base.busyTimeoutMs),
    transactionTimeoutMs:
      overrides.transactionTimeoutMs ??
      readNumber("AFH_SQL_TRANSACTION_TIMEOUT_MS", base.transactionTimeoutMs),
    startupRetryAttempts:
      overrides.startupRetryAttempts ??
      readNumber("AFH_STARTUP_RETRY_ATTEMPTS", base.startupRetryAttempts),
    startupRetryBackoffMs:
      overrides.startupRetryBackoffMs ??
      readNumberList("AFH_STARTUP_RETRY_BACKOFF_MS", base.startupRetryBackoffMs),
    shutdownTimeoutMs:
      overrides.shutdownTimeoutMs ??
      readNumber("AFH_SHUTDOWN_TIMEOUT_MS", base.shutdownTimeoutMs),
    messagingMaxAttempts:
      overrides.messagingMaxAttempts ??
      readNumber("AFH_MESSAGING_MAX_ATTEMPTS", base.messagingMaxAttempts),
    messagingBackoffMs:
      overrides.messagingBackoffMs ??
      readNumberList("AFH_MESSAGING_BACKOFF_MS", base.messagingBackoffMs),
    messagingConsumerConcurrency:
      overrides.messagingConsumerConcurrency ??
      readNumber(
        "AFH_MESSAGING_CONSUMER_CONCURRENCY",
        base.messagingConsumerConcurrency,
      ),
    messagingBatchSize:
      overrides.messagingBatchSize ??
      readNumber("AFH_MESSAGING_BATCH_SIZE", base.messagingBatchSize),
    messagingPoisonThreshold:
      overrides.messagingPoisonThreshold ??
      readNumber("AFH_MESSAGING_POISON_THRESHOLD", base.messagingPoisonThreshold),
    messagingClaimLeaseMs:
      overrides.messagingClaimLeaseMs ??
      readNumber("AFH_MESSAGING_CLAIM_LEASE_MS", base.messagingClaimLeaseMs),
    integrityCheckOnStartup:
      overrides.integrityCheckOnStartup ??
      readBool("AFH_SQL_INTEGRITY_ON_STARTUP", base.integrityCheckOnStartup),
  };
}

export function assertProductionRuntimeConfig(
  config: ProductionRuntimeConfig,
): void {
  if (!config.serviceName.trim()) {
    throw new Error("AFH_SERVICE_NAME / serviceName is required");
  }
  if (!Number.isFinite(config.port) || config.port <= 0) {
    throw new Error("AFH_PORT / port must be a positive number");
  }
  if (!config.databasePath.trim()) {
    throw new Error("AFH_DATABASE_PATH is required");
  }
  if (!config.brokerDatabasePath.trim()) {
    throw new Error("AFH_BROKER_DATABASE_PATH is required");
  }
  if (config.outboxBatchSize <= 0 || config.outboxMaxAttempts <= 0) {
    throw new Error("Outbox batch size and max attempts must be positive");
  }
  if (config.busyTimeoutMs < 0 || config.transactionTimeoutMs <= 0) {
    throw new Error("SQL timeout configuration invalid");
  }
  if (config.startupRetryAttempts <= 0 || config.shutdownTimeoutMs <= 0) {
    throw new Error("Resilience timeout/retry configuration invalid");
  }
  if (
    config.messagingMaxAttempts <= 0 ||
    config.messagingConsumerConcurrency <= 0 ||
    config.messagingBatchSize <= 0 ||
    config.messagingPoisonThreshold <= 0 ||
    config.messagingClaimLeaseMs <= 0
  ) {
    throw new Error("Messaging hardening configuration invalid");
  }
}
