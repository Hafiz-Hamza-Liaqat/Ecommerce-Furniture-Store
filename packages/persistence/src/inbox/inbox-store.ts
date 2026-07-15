/**
 * Generic Inbox infrastructure — processed message tracking / idempotency.
 * No consumer implementations.
 */

import type { PlatformError, Result } from "@afh/shared-kernel";
import type { DatabaseTransaction } from "../database/database.js";

export type InboxProcessedRecord = {
  readonly consumerName: string;
  readonly eventId: string;
  readonly processedAt: string;
};

export interface InboxStore {
  /**
   * Returns true if already processed (duplicate).
   */
  hasProcessed(
    consumerName: string,
    eventId: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<boolean, PlatformError>>;

  /**
   * Marks event as processed. Fails with conflict if duplicate.
   */
  markProcessed(
    record: InboxProcessedRecord,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>>;
}

export function inboxKey(consumerName: string, eventId: string): string {
  return `${consumerName}::${eventId}`;
}
