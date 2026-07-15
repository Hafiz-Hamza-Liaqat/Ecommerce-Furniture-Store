/**
 * Durable dead-letter queue — storage, diagnostics, operator replay hooks.
 */

import type { DeadLetterRecord, EventEnvelope } from "@afh/infrastructure";
import {
  InfrastructureError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { DurableMessageBroker } from "../broker/durable-broker.js";

export type DlqRecord = DeadLetterRecord & {
  readonly dlqId: string;
  readonly originalMessageId: string;
  readonly diagnostics: Readonly<Record<string, unknown>>;
  readonly replayedAt: string | null;
};

function toDlqRecord(row: {
  id: string;
  original_message_id: string;
  topic: string;
  envelope_json: string;
  reason: string;
  attempts: number;
  diagnostics_json: string;
  dead_lettered_at: string;
  replayed_at: string | null;
}): DlqRecord {
  const envelope = JSON.parse(row.envelope_json) as EventEnvelope;
  return {
    dlqId: row.id,
    originalMessageId: row.original_message_id,
    ...envelope,
    reason: row.reason,
    attempts: row.attempts,
    deadLetteredAt: row.dead_lettered_at,
    diagnostics: JSON.parse(row.diagnostics_json) as Record<string, unknown>,
    replayedAt: row.replayed_at,
  };
}

/**
 * DLQ facade over the durable broker store.
 * Replay is operator-controlled (explicit method call only).
 */
export class DurableDeadLetterQueue {
  constructor(private readonly broker: DurableMessageBroker) {}

  list(limit = 100): Result<readonly DlqRecord[], PlatformError> {
    try {
      return ok(this.broker.listDeadLetterRecords(limit).map(toDlqRecord));
    } catch (cause) {
      return fail(
        new InfrastructureError("DLQ list failed", {
          code: "dlq_list_failed",
          cause,
        }),
      );
    }
  }

  depth(): Result<number, PlatformError> {
    try {
      return ok(this.broker.deadLetterDepth());
    } catch (cause) {
      return fail(
        new InfrastructureError("DLQ depth failed", {
          code: "dlq_depth_failed",
          cause,
        }),
      );
    }
  }

  /**
   * Operator-controlled replay — re-publishes envelope to the broker.
   */
  async replay(
    dlqId: string,
  ): Promise<Result<{ brokerId: string }, PlatformError>> {
    try {
      const row = this.broker.getDlqRow(dlqId);
      if (!row) {
        return fail(
          new InfrastructureError("DLQ record not found", {
            code: "dlq_not_found",
            details: { dlqId },
          }),
        );
      }
      if (row.replayed_at) {
        return fail(
          new InfrastructureError("DLQ record already replayed", {
            code: "dlq_already_replayed",
            details: { dlqId },
          }),
        );
      }

      const envelope = JSON.parse(row.envelope_json) as EventEnvelope;
      const published = await this.broker.publish(envelope);
      if (!published.ok) {
        return published;
      }

      this.broker.markDlqReplayed(dlqId);
      return ok({ brokerId: published.value.brokerId });
    } catch (cause) {
      return fail(
        new InfrastructureError("DLQ replay failed", {
          code: "dlq_replay_failed",
          cause,
        }),
      );
    }
  }

  healthCheck(): Result<{ healthy: boolean; detail: string }, PlatformError> {
    const depth = this.depth();
    if (!depth.ok) {
      return depth;
    }
    return ok({
      healthy: true,
      detail: `depth=${depth.value}`,
    });
  }

  toDeadLetterRecords(): readonly DeadLetterRecord[] {
    const listed = this.list(1000);
    if (!listed.ok) {
      return [];
    }
    return listed.value.map((r) => ({
      messageId: r.messageId,
      topic: r.topic,
      eventId: r.eventId,
      companyId: r.companyId,
      correlationId: r.correlationId,
      causationId: r.causationId,
      traceContext: r.traceContext,
      payloadJson: r.payloadJson,
      publishedAt: r.publishedAt,
      reason: r.reason,
      attempts: r.attempts,
      deadLetteredAt: r.deadLetteredAt,
    }));
  }
}
