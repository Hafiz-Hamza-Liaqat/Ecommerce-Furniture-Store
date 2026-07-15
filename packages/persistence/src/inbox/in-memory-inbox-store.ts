import {
  ConflictError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { DatabaseTransaction } from "../database/database.js";
import {
  InMemoryDatabaseTransaction,
} from "../database/in-memory-database.js";
import {
  inboxKey,
  type InboxProcessedRecord,
  type InboxStore,
} from "./inbox-store.js";

export class InMemoryInboxStore implements InboxStore {
  readonly #committed = new Map<string, InboxProcessedRecord>();
  readonly #txBuffers = new WeakMap<
    DatabaseTransaction,
    Map<string, InboxProcessedRecord>
  >();

  async hasProcessed(
    consumerName: string,
    eventId: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<boolean, PlatformError>> {
    const key = inboxKey(consumerName, eventId);
    return ok(this.#get(key, transaction) !== undefined);
  }

  async markProcessed(
    record: InboxProcessedRecord,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    const key = inboxKey(record.consumerName, record.eventId);
    if (this.#get(key, transaction)) {
      return fail(
        new ConflictError("Inbox message already processed", {
          code: "inbox_duplicate",
          details: {
            consumerName: record.consumerName,
            eventId: record.eventId,
          },
        }),
      );
    }

    this.#put(key, record, transaction);
    return ok(undefined);
  }

  #get(
    key: string,
    transaction?: DatabaseTransaction | null,
  ): InboxProcessedRecord | undefined {
    const buffer = transaction ? this.#txBuffers.get(transaction) : undefined;
    if (buffer?.has(key)) {
      return buffer.get(key);
    }
    return this.#committed.get(key);
  }

  #put(
    key: string,
    record: InboxProcessedRecord,
    transaction?: DatabaseTransaction | null,
  ): void {
    if (!transaction) {
      this.#committed.set(key, record);
      return;
    }

    const buffer = this.#ensureBuffer(transaction);
    buffer.set(key, record);
  }

  #ensureBuffer(
    transaction: DatabaseTransaction,
  ): Map<string, InboxProcessedRecord> {
    let buffer = this.#txBuffers.get(transaction);
    if (buffer) {
      return buffer;
    }
    buffer = new Map();
    this.#txBuffers.set(transaction, buffer);

    if (!(transaction instanceof InMemoryDatabaseTransaction)) {
      throw new Error("InMemoryInboxStore requires InMemoryDatabaseTransaction");
    }

    const staged = buffer;
    transaction.onCommit(() => {
      for (const [key, record] of staged) {
        this.#committed.set(key, record);
      }
    });
    transaction.onRollback(() => {
      staged.clear();
    });

    return buffer;
  }
}
