/**
 * Outbox runtime — sole publisher path to the Event Bus.
 * Domains write outbox rows; this dispatcher relays them.
 */

import type {
  Clock,
  Logger,
  Metrics,
  PlatformError,
  Result,
  Tracer,
} from "@afh/shared-kernel";
import { CorrelationId, ok } from "@afh/shared-kernel";
import type { OutboxMessageRecord, OutboxStore } from "@afh/persistence";
import type { EventBus, EventEnvelope } from "../event-bus/event-bus.js";

export type OutboxRetryPolicy = {
  readonly maxAttempts: number;
  /** Backoff delays in milliseconds per attempt index */
  readonly backoffMs: readonly number[];
};

export const DEFAULT_OUTBOX_RETRY_POLICY: OutboxRetryPolicy = {
  maxAttempts: 8,
  backoffMs: [5_000, 30_000, 120_000, 600_000, 3_600_000],
};

export type OutboxDispatchResult = {
  readonly processed: number;
  readonly published: number;
  readonly failed: number;
  readonly deadLettered: number;
};

function nextAttemptAt(
  attempts: number,
  policy: OutboxRetryPolicy,
  now: Date,
): string | null {
  if (attempts >= policy.maxAttempts) return null;
  const idx = Math.min(attempts, policy.backoffMs.length - 1);
  const delay = policy.backoffMs[idx] ?? 3_600_000;
  return new Date(now.getTime() + delay).toISOString();
}

/**
 * Extract existing correlation/causation/event ids from serialized domain payload.
 * Does not invent new identifiers.
 */
export function extractEnvelopeCorrelation(payloadJson: string): {
  readonly correlationId: string | null;
  readonly causationId: string | null;
  readonly eventId: string | null;
  readonly traceContext: string | null;
} {
  try {
    const parsed = JSON.parse(payloadJson) as {
      metadata?: {
        correlationId?: string;
        causationId?: string | null;
        eventId?: string;
      };
      correlationId?: string;
      causationId?: string | null;
      eventId?: string;
    };
    const meta = parsed.metadata;
    const correlationId =
      (typeof meta?.correlationId === "string" ? meta.correlationId : null) ??
      (typeof parsed.correlationId === "string" ? parsed.correlationId : null);
    const causationId =
      (meta && "causationId" in meta
        ? (meta.causationId ?? null)
        : null) ??
      (parsed && "causationId" in parsed
        ? (parsed.causationId ?? null)
        : null);
    const eventId =
      (typeof meta?.eventId === "string" ? meta.eventId : null) ??
      (typeof parsed.eventId === "string" ? parsed.eventId : null);
    const traceContext = correlationId;
    return {
      correlationId,
      causationId: typeof causationId === "string" ? causationId : null,
      eventId,
      traceContext,
    };
  } catch {
    return {
      correlationId: null,
      causationId: null,
      eventId: null,
      traceContext: null,
    };
  }
}

export class OutboxDispatcher {
  readonly #store: OutboxStore;
  readonly #bus: EventBus;
  readonly #clock: Clock;
  readonly #logger: Logger;
  readonly #policy: OutboxRetryPolicy;
  readonly #batchSize: number;
  readonly #metrics: Metrics | null;
  readonly #tracer: Tracer | null;

  constructor(options: {
    readonly store: OutboxStore;
    readonly bus: EventBus;
    readonly clock: Clock;
    readonly logger: Logger;
    readonly policy?: OutboxRetryPolicy;
    readonly batchSize?: number;
    readonly metrics?: Metrics;
    readonly tracer?: Tracer;
  }) {
    this.#store = options.store;
    this.#bus = options.bus;
    this.#clock = options.clock;
    this.#logger = options.logger;
    this.#policy = options.policy ?? DEFAULT_OUTBOX_RETRY_POLICY;
    this.#batchSize = options.batchSize ?? 50;
    this.#metrics = options.metrics ?? null;
    this.#tracer = options.tracer ?? null;
  }

  async dispatchOnce(): Promise<Result<OutboxDispatchResult, PlatformError>> {
    const pending = await this.#store.listPending(this.#batchSize);
    if (!pending.ok) return pending;

    const now = this.#clock.now();
    const nowIso = now.toISOString();
    let published = 0;
    let failed = 0;
    let deadLettered = 0;

    for (const message of pending.value) {
      if (
        message.nextAttemptAt != null &&
        message.nextAttemptAt > nowIso
      ) {
        continue;
      }

      const result = await this.#publishOne(message, now);
      if (result === "published") published += 1;
      else if (result === "failed") failed += 1;
      else deadLettered += 1;
    }

    return ok({
      processed: pending.value.length,
      published,
      failed,
      deadLettered,
    });
  }

  async #publishOne(
    message: OutboxMessageRecord,
    now: Date,
  ): Promise<"published" | "failed" | "dead_lettered"> {
    const extracted = extractEnvelopeCorrelation(message.payloadJson);
    const envelope: EventEnvelope = {
      messageId: message.id,
      topic: message.topic,
      eventId: message.eventId ?? extracted.eventId,
      companyId: message.companyId,
      correlationId: extracted.correlationId,
      causationId: extracted.causationId,
      traceContext: extracted.traceContext,
      payloadJson: message.payloadJson,
      publishedAt: now.toISOString(),
    };

    const publish = async (): Promise<
      "published" | "failed" | "dead_lettered"
    > => {
      const publishResult = await this.#bus.publish(envelope);
      if (publishResult.ok) {
        await this.#store.markPublished(message.id, now.toISOString());
        this.#metrics?.counter("messaging.outbox.published").add(1, {
          topic: message.topic,
        });
        this.#logger.debug("Outbox message published", {
          outboxId: message.id,
          topic: message.topic,
          correlationId: envelope.correlationId,
          eventId: envelope.eventId,
        });
        return "published";
      }

      const attempts = message.attempts + 1;
      const errorMessage = publishResult.error.message;
      this.#metrics?.counter("messaging.outbox.retry").add(1, {
        topic: message.topic,
      });

      if (attempts >= this.#policy.maxAttempts) {
        await this.#store.markFailed(
          message.id,
          attempts,
          null,
          errorMessage,
        );
        this.#bus.deadLetter(envelope, errorMessage, attempts);
        this.#metrics?.counter("messaging.outbox.dlq").add(1, {
          topic: message.topic,
        });
        this.#logger.error("Outbox message dead-lettered", {
          outboxId: message.id,
          attempts,
          error: errorMessage,
        });
        return "dead_lettered";
      }

      await this.#store.markFailed(
        message.id,
        attempts,
        nextAttemptAt(attempts, this.#policy, now),
        errorMessage,
      );
      this.#logger.warn("Outbox publish failed; scheduled retry", {
        outboxId: message.id,
        attempts,
        error: errorMessage,
      });
      return "failed";
    };

    if (this.#tracer) {
      const spanOptions = {
        attributes: {
          topic: message.topic,
          messageId: message.id,
        },
        ...(envelope.correlationId
          ? { correlationId: CorrelationId.from(envelope.correlationId) }
          : {}),
      };
      return this.#tracer.withSpan("outbox.publish", spanOptions, () =>
        publish(),
      );
    }
    return publish();
  }
}
