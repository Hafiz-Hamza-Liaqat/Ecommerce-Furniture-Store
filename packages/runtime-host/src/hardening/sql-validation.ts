/**
 * SQL operational validation — busy timeout, integrity, schema/migration checks.
 * No schema redesign.
 */

import type { SqlPersistenceFoundation } from "@afh/persistence-sql";
import {
  InfrastructureError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";

export type SqlOperationalReport = {
  readonly migrationCompatible: boolean;
  readonly busyTimeoutMs: number;
  readonly busyTimeoutExpected: number;
  readonly busyTimeoutMatch: boolean;
  readonly integrityOk: boolean;
  readonly integrityDetail: string;
  readonly transactionOk: boolean;
};

/**
 * Verifies SQL production operational posture without mutating schema.
 */
export async function validateSqlOperational(
  sql: SqlPersistenceFoundation,
  options: {
    readonly expectedBusyTimeoutMs: number;
    readonly integrityMode?: "quick" | "full";
  },
): Promise<Result<SqlOperationalReport, PlatformError>> {
  if (!sql.migrationCompatible) {
    return fail(
      new InfrastructureError("SQL migrations incompatible", {
        code: "sql_migration_incompatible",
      }),
    );
  }

  const busyTimeoutMs = sql.busyTimeoutMs;
  const busyTimeoutMatch = busyTimeoutMs === options.expectedBusyTimeoutMs;

  const integrity = sql.sqlClient.integrityCheck(options.integrityMode ?? "quick");
  if (!integrity.ok) return integrity;
  if (!integrity.value.ok) {
    return fail(
      new InfrastructureError(`SQL integrity failed: ${integrity.value.detail}`, {
        code: "sql_integrity_failed",
        details: { detail: integrity.value.detail },
      }),
    );
  }

  const begin = await sql.database.beginTransaction();
  if (!begin.ok) return begin;
  const rolled = await begin.value.rollback();
  if (!rolled.ok) return rolled;

  return ok({
    migrationCompatible: true,
    busyTimeoutMs,
    busyTimeoutExpected: options.expectedBusyTimeoutMs,
    busyTimeoutMatch,
    integrityOk: true,
    integrityDetail: integrity.value.detail,
    transactionOk: true,
  });
}

/**
 * Startup schema verification — migrations + optional integrity.
 */
export async function verifyStartupSchema(
  sql: SqlPersistenceFoundation,
  options: {
    readonly expectedBusyTimeoutMs: number;
    readonly requireIntegrity: boolean;
  },
): Promise<Result<{ checked: string[] }, PlatformError>> {
  const checked: string[] = [];
  if (!sql.migrationCompatible) {
    return fail(
      new InfrastructureError("Startup schema verification failed", {
        code: "startup_schema_incompatible",
      }),
    );
  }
  checked.push("migrations");

  if (sql.busyTimeoutMs !== options.expectedBusyTimeoutMs) {
    return fail(
      new InfrastructureError("Busy timeout mismatch", {
        code: "busy_timeout_mismatch",
        details: {
          actual: sql.busyTimeoutMs,
          expected: options.expectedBusyTimeoutMs,
        },
      }),
    );
  }
  checked.push("busy_timeout");

  if (options.requireIntegrity) {
    const integrity = sql.sqlClient.integrityCheck("quick");
    if (!integrity.ok) return integrity;
    if (!integrity.value.ok) {
      return fail(
        new InfrastructureError("Integrity check failed at startup", {
          code: "startup_integrity_failed",
          details: { detail: integrity.value.detail },
        }),
      );
    }
    checked.push("integrity");
  }

  return ok({ checked });
}
