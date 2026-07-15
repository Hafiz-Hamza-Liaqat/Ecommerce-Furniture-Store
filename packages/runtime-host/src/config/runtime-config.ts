/**
 * Environment profiles — no environment-specific business logic.
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
};

const PROFILE_DEFAULTS: Record<
  RuntimeProfile,
  Omit<ProductionRuntimeConfig, "profile">
> = {
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
}
