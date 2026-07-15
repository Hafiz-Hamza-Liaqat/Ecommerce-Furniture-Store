/**
 * Durable SQLite-backed message broker (node:sqlite).
 * Production provider behind the Event Bus abstraction — no business logic.
 */

import { DatabaseSync } from "node:sqlite";
import type { EventEnvelope } from "@afh/infrastructure";
import {
  InfrastructureError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type {
  BrokerClaim,
  BrokerMessage,
  MessageBroker,
} from "./message-broker.js";

type MessageRow = {
  id: string;
  topic: string;
  envelope_json: string;
  status: string;
  attempts: number;
  next_attempt_at: string | null;
  locked_until: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type DeadLetterRow = {
  id: string;
  original_message_id: string;
  topic: string;
  envelope_json: string;
  reason: string;
  attempts: number;
  diagnostics_json: string;
  dead_lettered_at: string;
  replayed_at: string | null;
};

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function rowToMessage(row: MessageRow): BrokerMessage {
  return {
    id: row.id,
    topic: row.topic,
    envelope: JSON.parse(row.envelope_json) as EventEnvelope,
    status: row.status as BrokerMessage["status"],
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lockedUntil: row.locked_until,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DurableMessageBroker implements MessageBroker {
  readonly #db: DatabaseSync;
  readonly endpoint: string;

  constructor(options: {
    readonly databasePath: string;
    readonly endpoint: string;
  }) {
    this.endpoint = options.endpoint;
    this.#db = new DatabaseSync(options.databasePath);
    this.#db.exec("PRAGMA journal_mode = WAL;");
    this.#db.exec("PRAGMA busy_timeout = 5000;");
    this.#migrate();
  }

  async publish(
    envelope: EventEnvelope,
  ): Promise<Result<{ brokerId: string }, PlatformError>> {
    try {
      const id = newId("brk");
      const now = new Date().toISOString();
      this.#db
        .prepare(
          `INSERT INTO broker_messages
            (id, topic, envelope_json, status, attempts, next_attempt_at, locked_until, last_error, created_at, updated_at)
           VALUES (?, ?, ?, 'pending', 0, NULL, NULL, NULL, ?, ?)`,
        )
        .run(id, envelope.topic, JSON.stringify(envelope), now, now);
      return ok({ brokerId: id });
    } catch (cause) {
      return fail(
        new InfrastructureError("Broker publish failed", {
          code: "broker_publish_failed",
          cause,
          retryable: true,
        }),
      );
    }
  }

  async claim(input: {
    readonly batchSize: number;
    readonly leaseMs: number;
    readonly now: Date;
  }): Promise<Result<readonly BrokerClaim[], PlatformError>> {
    try {
      const nowIso = input.now.toISOString();
      const lockedUntil = new Date(
        input.now.getTime() + input.leaseMs,
      ).toISOString();

      // Release expired leases back to pending
      this.#db
        .prepare(
          `UPDATE broker_messages
           SET status = 'pending', locked_until = NULL, updated_at = ?
           WHERE status = 'inflight' AND locked_until IS NOT NULL AND locked_until < ?`,
        )
        .run(nowIso, nowIso);

      const candidates = this.#db
        .prepare(
          `SELECT id FROM broker_messages
           WHERE status = 'pending'
             AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
           ORDER BY created_at ASC
           LIMIT ?`,
        )
        .all(nowIso, input.batchSize) as Array<{ id: string }>;

      const claims: BrokerClaim[] = [];
      for (const candidate of candidates) {
        const updateResult = this.#db
          .prepare(
            `UPDATE broker_messages
             SET status = 'inflight', locked_until = ?, updated_at = ?
             WHERE id = ? AND status = 'pending'`,
          )
          .run(lockedUntil, nowIso, candidate.id) as { changes: number };
        if (updateResult.changes !== 1) {
          continue;
        }
        const updated = this.#db
          .prepare(`SELECT * FROM broker_messages WHERE id = ?`)
          .get(candidate.id) as MessageRow | undefined;
        if (updated) {
          claims.push({ message: rowToMessage(updated) });
        }
      }
      return ok(claims);
    } catch (cause) {
      return fail(
        new InfrastructureError("Broker claim failed", {
          code: "broker_claim_failed",
          cause,
          retryable: true,
        }),
      );
    }
  }

  async acknowledge(brokerId: string): Promise<Result<void, PlatformError>> {
    try {
      const now = new Date().toISOString();
      this.#db
        .prepare(
          `UPDATE broker_messages
           SET status = 'acked', locked_until = NULL, updated_at = ?
           WHERE id = ?`,
        )
        .run(now, brokerId);
      return ok(undefined);
    } catch (cause) {
      return fail(
        new InfrastructureError("Broker acknowledge failed", {
          code: "broker_ack_failed",
          cause,
          retryable: true,
        }),
      );
    }
  }

  async scheduleRetry(input: {
    readonly brokerId: string;
    readonly attempts: number;
    readonly nextAttemptAt: string;
    readonly errorMessage: string;
  }): Promise<Result<void, PlatformError>> {
    try {
      const now = new Date().toISOString();
      this.#db
        .prepare(
          `UPDATE broker_messages
           SET status = 'pending',
               attempts = ?,
               next_attempt_at = ?,
               locked_until = NULL,
               last_error = ?,
               updated_at = ?
           WHERE id = ?`,
        )
        .run(
          input.attempts,
          input.nextAttemptAt,
          input.errorMessage,
          now,
          input.brokerId,
        );
      return ok(undefined);
    } catch (cause) {
      return fail(
        new InfrastructureError("Broker retry schedule failed", {
          code: "broker_retry_failed",
          cause,
          retryable: true,
        }),
      );
    }
  }

  async moveToDeadLetter(input: {
    readonly brokerId: string;
    readonly reason: string;
    readonly attempts: number;
    readonly diagnostics?: Readonly<Record<string, unknown>>;
  }): Promise<Result<void, PlatformError>> {
    try {
      const now = new Date().toISOString();
      const row = this.#db
        .prepare(`SELECT * FROM broker_messages WHERE id = ?`)
        .get(input.brokerId) as MessageRow | undefined;
      if (!row) {
        return fail(
          new InfrastructureError("Broker message not found", {
            code: "broker_message_not_found",
            details: { brokerId: input.brokerId },
          }),
        );
      }

      const dlqId = newId("dlq");
      this.#db
        .prepare(
          `INSERT INTO broker_dlq
            (id, original_message_id, topic, envelope_json, reason, attempts, diagnostics_json, dead_lettered_at, replayed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        )
        .run(
          dlqId,
          row.id,
          row.topic,
          row.envelope_json,
          input.reason,
          input.attempts,
          JSON.stringify(input.diagnostics ?? {}),
          now,
        );

      this.#db
        .prepare(
          `UPDATE broker_messages
           SET status = 'dead', locked_until = NULL, last_error = ?, attempts = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(input.reason, input.attempts, now, input.brokerId);

      return ok(undefined);
    } catch (cause) {
      return fail(
        new InfrastructureError("Broker DLQ move failed", {
          code: "broker_dlq_failed",
          cause,
          retryable: true,
        }),
      );
    }
  }

  /**
   * Insert an envelope directly into durable DLQ (Outbox / EventBus.deadLetter path).
   */
  deadLetterEnvelope(input: {
    readonly envelope: EventEnvelope;
    readonly reason: string;
    readonly attempts: number;
    readonly diagnostics?: Readonly<Record<string, unknown>>;
  }): Result<{ dlqId: string }, PlatformError> {
    try {
      const now = new Date().toISOString();
      const dlqId = newId("dlq");
      this.#db
        .prepare(
          `INSERT INTO broker_dlq
            (id, original_message_id, topic, envelope_json, reason, attempts, diagnostics_json, dead_lettered_at, replayed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        )
        .run(
          dlqId,
          input.envelope.messageId,
          input.envelope.topic,
          JSON.stringify(input.envelope),
          input.reason,
          input.attempts,
          JSON.stringify(input.diagnostics ?? {}),
          now,
        );
      return ok({ dlqId });
    } catch (cause) {
      return fail(
        new InfrastructureError("Broker DLQ insert failed", {
          code: "broker_dlq_insert_failed",
          cause,
        }),
      );
    }
  }

  async pendingDepth(): Promise<Result<number, PlatformError>> {
    return this.#countStatus("pending");
  }

  async inflightDepth(): Promise<Result<number, PlatformError>> {
    return this.#countStatus("inflight");
  }

  async healthCheck(): Promise<
    Result<{ healthy: boolean; detail: string }, PlatformError>
  > {
    try {
      this.#db.prepare("SELECT 1 AS ok").get();
      return ok({
        healthy: true,
        detail: `endpoint=${this.endpoint}`,
      });
    } catch (cause) {
      return fail(
        new InfrastructureError("Broker health check failed", {
          code: "broker_unhealthy",
          cause,
        }),
      );
    }
  }

  dispose(): void {
    this.#db.close();
  }

  /** Exposed for DLQ / diagnostics adapters sharing the same durable store. */
  get database(): DatabaseSync {
    return this.#db;
  }

  listDeadLetterRecords(limit = 100): DeadLetterRow[] {
    return this.#db
      .prepare(
        `SELECT * FROM broker_dlq ORDER BY dead_lettered_at DESC LIMIT ?`,
      )
      .all(limit) as DeadLetterRow[];
  }

  deadLetterDepth(): number {
    const row = this.#db
      .prepare(
        `SELECT COUNT(*) AS c FROM broker_dlq WHERE replayed_at IS NULL`,
      )
      .get() as { c: number };
    return row.c;
  }

  markDlqReplayed(dlqId: string): void {
    this.#db
      .prepare(`UPDATE broker_dlq SET replayed_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), dlqId);
  }

  getDlqRow(dlqId: string): DeadLetterRow | undefined {
    return this.#db
      .prepare(`SELECT * FROM broker_dlq WHERE id = ?`)
      .get(dlqId) as DeadLetterRow | undefined;
  }

  #countStatus(status: string): Result<number, PlatformError> {
    try {
      const row = this.#db
        .prepare(
          `SELECT COUNT(*) AS c FROM broker_messages WHERE status = ?`,
        )
        .get(status) as { c: number };
      return ok(row.c);
    } catch (cause) {
      return fail(
        new InfrastructureError("Broker depth query failed", {
          code: "broker_depth_failed",
          cause,
        }),
      );
    }
  }

  #migrate(): void {
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS broker_messages (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        envelope_json TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TEXT,
        locked_until TEXT,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_broker_messages_claim
        ON broker_messages (status, next_attempt_at, created_at);
      CREATE TABLE IF NOT EXISTS broker_dlq (
        id TEXT PRIMARY KEY,
        original_message_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        envelope_json TEXT NOT NULL,
        reason TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        diagnostics_json TEXT NOT NULL,
        dead_lettered_at TEXT NOT NULL,
        replayed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_broker_dlq_topic
        ON broker_dlq (topic, dead_lettered_at);
    `);
  }
}
