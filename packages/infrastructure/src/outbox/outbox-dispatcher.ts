/**
 * Outbox runtime — sole publisher path to the Event Bus.
 * Domains write outbox rows; this dispatcher relays them.
 */

import type { Clock, Logger, PlatformError, Result } from "@afh/shared-kernel";
import { ok } from "@afh/shared-kernel";
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

export class OutboxDispatcher {
  readonly #store: OutboxStore;
  readonly #bus: EventBus;
  readonly #clock: Clock;
  readonly #logger: Logger;
  readonly #policy: OutboxRetryPolicy;
  readonly #batchSize: number;

  constructor(options: {
    readonly store: OutboxStore;
    readonly bus: EventBus;
    readonly clock: Clock;
    readonly logger: Logger;
    readonly policy?: OutboxRetryPolicy;
    readonly batchSize?: number;
  }) {
    this.#store = options.store;
    this.#bus = options.bus;
    this.#clock = options.clock;
    this.#logger = options.logger;
    this.#policy = options.policy ?? DEFAULT_OUTBOX_RETRY_POLICY;
    this.#batchSize = options.batchSize ?? 50;
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
    const envelope: EventEnvelope = {
      messageId: message.id,
      topic: message.topic,
      eventId: message.eventId,
      companyId: message.companyId,
      correlationId: null,
      payloadJson: message.payloadJson,
      publishedAt: now.toISOString(),
    };

    const publishResult = await this.#bus.publish(envelope);
    if (publishResult.ok) {
      await this.#store.markPublished(message.id, now.toISOString());
      this.#logger.debug("Outbox message published", {
        outboxId: message.id,
        topic: message.topic,
      });
      return "published";
    }

    const attempts = message.attempts + 1;
    const errorMessage = publishResult.error.message;

    if (attempts >= this.#policy.maxAttempts) {
      await this.#store.markFailed(
        message.id,
        attempts,
        null,
        errorMessage,
      );
      this.#bus.deadLetter(envelope, errorMessage, attempts);
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
  }
}
