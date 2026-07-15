/**
 * Mapping abstractions between aggregates and persistence records.
 * No domain-specific mappings.
 */

import type { Result } from "@afh/shared-kernel";
import type { PlatformError } from "@afh/shared-kernel";

export interface PersistenceMapper<TAggregate, TRecord> {
  toRecord(aggregate: TAggregate): Result<TRecord, PlatformError>;
  toAggregate(record: TRecord): Result<TAggregate, PlatformError>;
}
