/**
 * Persistence contracts — interfaces only.
 * No ORM, SQL, or database access in this phase.
 */

import type { AggregateId } from "../identifiers/identifiers.js";
import type { Result } from "../result/result.js";
import type { PlatformError } from "../errors/platform-error.js";
import type { QueryCriteria, Page } from "../paging/paging.js";

/**
 * Marker for aggregate roots. Domains define concrete aggregates later.
 */
export interface AggregateRoot {
  readonly id: AggregateId;
}

export interface Repository<TAggregate extends AggregateRoot> {
  findById(
    id: AggregateId,
  ): Promise<Result<TAggregate | null, PlatformError>>;
  save(aggregate: TAggregate): Promise<Result<void, PlatformError>>;
  remove(id: AggregateId): Promise<Result<void, PlatformError>>;
}

export interface QueryableRepository<TAggregate extends AggregateRoot>
  extends Repository<TAggregate> {
  query(
    criteria: QueryCriteria,
  ): Promise<Result<Page<TAggregate>, PlatformError>>;
}

/**
 * Unit of Work — interface only. No implementation in Phase 1A.
 */
export interface UnitOfWork {
  /**
   * Execute work within a single transactional boundary when an implementation exists.
   */
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>>;
}
