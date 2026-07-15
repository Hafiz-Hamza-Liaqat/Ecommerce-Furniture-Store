/**
 * Generic database access abstractions — no domain queries, no business SQL.
 */

import type { Result } from "@afh/shared-kernel";
import type { PlatformError } from "@afh/shared-kernel";

export type TransactionId = string;

export type TransactionState = "active" | "committed" | "rolled_back";

/**
 * A unit of transactional work against a persistence adapter.
 */
export interface DatabaseTransaction {
  readonly id: TransactionId;
  readonly state: TransactionState;
  commit(): Promise<Result<void, PlatformError>>;
  rollback(): Promise<Result<void, PlatformError>>;
}

/**
 * Session capable of starting transactions.
 */
export interface DatabaseSession {
  beginTransaction(): Promise<Result<DatabaseTransaction, PlatformError>>;
}

/**
 * Top-level database client abstraction (provider-neutral).
 */
export interface DatabaseClient extends DatabaseSession {
  readonly name: string;
  healthCheck(): Promise<Result<void, PlatformError>>;
}
