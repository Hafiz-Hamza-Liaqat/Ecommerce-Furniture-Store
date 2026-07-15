/**
 * Event Bus transport adapter — delivery substrate only.
 * No business consumers. Outbox remains the sole publisher source path.
 */

import {
  InfrastructureError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { JsonSerializer } from "../serialization/serialization.js";

export type EventEnvelope = {
  readonly messageId: string;
  readonly topic: string;
  readonly eventId: string | null;
  readonly companyId: string | null;
  readonly correlationId: string | null;
  readonly payloadJson: string;
  readonly publishedAt: string;
};

export type EventHandler = (
  envelope: EventEnvelope,
) => Promise<Result<void, PlatformError>>;

export type DeadLetterRecord = EventEnvelope & {
  readonly reason: string;
  readonly attempts: number;
  readonly deadLetteredAt: string;
};

export interface EventBus {
  publish(envelope: EventEnvelope): Promise<Result<void, PlatformError>>;
  subscribe(
    topicPattern: string,
    handler: EventHandler,
  ): { unsubscribe(): void };
  deadLetter(
    envelope: EventEnvelope,
    reason: string,
    attempts: number,
  ): void;
  listDeadLetters(): readonly DeadLetterRecord[];
}

function topicMatches(pattern: string, topic: string): boolean {
  if (pattern === "*" || pattern === topic) return true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -1);
    return topic.startsWith(prefix);
  }
  return false;
}

export class InMemoryEventBus implements EventBus {
  readonly #handlers = new Map<string, Set<EventHandler>>();
  readonly #deadLetters: DeadLetterRecord[] = [];
  readonly #serializer: JsonSerializer;

  constructor(serializer: JsonSerializer) {
    this.#serializer = serializer;
  }

  async publish(envelope: EventEnvelope): Promise<Result<void, PlatformError>> {
    // Validate envelope is serializable transport shape
    const check = this.#serializer.serialize(envelope);
    if (!check.ok) return check;

    const errors: string[] = [];
    for (const [pattern, handlers] of this.#handlers) {
      if (!topicMatches(pattern, envelope.topic)) continue;
      for (const handler of handlers) {
        try {
          const result = await handler(envelope);
          if (!result.ok) {
            errors.push(result.error.message);
          }
        } catch (error) {
          errors.push(String(error));
        }
      }
    }

    if (errors.length > 0) {
      return fail(
        new InfrastructureError(errors.join("; "), {
          code: "event_bus_handler_failed",
          retryable: true,
          details: { errors },
        }),
      );
    }

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
    this.#deadLetters.push({
      ...envelope,
      reason,
      attempts,
      deadLetteredAt: new Date().toISOString(),
    });
  }

  listDeadLetters(): readonly DeadLetterRecord[] {
    return [...this.#deadLetters];
  }
}
