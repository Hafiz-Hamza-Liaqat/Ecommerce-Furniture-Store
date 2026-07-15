/**
 * Durable Outbox storage — enqueue / pending / publish / retry metadata.
 * Publishing remains in OutboxDispatcher.
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
  NewOutboxMessage,
  OutboxMessageRecord,
  OutboxStore,
} from "@afh/persistence";
import {
  asSqlTx,
  type SqliteDatabaseClient,
} from "../database/sqlite-client.js";

type OutboxRow = {
  id: string;
  company_id: string | null;
  event_id: string | null;
  topic: string;
  payload_json: string;
  status: string;
  attempts: number;
  next_attempt_at: string | null;
  created_at: string;
  published_at: string | null;
  last_error: string | null;
};

function toRecord(row: OutboxRow): OutboxMessageRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    eventId: row.event_id,
    topic: row.topic,
    payloadJson: row.payload_json,
    status: row.status as OutboxMessageRecord["status"],
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    lastError: row.last_error,
  };
}

export class SqlOutboxStore implements OutboxStore {
  constructor(private readonly client: SqliteDatabaseClient) {}

  async enqueue(
    message: NewOutboxMessage,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    asSqlTx(transaction);
    try {
      this.client.run(
        `INSERT INTO outbox_messages (
          id, company_id, event_id, topic, payload_json, status, attempts,
          next_attempt_at, created_at, published_at, last_error
        ) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, NULL, NULL)`,
        [
          message.id,
          message.companyId,
          message.eventId,
          message.topic,
          message.payloadJson,
          message.createdAt,
          message.createdAt,
        ],
      );
      return ok(undefined);
    } catch (cause) {
      return fail(
        new ConflictError("Outbox enqueue failed", {
          code: "outbox_enqueue_failed",
          cause,
        }),
      );
    }
  }

  async listPending(
    limit: number,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<readonly OutboxMessageRecord[], PlatformError>> {
    asSqlTx(transaction);
    const now = new Date().toISOString();
    const rows = this.client.all<OutboxRow>(
      `SELECT * FROM outbox_messages
       WHERE status = 'pending'
         AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
       ORDER BY created_at ASC
       LIMIT ?`,
      [now, limit],
    );
    return ok(rows.map(toRecord));
  }

  async markPublished(
    id: string,
    publishedAt: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    asSqlTx(transaction);
    this.client.run(
      `UPDATE outbox_messages
       SET status = 'published', published_at = ?, last_error = NULL
       WHERE id = ?`,
      [publishedAt, id],
    );
    return ok(undefined);
  }

  async markFailed(
    id: string,
    attempts: number,
    nextAttemptAt: string | null,
    lastError: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    asSqlTx(transaction);
    this.client.run(
      `UPDATE outbox_messages
       SET status = 'failed', attempts = ?, next_attempt_at = ?, last_error = ?
       WHERE id = ?`,
      [attempts, nextAttemptAt, lastError, id],
    );
    // Keep failed but retriable as pending when nextAttemptAt is set
    if (nextAttemptAt) {
      this.client.run(
        `UPDATE outbox_messages SET status = 'pending' WHERE id = ?`,
        [id],
      );
    }
    return ok(undefined);
  }
}
