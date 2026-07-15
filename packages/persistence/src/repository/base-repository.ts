/**
 * Reusable base repository implementing Phase 1A Repository contract.
 */

import {
  isFail,
  ok,
  type AggregateId,
  type PlatformError,
  type Repository,
  type Result,
} from "@afh/shared-kernel";
import type { AggregatePersistenceRecord } from "../aggregate/aggregate.js";
import type { VersionedAggregateRoot } from "../aggregate/aggregate.js";
import type { PersistenceMapper } from "../mapping/mapper.js";
import type { TransactionContext } from "../transaction/transaction-context.js";
import type { AggregateDocumentStore } from "./aggregate-document-store.js";

export type BaseRepositoryOptions<TAggregate extends VersionedAggregateRoot> = {
  readonly store: AggregateDocumentStore;
  readonly mapper: PersistenceMapper<TAggregate, AggregatePersistenceRecord>;
  readonly transactionContext: TransactionContext;
};

export class BaseRepository<TAggregate extends VersionedAggregateRoot>
  implements Repository<TAggregate>
{
  protected readonly store: AggregateDocumentStore;
  protected readonly mapper: PersistenceMapper<
    TAggregate,
    AggregatePersistenceRecord
  >;
  protected readonly transactionContext: TransactionContext;

  constructor(options: BaseRepositoryOptions<TAggregate>) {
    this.store = options.store;
    this.mapper = options.mapper;
    this.transactionContext = options.transactionContext;
  }

  async findById(
    id: AggregateId,
  ): Promise<Result<TAggregate | null, PlatformError>> {
    const tx = this.transactionContext.getCurrent();
    const loaded = await this.store.get(id.value, tx);
    if (isFail(loaded)) {
      return loaded;
    }
    if (loaded.value === null) {
      return ok(null);
    }
    return this.mapper.toAggregate(loaded.value);
  }

  async save(aggregate: TAggregate): Promise<Result<void, PlatformError>> {
    const mapped = this.mapper.toRecord(aggregate);
    if (isFail(mapped)) {
      return mapped;
    }

    const tx = this.transactionContext.getCurrent();
    return this.store.save(mapped.value, aggregate.version, tx);
  }

  async remove(id: AggregateId): Promise<Result<void, PlatformError>> {
    const existing = await this.findById(id);
    if (isFail(existing)) {
      return existing;
    }
    if (existing.value === null) {
      return ok(undefined);
    }

    const tx = this.transactionContext.getCurrent();
    return this.store.remove(id.value, existing.value.version, tx);
  }
}
