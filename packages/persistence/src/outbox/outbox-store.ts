/**
 * Generic Outbox infrastructure — write + state + retry metadata.
 * Does NOT implement Event Bus publisher (Phase 0D / later).
 */

import type { PlatformError, Result } from "@afh/shared-kernel";
import type { DatabaseTransaction } from "../database/database.js";

export type OutboxStatus = "pending" | "published" | "failed";

export type OutboxMessageRecord = {
  readonly id: string;
  readonly companyId: string | null;
  readonly eventId: string | null;
  readonly topic: string;
  readonly payloadJson: string;
  readonly status: OutboxStatus;
  readonly attempts: number;
  readonly nextAttemptAt: string | null;
  readonly createdAt: string;
  readonly publishedAt: string | null;
  readonly lastError: string | null;
};

export type NewOutboxMessage = {
  readonly id: string;
  readonly companyId: string | null;
  readonly eventId: string | null;
  readonly topic: string;
  readonly payloadJson: string;
  readonly createdAt: string;
};

export interface OutboxStore {
  enqueue(
    message: NewOutboxMessage,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>>;

  listPending(
    limit: number,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<readonly OutboxMessageRecord[], PlatformError>>;

  markPublished(
    id: string,
    publishedAt: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>>;

  markFailed(
    id: string,
    attempts: number,
    nextAttemptAt: string | null,
    lastError: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>>;
}
