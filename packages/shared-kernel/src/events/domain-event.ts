/**
 * Base domain event contracts only.
 * No Event Bus, publishers, subscribers, or handlers.
 */

import type {
  AggregateId,
  CausationId,
  CorrelationId,
  EventId,
} from "../identifiers/identifiers.js";
import type { Instant } from "../time/clock.js";

export type EventSensitivity =
  | "public"
  | "internal"
  | "pii"
  | "restricted"
  | "financial";

export type DomainEventMetadata = {
  readonly eventId: EventId;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly occurredAt: Instant;
  readonly correlationId: CorrelationId;
  readonly causationId: CausationId | null;
  readonly aggregateType: string;
  readonly aggregateId: AggregateId;
  readonly companyId: string | null;
  readonly sensitivity: EventSensitivity;
};

/**
 * Immutable domain event base shape.
 */
export interface DomainEvent<TPayload = Readonly<Record<string, unknown>>> {
  readonly metadata: DomainEventMetadata;
  readonly payload: TPayload;
}

export type DomainEventEnvelope = DomainEvent;

export function createEventMetadata(
  partial: DomainEventMetadata,
): DomainEventMetadata {
  return { ...partial };
}
