import {
  isFail,
  ok,
  InfrastructureError,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { AggregatePersistenceRecord } from "../aggregate/aggregate.js";
import {
  assertExpectedVersion,
  nextVersion,
} from "../concurrency/concurrency.js";
import type { DatabaseTransaction } from "../database/database.js";
import {
  InMemoryDatabaseTransaction,
} from "../database/in-memory-database.js";
import type { AggregateDocumentStore } from "./aggregate-document-store.js";

type MutableRecord = AggregatePersistenceRecord;

/**
 * In-memory aggregate store with transactional staging (provider-neutral adapter).
 */
export class InMemoryAggregateDocumentStore implements AggregateDocumentStore {
  readonly #committed = new Map<string, MutableRecord>();
  readonly #txBuffers = new WeakMap<
    DatabaseTransaction,
    Map<string, MutableRecord | null>
  >();

  async get(
    id: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<AggregatePersistenceRecord | null, PlatformError>> {
    const buffer = transaction
      ? this.#ensureBuffer(transaction)
      : null;

    if (buffer?.has(id)) {
      return ok(buffer.get(id) ?? null);
    }

    return ok(this.#committed.get(id) ?? null);
  }

  async save(
    record: AggregatePersistenceRecord,
    expectedVersion: number,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    const currentResult = await this.get(record.id, transaction);
    if (isFail(currentResult)) {
      return currentResult;
    }

    const current = currentResult.value;
    const versionCheck = assertExpectedVersion(
      current?.version ?? null,
      expectedVersion,
      record.id,
    );
    if (isFail(versionCheck)) {
      return versionCheck;
    }

    const next: MutableRecord = {
      ...record,
      version: nextVersion(expectedVersion),
    };

    if (transaction) {
      const buffer = this.#ensureBuffer(transaction);
      buffer.set(record.id, next);
      return ok(undefined);
    }

    this.#committed.set(record.id, next);
    return ok(undefined);
  }

  async remove(
    id: string,
    expectedVersion: number,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    const currentResult = await this.get(id, transaction);
    if (isFail(currentResult)) {
      return currentResult;
    }

    const current = currentResult.value;
    if (current === null) {
      return ok(undefined);
    }

    const versionCheck = assertExpectedVersion(
      current.version,
      expectedVersion,
      id,
    );
    if (isFail(versionCheck)) {
      return versionCheck;
    }

    if (transaction) {
      const buffer = this.#ensureBuffer(transaction);
      buffer.set(id, null);
      return ok(undefined);
    }

    this.#committed.delete(id);
    return ok(undefined);
  }

  #ensureBuffer(
    transaction: DatabaseTransaction,
  ): Map<string, MutableRecord | null> {
    let buffer = this.#txBuffers.get(transaction);
    if (buffer) {
      return buffer;
    }

    buffer = new Map();
    this.#txBuffers.set(transaction, buffer);

    if (!(transaction instanceof InMemoryDatabaseTransaction)) {
      throw new InfrastructureError(
        "InMemoryAggregateDocumentStore requires InMemoryDatabaseTransaction for transactional writes",
        { code: "incompatible_transaction_type" },
      );
    }

    const snapshot = buffer;
    transaction.onCommit(() => {
      for (const [id, record] of snapshot) {
        if (record === null) {
          this.#committed.delete(id);
        } else {
          this.#committed.set(id, record);
        }
      }
    });
    transaction.onRollback(() => {
      snapshot.clear();
    });

    return buffer;
  }
}
