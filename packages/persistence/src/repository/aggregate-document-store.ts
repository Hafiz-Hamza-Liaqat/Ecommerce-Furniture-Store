/**
 * Generic aggregate document store abstraction.
 */

import type { Result } from "@afh/shared-kernel";
import type { PlatformError } from "@afh/shared-kernel";
import type { DatabaseTransaction } from "../database/database.js";
import type { AggregatePersistenceRecord } from "../aggregate/aggregate.js";

export interface AggregateDocumentStore {
  get(
    id: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<AggregatePersistenceRecord | null, PlatformError>>;

  save(
    record: AggregatePersistenceRecord,
    expectedVersion: number,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>>;

  remove(
    id: string,
    expectedVersion: number,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>>;
}
