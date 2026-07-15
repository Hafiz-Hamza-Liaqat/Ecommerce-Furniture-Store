/**
 * Durable Inbox — idempotency / duplicate detection. No consumer execution.
 */

import {
  ConflictError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type {
  DatabaseTransaction,
  InboxProcessedRecord,
  InboxStore,
} from "@afh/persistence";
import {
  asSqlTx,
  type SqliteDatabaseClient,
} from "../database/sqlite-client.js";

export class SqlInboxStore implements InboxStore {
  constructor(private readonly client: SqliteDatabaseClient) {}

  async hasProcessed(
    consumerName: string,
    eventId: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<boolean, PlatformError>> {
    asSqlTx(transaction);
    const row = this.client.get<{ c: number }>(
      `SELECT COUNT(1) AS c FROM inbox_processed
       WHERE consumer_name = ? AND event_id = ?`,
      [consumerName, eventId],
    );
    return ok((row?.c ?? 0) > 0);
  }

  async markProcessed(
    record: InboxProcessedRecord,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    asSqlTx(transaction);
    const existing = await this.hasProcessed(
      record.consumerName,
      record.eventId,
      transaction,
    );
    if (!existing.ok) return existing;
    if (existing.value) {
      return fail(
        new ConflictError("Inbox message already processed", {
          code: "inbox_duplicate",
        }),
      );
    }
    this.client.run(
      `INSERT INTO inbox_processed (consumer_name, event_id, processed_at)
       VALUES (?, ?, ?)`,
      [record.consumerName, record.eventId, record.processedAt],
    );
    return ok(undefined);
  }
}
