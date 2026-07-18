/**
 * SQLite database client implementing Persistence DatabaseClient.
 * Uses Node.js built-in node:sqlite (no native addon lock-in at package boundary).
 */

import { DatabaseSync } from "node:sqlite";
import {
  fail,
  ok,
  InfrastructureError,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type {
  DatabaseClient,
  DatabaseTransaction,
  TransactionId,
  TransactionState,
} from "@afh/persistence";

export type SqlRunResult = {
  readonly changes: number;
};

export type SqlExec = {
  run(sql: string, params?: readonly unknown[]): SqlRunResult;
  get<T extends Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): T | undefined;
  all<T extends Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): T[];
  exec(sql: string): void;
};

export class SqliteDatabaseTransaction implements DatabaseTransaction {
  readonly id: TransactionId;
  #state: TransactionState = "active";
  readonly #db: DatabaseSync;

  constructor(id: TransactionId, db: DatabaseSync) {
    this.id = id;
    this.#db = db;
  }

  get state(): TransactionState {
    return this.#state;
  }

  get database(): DatabaseSync {
    return this.#db;
  }

  async commit(): Promise<Result<void, PlatformError>> {
    if (this.#state !== "active") {
      return fail(
        new InfrastructureError("Transaction is not active", {
          code: "transaction_not_active",
        }),
      );
    }
    try {
      this.#db.exec("COMMIT");
      this.#state = "committed";
      return ok(undefined);
    } catch (cause) {
      this.#state = "rolled_back";
      try {
        this.#db.exec("ROLLBACK");
      } catch {
        /* ignore */
      }
      return fail(
        new InfrastructureError("Transaction commit failed", {
          code: "transaction_commit_failed",
          cause,
        }),
      );
    }
  }

  async rollback(): Promise<Result<void, PlatformError>> {
    if (this.#state !== "active") {
      return ok(undefined);
    }
    try {
      this.#db.exec("ROLLBACK");
      this.#state = "rolled_back";
      return ok(undefined);
    } catch (cause) {
      this.#state = "rolled_back";
      return fail(
        new InfrastructureError("Transaction rollback failed", {
          code: "transaction_rollback_failed",
          cause,
        }),
      );
    }
  }

  markRolledBack(): void {
    this.#state = "rolled_back";
  }
}

export class SqliteDatabaseClient implements DatabaseClient, SqlExec {
  readonly name = "sqlite";
  readonly #db: DatabaseSync;
  readonly #busyTimeoutMs: number;
  #sequence = 0;
  #activeTx: SqliteDatabaseTransaction | null = null;

  constructor(databasePath: string, busyTimeoutMs: number) {
    this.#busyTimeoutMs = Math.max(0, busyTimeoutMs);
    this.#db = new DatabaseSync(databasePath);
    this.#db.exec("PRAGMA foreign_keys = ON");
    this.#db.exec(`PRAGMA busy_timeout = ${this.#busyTimeoutMs}`);
  }

  get busyTimeoutMs(): number {
    return this.#busyTimeoutMs;
  }

  get raw(): DatabaseSync {
    return this.#db;
  }

  exec(sql: string): void {
    this.#db.exec(sql);
  }

  run(sql: string, params: readonly unknown[] = []): SqlRunResult {
    const result = this.#db.prepare(sql).run(...(params as never[]));
    return { changes: Number(result.changes ?? 0) };
  }

  get<T extends Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): T | undefined {
    return this.#db.prepare(sql).get(...(params as never[])) as T | undefined;
  }

  all<T extends Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): T[] {
    return this.#db.prepare(sql).all(...(params as never[])) as T[];
  }

  async beginTransaction(): Promise<Result<DatabaseTransaction, PlatformError>> {
    if (this.#activeTx?.state === "active") {
      return fail(
        new InfrastructureError("Nested SQL transactions are not supported", {
          code: "nested_sql_transaction",
        }),
      );
    }
    try {
      this.#db.exec("BEGIN IMMEDIATE");
      this.#sequence += 1;
      const tx = new SqliteDatabaseTransaction(`sql-tx-${this.#sequence}`, this.#db);
      this.#activeTx = tx;
      return ok(tx);
    } catch (cause) {
      return fail(
        new InfrastructureError("Failed to begin SQL transaction", {
          code: "begin_transaction_failed",
          cause,
        }),
      );
    }
  }

  async healthCheck(): Promise<Result<void, PlatformError>> {
    try {
      this.#db.prepare("SELECT 1").get();
      return ok(undefined);
    } catch (cause) {
      return fail(
        new InfrastructureError("SQL health check failed", {
          code: "sql_health_failed",
          cause,
        }),
      );
    }
  }

  /**
   * Production integrity verification — PRAGMA quick_check / integrity_check.
   * Additive operational helper; does not alter schema.
   */
  integrityCheck(
    mode: "quick" | "full" = "quick",
  ): Result<{ ok: boolean; detail: string }, PlatformError> {
    try {
      const pragma =
        mode === "full" ? "PRAGMA integrity_check" : "PRAGMA quick_check";
      const row = this.#db.prepare(pragma).get() as
        | { integrity_check?: string; quick_check?: string }
        | undefined;
      const detail =
        row?.integrity_check ??
        row?.quick_check ??
        (row ? String(Object.values(row)[0] ?? "") : "");
      const passed = detail === "ok";
      return ok({ ok: passed, detail: detail || "empty" });
    } catch (cause) {
      return fail(
        new InfrastructureError("SQL integrity check failed", {
          code: "sql_integrity_failed",
          cause,
        }),
      );
    }
  }

  close(): void {
    this.#db.close();
  }
}

export function asSqlTx(
  transaction?: DatabaseTransaction | null,
): SqliteDatabaseTransaction | null {
  if (!transaction) return null;
  if (!(transaction instanceof SqliteDatabaseTransaction)) {
    throw new InfrastructureError(
      "SQL stores require SqliteDatabaseTransaction",
      { code: "incompatible_transaction_type" },
    );
  }
  return transaction;
}
