/**
 * Aggregate persistence foundation — reusable, domain-neutral.
 */

import type { AggregateId, AggregateRoot } from "@afh/shared-kernel";
import type { AggregateVersion } from "../concurrency/concurrency.js";

/**
 * Aggregate that participates in optimistic concurrency.
 */
export interface VersionedAggregateRoot extends AggregateRoot {
  readonly version: AggregateVersion;
}

/**
 * Generic persisted aggregate record shape (no business fields).
 */
export type AggregatePersistenceRecord = {
  readonly id: string;
  readonly version: AggregateVersion;
  readonly companyId: string | null;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type AggregateIdentity = {
  readonly id: AggregateId;
  readonly companyId: string | null;
};
