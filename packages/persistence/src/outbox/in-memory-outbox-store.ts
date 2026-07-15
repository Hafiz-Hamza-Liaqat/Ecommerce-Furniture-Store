import {
  ConflictError,
  NotFoundError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { DatabaseTransaction } from "../database/database.js";
import {
  InMemoryDatabaseTransaction,
} from "../database/in-memory-database.js";
import type {
  NewOutboxMessage,
  OutboxMessageRecord,
  OutboxStore,
} from "./outbox-store.js";

export class InMemoryOutboxStore implements OutboxStore {
  readonly #committed = new Map<string, OutboxMessageRecord>();
  readonly #txBuffers = new WeakMap<
    DatabaseTransaction,
    Map<string, OutboxMessageRecord>
  >();

  async enqueue(
    message: NewOutboxMessage,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    if (this.#get(message.id, transaction)) {
      return fail(
        new ConflictError("Outbox message already exists", {
          code: "outbox_duplicate",
          details: { id: message.id },
        }),
      );
    }

    const record: OutboxMessageRecord = {
      id: message.id,
      companyId: message.companyId,
      eventId: message.eventId,
      topic: message.topic,
      payloadJson: message.payloadJson,
      status: "pending",
      attempts: 0,
      nextAttemptAt: message.createdAt,
      createdAt: message.createdAt,
      publishedAt: null,
      lastError: null,
    };

    this.#put(record, transaction);
    return ok(undefined);
  }

  async listPending(
    limit: number,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<readonly OutboxMessageRecord[], PlatformError>> {
    const all = this.#all(transaction)
      .filter((m) => m.status === "pending")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit);
    return ok(all);
  }

  async markPublished(
    id: string,
    publishedAt: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    const current = this.#get(id, transaction);
    if (!current) {
      return fail(
        new NotFoundError("Outbox message not found", {
          code: "outbox_not_found",
          details: { id },
        }),
      );
    }

    this.#put(
      {
        ...current,
        status: "published",
        publishedAt,
        lastError: null,
      },
      transaction,
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
    const current = this.#get(id, transaction);
    if (!current) {
      return fail(
        new NotFoundError("Outbox message not found", {
          code: "outbox_not_found",
          details: { id },
        }),
      );
    }

    this.#put(
      {
        ...current,
        status: nextAttemptAt === null ? "failed" : "pending",
        attempts,
        nextAttemptAt,
        lastError,
      },
      transaction,
    );
    return ok(undefined);
  }

  #get(
    id: string,
    transaction?: DatabaseTransaction | null,
  ): OutboxMessageRecord | undefined {
    const buffer = transaction ? this.#txBuffers.get(transaction) : undefined;
    if (buffer?.has(id)) {
      return buffer.get(id);
    }
    return this.#committed.get(id);
  }

  #all(transaction?: DatabaseTransaction | null): OutboxMessageRecord[] {
    const map = new Map(this.#committed);
    const buffer = transaction ? this.#txBuffers.get(transaction) : undefined;
    if (buffer) {
      for (const [id, record] of buffer) {
        map.set(id, record);
      }
    }
    return [...map.values()];
  }

  #put(
    record: OutboxMessageRecord,
    transaction?: DatabaseTransaction | null,
  ): void {
    if (!transaction) {
      this.#committed.set(record.id, record);
      return;
    }

    const buffer = this.#ensureBuffer(transaction);
    buffer.set(record.id, record);
  }

  #ensureBuffer(
    transaction: DatabaseTransaction,
  ): Map<string, OutboxMessageRecord> {
    let buffer = this.#txBuffers.get(transaction);
    if (buffer) {
      return buffer;
    }
    buffer = new Map();
    this.#txBuffers.set(transaction, buffer);

    if (!(transaction instanceof InMemoryDatabaseTransaction)) {
      throw new Error("InMemoryOutboxStore requires InMemoryDatabaseTransaction");
    }

    const staged = buffer;
    transaction.onCommit(() => {
      for (const [id, record] of staged) {
        this.#committed.set(id, record);
      }
    });
    transaction.onRollback(() => {
      staged.clear();
    });

    return buffer;
  }
}
