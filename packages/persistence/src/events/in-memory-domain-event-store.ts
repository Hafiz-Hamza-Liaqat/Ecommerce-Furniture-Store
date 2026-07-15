import {
  ConflictError,
  fail,
  ok,
  type DomainEvent,
  type PlatformError,
  type Result,
  type Clock,
} from "@afh/shared-kernel";
import type { DatabaseTransaction } from "../database/database.js";
import {
  InMemoryDatabaseTransaction,
} from "../database/in-memory-database.js";
import {
  toPersistedDomainEventRecord,
  type DomainEventStore,
  type PersistedDomainEventRecord,
} from "./domain-event-store.js";

export class InMemoryDomainEventStore implements DomainEventStore {
  readonly #committed: PersistedDomainEventRecord[] = [];
  readonly #txBuffers = new WeakMap<
    DatabaseTransaction,
    PersistedDomainEventRecord[]
  >();

  constructor(
    private readonly clock: Clock,
    private readonly serializePayload: (payload: unknown) => string = (p) =>
      JSON.stringify(p),
  ) {}

  async append(
    events: readonly DomainEvent[],
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    const now = this.clock.now().toISOString();
    const records = events.map((event) =>
      toPersistedDomainEventRecord(
        event,
        now,
        this.serializePayload(event.payload),
      ),
    );

    for (const record of records) {
      const exists = this.#exists(record.eventId, transaction);
      if (exists) {
        return fail(
          new ConflictError("Domain event already persisted", {
            code: "domain_event_duplicate",
            details: { eventId: record.eventId },
          }),
        );
      }
    }

    if (transaction) {
      const buffer = this.#ensureBuffer(transaction);
      buffer.push(...records);
      return ok(undefined);
    }

    this.#committed.push(...records);
    return ok(undefined);
  }

  async listByAggregate(
    aggregateType: string,
    aggregateId: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<readonly PersistedDomainEventRecord[], PlatformError>> {
    const all = [
      ...this.#committed,
      ...(transaction ? (this.#txBuffers.get(transaction) ?? []) : []),
    ];

    return ok(
      all.filter(
        (e) =>
          e.aggregateType === aggregateType && e.aggregateId === aggregateId,
      ),
    );
  }

  #exists(
    eventId: string,
    transaction?: DatabaseTransaction | null,
  ): boolean {
    if (this.#committed.some((e) => e.eventId === eventId)) {
      return true;
    }
    if (transaction) {
      const buffer = this.#txBuffers.get(transaction);
      return buffer?.some((e) => e.eventId === eventId) ?? false;
    }
    return false;
  }

  #ensureBuffer(
    transaction: DatabaseTransaction,
  ): PersistedDomainEventRecord[] {
    let buffer = this.#txBuffers.get(transaction);
    if (buffer) {
      return buffer;
    }
    buffer = [];
    this.#txBuffers.set(transaction, buffer);

    if (!(transaction instanceof InMemoryDatabaseTransaction)) {
      throw new Error(
        "InMemoryDomainEventStore requires InMemoryDatabaseTransaction",
      );
    }

    const staged = buffer;
    transaction.onCommit(() => {
      this.#committed.push(...staged);
    });
    transaction.onRollback(() => {
      staged.length = 0;
    });

    return buffer;
  }
}
