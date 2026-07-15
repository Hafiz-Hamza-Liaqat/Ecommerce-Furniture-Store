/**
 * Durable domain event store — append-only. No Event Bus publish.
 */

import {
  ok,
  type Clock,
  type DomainEvent,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import {
  toPersistedDomainEventRecord,
  type DatabaseTransaction,
  type DomainEventStore,
  type PersistedDomainEventRecord,
} from "@afh/persistence";
import {
  asSqlTx,
  type SqliteDatabaseClient,
} from "../database/sqlite-client.js";

type EventRow = {
  event_id: string;
  event_type: string;
  event_version: number;
  occurred_at: string;
  correlation_id: string;
  causation_id: string | null;
  aggregate_type: string;
  aggregate_id: string;
  company_id: string | null;
  sensitivity: string;
  payload_json: string;
  created_at: string;
};

export class SqlDomainEventStore implements DomainEventStore {
  constructor(
    private readonly client: SqliteDatabaseClient,
    private readonly clock: Clock,
  ) {}

  async append(
    events: readonly DomainEvent[],
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<void, PlatformError>> {
    asSqlTx(transaction);
    const createdAt = this.clock.now().toISOString();
    for (const event of events) {
      const record = toPersistedDomainEventRecord(
        event,
        createdAt,
        JSON.stringify(event.payload),
      );
      this.client.run(
        `INSERT INTO domain_events (
          event_id, event_type, event_version, occurred_at, correlation_id,
          causation_id, aggregate_type, aggregate_id, company_id, sensitivity,
          payload_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.eventId,
          record.eventType,
          record.eventVersion,
          record.occurredAt,
          record.correlationId,
          record.causationId,
          record.aggregateType,
          record.aggregateId,
          record.companyId,
          record.sensitivity,
          record.payloadJson,
          record.createdAt,
        ],
      );
    }
    return ok(undefined);
  }

  async listByAggregate(
    aggregateType: string,
    aggregateId: string,
    transaction?: DatabaseTransaction | null,
  ): Promise<Result<readonly PersistedDomainEventRecord[], PlatformError>> {
    asSqlTx(transaction);
    const rows = this.client.all<EventRow>(
      `SELECT * FROM domain_events
       WHERE aggregate_type = ? AND aggregate_id = ?
       ORDER BY created_at ASC`,
      [aggregateType, aggregateId],
    );
    return ok(
      rows.map((row) => ({
        eventId: row.event_id,
        eventType: row.event_type,
        eventVersion: row.event_version,
        occurredAt: row.occurred_at,
        correlationId: row.correlation_id,
        causationId: row.causation_id,
        aggregateType: row.aggregate_type,
        aggregateId: row.aggregate_id,
        companyId: row.company_id,
        sensitivity: row.sensitivity,
        payloadJson: row.payload_json,
        createdAt: row.created_at,
      })),
    );
  }
}
