/**
 * Domain event persistence — no handlers, no Event Bus.
 * Aligns with Phase 0B domain_events / Phase 0D envelope fields.
 */

import type {
  DomainEvent,
  PlatformError,
  Result,
} from "@afh/shared-kernel";
import type { DatabaseTransaction } from "../database/database.js";

export type PersistedDomainEventRecord = {
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly companyId: string | null;
  readonly sensitivity: string;
  readonly payloadJson: string;
  readonly createdAt: string;
};

export interface DomainEventStore {
  append(
    events: readonly DomainEvent[],
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>>;

  listByAggregate(
    aggregateType: string,
    aggregateId: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<readonly PersistedDomainEventRecord[], PlatformError>>;
}

export function toPersistedDomainEventRecord(
  event: DomainEvent,
  createdAtIso: string,
  payloadJson: string,
): PersistedDomainEventRecord {
  return {
    eventId: event.metadata.eventId.value,
    eventType: event.metadata.eventType,
    eventVersion: event.metadata.eventVersion,
    occurredAt: event.metadata.occurredAt.toISOString(),
    correlationId: event.metadata.correlationId.value,
    causationId: event.metadata.causationId?.value ?? null,
    aggregateType: event.metadata.aggregateType,
    aggregateId: event.metadata.aggregateId.value,
    companyId: event.metadata.companyId,
    sensitivity: event.metadata.sensitivity,
    payloadJson,
    createdAt: createdAtIso,
  };
}
