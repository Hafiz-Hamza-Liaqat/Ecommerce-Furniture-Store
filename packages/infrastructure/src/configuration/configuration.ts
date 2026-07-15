/**
 * Infrastructure configuration — typed binding & secret resolution.
 * No business settings.
 */

import {
  InfrastructureError,
  fail,
  ok,
  type ConfigValue,
  type ConfigurationSource,
  type PlatformError,
  type Result,
  type SecretProvider,
  type SecretRef,
  type TypedConfiguration,
} from "@afh/shared-kernel";

export type InfrastructureConfig = {
  readonly serviceName: string;
  readonly environment: string;
  readonly logLevel: "debug" | "info" | "warn" | "error" | "fatal";
  readonly outboxBatchSize: number;
  readonly outboxMaxAttempts: number;
  readonly eventBusEnabled: boolean;
};

export const DEFAULT_INFRASTRUCTURE_CONFIG: InfrastructureConfig = {
  serviceName: "afh-runtime",
  environment: "development",
  logLevel: "info",
  outboxBatchSize: 50,
  outboxMaxAttempts: 8,
  eventBusEnabled: true,
};

export class MapConfigurationSource implements ConfigurationSource {
  readonly #values: Map<string, ConfigValue>;

  constructor(values: Readonly<Record<string, ConfigValue>> = {}) {
    this.#values = new Map(Object.entries(values));
  }

  get(key: string): ConfigValue | undefined {
    return this.#values.get(key);
  }

  has(key: string): boolean {
    return this.#values.has(key);
  }

  set(key: string, value: ConfigValue): void {
    this.#values.set(key, value);
  }
}

export class MapSecretProvider implements SecretProvider {
  readonly #secrets: Map<string, string>;

  constructor(secrets: Readonly<Record<string, string>> = {}) {
    this.#secrets = new Map(Object.entries(secrets));
  }

  getSecret(ref: SecretRef): Result<string, PlatformError> {
    const value = this.#secrets.get(ref.name);
    if (value == null) {
      return fail(
        new InfrastructureError(`Secret not found: ${ref.name}`, {
          code: "secret_not_found",
          details: { name: ref.name },
        }),
      );
    }
    return ok(value);
  }
}

export class StaticTypedConfiguration<T> implements TypedConfiguration<T> {
  readonly #value: T;

  constructor(value: T) {
    this.#value = value;
  }

  load(): Result<T, PlatformError> {
    return ok(this.#value);
  }
}

export function bindInfrastructureConfig(
  source: ConfigurationSource,
  defaults: InfrastructureConfig = DEFAULT_INFRASTRUCTURE_CONFIG,
): Result<InfrastructureConfig, PlatformError> {
  const serviceName =
    (source.get("serviceName") as string | undefined) ?? defaults.serviceName;
  const environment =
    (source.get("environment") as string | undefined) ?? defaults.environment;
  const logLevel =
    (source.get("logLevel") as InfrastructureConfig["logLevel"] | undefined) ??
    defaults.logLevel;
  const outboxBatchSize =
    (source.get("outboxBatchSize") as number | undefined) ??
    defaults.outboxBatchSize;
  const outboxMaxAttempts =
    (source.get("outboxMaxAttempts") as number | undefined) ??
    defaults.outboxMaxAttempts;
  const eventBusEnabled =
    (source.get("eventBusEnabled") as boolean | undefined) ??
    defaults.eventBusEnabled;

  if (!serviceName.trim()) {
    return fail(
      new InfrastructureError("serviceName is required", {
        code: "config_invalid",
      }),
    );
  }

  return ok({
    serviceName,
    environment,
    logLevel,
    outboxBatchSize,
    outboxMaxAttempts,
    eventBusEnabled,
  });
}
