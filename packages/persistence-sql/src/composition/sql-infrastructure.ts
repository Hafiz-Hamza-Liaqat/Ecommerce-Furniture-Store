/**
 * Optional SQL infrastructure wiring helper.
 * Keeps @afh/infrastructure free of domain package dependencies.
 */

import {
  createInfrastructureRuntime,
  type CreateInfrastructureRuntimeOptions,
  type HealthProbe,
  type InfrastructureRuntime,
} from "@afh/infrastructure";
import { ok } from "@afh/shared-kernel";
import {
  createSqlPersistenceFoundation,
  type CreateSqlPersistenceFoundationOptions,
  type SqlPersistenceFoundation,
} from "./composition-root.js";

export type CreateSqlInfrastructureRuntimeOptions =
  CreateInfrastructureRuntimeOptions & {
    readonly sql?: CreateSqlPersistenceFoundationOptions;
  };

export type SqlInfrastructureRuntime = InfrastructureRuntime & {
  readonly sqlPersistence: SqlPersistenceFoundation;
};

export function createMigrationHealthProbe(
  foundation: SqlPersistenceFoundation,
): HealthProbe {
  return {
    name: "migrations",
    async check() {
      return ok({
        name: "migrations",
        status: foundation.migrationCompatible ? "up" : "down",
        detail: foundation.migrationCompatible
          ? "schema compatible"
          : "schema migration missing",
      });
    },
  };
}

export function createTransactionHealthProbe(
  foundation: SqlPersistenceFoundation,
): HealthProbe {
  return {
    name: "transactions",
    async check() {
      const begin = await foundation.database.beginTransaction();
      if (!begin.ok) {
        return ok({
          name: "transactions",
          status: "down" as const,
          detail: begin.error.message,
        });
      }
      const rolled = await begin.value.rollback();
      if (!rolled.ok) {
        return ok({
          name: "transactions",
          status: "degraded" as const,
          detail: rolled.error.message,
        });
      }
      return ok({
        name: "transactions",
        status: "up" as const,
        detail: "begin/rollback ok",
      });
    },
  };
}

/**
 * Creates infrastructure runtime with SQL persistence selected.
 */
export function createSqlInfrastructureRuntime(
  options: CreateSqlInfrastructureRuntimeOptions = {},
): SqlInfrastructureRuntime {
  const sqlPersistence = createSqlPersistenceFoundation(options.sql ?? {});

  const runtime = createInfrastructureRuntime({
    ...(options.config !== undefined ? { config: options.config } : {}),
    ...(options.configSource !== undefined
      ? { configSource: options.configSource }
      : {}),
    ...(options.secrets !== undefined ? { secrets: options.secrets } : {}),
    ...(options.logger !== undefined ? { logger: options.logger } : {}),
    ...(options.metrics !== undefined ? { metrics: options.metrics } : {}),
    ...(options.tracer !== undefined ? { tracer: options.tracer } : {}),
    ...(options.clock !== undefined
      ? { clock: options.clock }
      : { clock: sqlPersistence.clock }),
    persistence: sqlPersistence,
    persistenceAdapter: "sql",
  });

  runtime.health.register(createMigrationHealthProbe(sqlPersistence));
  runtime.health.register(createTransactionHealthProbe(sqlPersistence));

  const originalDispose = runtime.dispose.bind(runtime);
  return {
    ...runtime,
    sqlPersistence,
    dispose() {
      originalDispose();
      sqlPersistence.dispose();
    },
  };
}
