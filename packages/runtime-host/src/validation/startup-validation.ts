/**
 * Startup / release validation — fail fast when production prerequisites missing.
 */

import type { ApiHost } from "@afh/api";
import type { MessagingRuntime } from "@afh/messaging-broker";
import type { SqlPersistenceFoundation } from "@afh/persistence-sql";
import {
  InfrastructureError,
  fail,
  ok,
  type Logger,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { ProductionRuntimeConfig } from "../config/runtime-config.js";

export type ReleaseValidationInput = {
  readonly config: ProductionRuntimeConfig;
  readonly sql: SqlPersistenceFoundation;
  readonly messaging: MessagingRuntime;
  readonly host: ApiHost;
  readonly packageVersion: string;
};

export async function validateRelease(
  input: ReleaseValidationInput,
): Promise<Result<{ checked: string[] }, PlatformError>> {
  const checked: string[] = [];

  if (!input.config.serviceName.trim()) {
    return fail(
      new InfrastructureError("serviceName invalid", {
        code: "release_config_invalid",
      }),
    );
  }
  checked.push("configuration");

  if (!input.sql.migrationCompatible) {
    return fail(
      new InfrastructureError("SQL migrations incompatible", {
        code: "release_migration_incompatible",
      }),
    );
  }
  checked.push("database_compatibility");

  const broker = await input.messaging.broker.healthCheck();
  if (!broker.ok || !broker.value.healthy) {
    return fail(
      new InfrastructureError("Broker incompatible / unhealthy", {
        code: "release_broker_incompatible",
        details: { detail: broker.ok ? broker.value.detail : broker.error.message },
      }),
    );
  }
  checked.push("broker_compatibility");

  if (!input.packageVersion.trim()) {
    return fail(
      new InfrastructureError("package version missing", {
        code: "release_version_invalid",
      }),
    );
  }
  checked.push("version_compatibility");

  const health = await input.host.composition.infrastructure.health.checkAll();
  if (!health.ok) {
    return health;
  }
  if (health.value.status === "down") {
    return fail(
      new InfrastructureError("Health registry reports down", {
        code: "release_health_down",
        details: { checks: health.value.checks },
      }),
    );
  }
  checked.push("health_registry");

  return ok({ checked });
}

export async function validateStartup(
  input: ReleaseValidationInput,
  logger: Logger,
): Promise<Result<void, PlatformError>> {
  if (!input.config.validateOnStartup) {
    logger.warn("Startup validation skipped by configuration");
    return ok(undefined);
  }

  const release = await validateRelease(input);
  if (!release.ok) {
    logger.error("Startup validation failed", {
      code: release.error.code,
      message: release.error.message,
    });
    return release;
  }

  logger.info("Startup validation passed", {
    checked: release.value.checked.join(","),
    profile: input.config.profile,
  });
  return ok(undefined);
}
