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
} from "./database.js";

export type InMemoryCommitHook = () => void | Promise<void>;
export type InMemoryRollbackHook = () => void | Promise<void>;

/**
 * Provider-neutral in-memory transaction used by foundation stores.
 * SQL/ORM adapters may implement DatabaseTransaction later without changing UoW.
 */
export class InMemoryDatabaseTransaction implements DatabaseTransaction {
  readonly id: TransactionId;
  #state: TransactionState = "active";
  readonly #commitHooks: InMemoryCommitHook[] = [];
  readonly #rollbackHooks: InMemoryRollbackHook[] = [];

  constructor(id: TransactionId) {
    this.id = id;
  }

  get state(): TransactionState {
    return this.#state;
  }

  onCommit(hook: InMemoryCommitHook): void {
    this.assertActive();
    this.#commitHooks.push(hook);
  }

  onRollback(hook: InMemoryRollbackHook): void {
    this.assertActive();
    this.#rollbackHooks.push(hook);
  }

  async commit(): Promise<Result<void, PlatformError>> {
    this.assertActive();
    try {
      for (const hook of this.#commitHooks) {
        await hook();
      }
      this.#state = "committed";
      return ok(undefined);
    } catch (cause) {
      this.#state = "rolled_back";
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
      for (const hook of [...this.#rollbackHooks].reverse()) {
        await hook();
      }
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

  private assertActive(): void {
    if (this.#state !== "active") {
      throw new InfrastructureError("Transaction is not active", {
        code: "transaction_not_active",
        details: { state: this.#state, transactionId: this.id },
      });
    }
  }
}

export class InMemoryDatabaseClient implements DatabaseClient {
  readonly name = "in-memory";
  #sequence = 0;

  async beginTransaction(): Promise<Result<DatabaseTransaction, PlatformError>> {
    this.#sequence += 1;
    return ok(new InMemoryDatabaseTransaction(`tx-${this.#sequence}`));
  }

  async healthCheck(): Promise<Result<void, PlatformError>> {
    return ok(undefined);
  }
}
