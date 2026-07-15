/**
 * Transaction context propagation — no HTTP/transport coupling.
 */

import type { DatabaseTransaction } from "../database/database.js";

export interface TransactionContext {
  getCurrent(): DatabaseTransaction | null;
  run<T>(transaction: DatabaseTransaction, fn: () => Promise<T>): Promise<T>;
}

/**
 * Stack-based transaction context (framework-agnostic).
 */
export class StackTransactionContext implements TransactionContext {
  readonly #stack: DatabaseTransaction[] = [];

  getCurrent(): DatabaseTransaction | null {
    return this.#stack.length > 0
      ? (this.#stack[this.#stack.length - 1] ?? null)
      : null;
  }

  async run<T>(
    transaction: DatabaseTransaction,
    fn: () => Promise<T>,
  ): Promise<T> {
    this.#stack.push(transaction);
    try {
      return await fn();
    } finally {
      this.#stack.pop();
    }
  }
}
