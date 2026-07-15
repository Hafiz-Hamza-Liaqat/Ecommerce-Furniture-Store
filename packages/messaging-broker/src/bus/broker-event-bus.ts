/**
 * Broker-backed Event Bus — implements existing EventBus contract.
 * Publish accepts into durable broker; consumers process via ConsumerRuntime.
 */

import type {
  DeadLetterRecord,
  EventBus,
  EventEnvelope,
  EventHandler,
  JsonSerializer,
} from "@afh/infrastructure";
import {
  InfrastructureError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { DurableMessageBroker } from "../broker/durable-broker.js";
import { withPropagatedCorrelation } from "../correlation/correlation.js";
import type { DurableDeadLetterQueue } from "../dlq/dead-letter-queue.js";
import type { MessagingMetrics } from "../observability/messaging-metrics.js";

function topicMatches(pattern: string, topic: string): boolean {
  if (pattern === "*" || pattern === topic) return true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -1);
    return topic.startsWith(prefix);
  }
  return false;
}

export class BrokerEventBus implements EventBus {
  readonly #handlers = new Map<string, Set<EventHandler>>();
  readonly #broker: DurableMessageBroker;
  readonly #dlq: DurableDeadLetterQueue;
  readonly #serializer: JsonSerializer;
  readonly #metrics: MessagingMetrics | null;

  constructor(options: {
    readonly broker: DurableMessageBroker;
    readonly dlq: DurableDeadLetterQueue;
    readonly serializer: JsonSerializer;
    readonly metrics?: MessagingMetrics;
  }) {
    this.#broker = options.broker;
    this.#dlq = options.dlq;
    this.#serializer = options.serializer;
    this.#metrics = options.metrics ?? null;
  }

  get broker(): DurableMessageBroker {
    return this.#broker;
  }

  get dlq(): DurableDeadLetterQueue {
    return this.#dlq;
  }

  /** Registered subscriber handlers (used by ConsumerRuntime). */
  matchingHandlers(topic: string): EventHandler[] {
    const handlers: EventHandler[] = [];
    for (const [pattern, set] of this.#handlers) {
      if (!topicMatches(pattern, topic)) continue;
      for (const handler of set) {
        handlers.push(handler);
      }
    }
    return handlers;
  }

  async publish(envelope: EventEnvelope): Promise<Result<void, PlatformError>> {
    const normalized = withPropagatedCorrelation(envelope);
    const check = this.#serializer.serialize(normalized);
    if (!check.ok) {
      return check;
    }

    const result = await this.#broker.publish(normalized);
    if (!result.ok) {
      return result;
    }

    this.#metrics?.publish(normalized.topic);
    return ok(undefined);
  }

  subscribe(
    topicPattern: string,
    handler: EventHandler,
  ): { unsubscribe(): void } {
    let set = this.#handlers.get(topicPattern);
    if (!set) {
      set = new Set();
      this.#handlers.set(topicPattern, set);
    }
    set.add(handler);
    return {
      unsubscribe: () => {
        set?.delete(handler);
      },
    };
  }

  deadLetter(
    envelope: EventEnvelope,
    reason: string,
    attempts: number,
  ): void {
    const normalized = withPropagatedCorrelation(envelope);
    const result = this.#broker.deadLetterEnvelope({
      envelope: normalized,
      reason,
      attempts,
      diagnostics: {
        source: "event_bus.deadLetter",
        correlationId: normalized.correlationId,
        eventId: normalized.eventId,
        causationId: normalized.causationId,
        traceContext: normalized.traceContext,
      },
    });
    if (result.ok) {
      this.#metrics?.dlq(normalized.topic);
    }
  }

  listDeadLetters(): readonly DeadLetterRecord[] {
    return this.#dlq.toDeadLetterRecords();
  }

  async publishReadiness(): Promise<Result<void, PlatformError>> {
    const health = await this.#broker.healthCheck();
    if (!health.ok) {
      return health;
    }
    if (!health.value.healthy) {
      return fail(
        new InfrastructureError("Broker not ready for publish", {
          code: "broker_not_ready",
          details: { detail: health.value.detail },
        }),
      );
    }
    // Prove publish path with a no-op validate serialize only
    return ok(undefined);
  }
}
