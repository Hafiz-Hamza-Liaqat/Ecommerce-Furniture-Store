/**
 * Production consumer runtime — claim, inbox dedupe, ack, retry, poison → DLQ.
 * Does not execute business logic; dispatches through provided EventHandlers
 * (hosts wire Application Runtime handlers via EventBus.subscribe).
 */

import type { EventHandler, InboxRuntime } from "@afh/infrastructure";
import {
  CorrelationId,
  InfrastructureError,
  fail,
  ok,
  type Clock,
  type Logger,
  type PlatformError,
  type Result,
  type Tracer,
} from "@afh/shared-kernel";
import type { BrokerEventBus } from "../bus/broker-event-bus.js";
import type { MessagingConfig } from "../config/messaging-config.js";
import { propagateCorrelation } from "../correlation/correlation.js";
import type { MessagingMetrics } from "../observability/messaging-metrics.js";
import { RetryEngine } from "../retry/retry-engine.js";

export type ConsumerPollResult = {
  readonly claimed: number;
  readonly processed: number;
  readonly duplicates: number;
  readonly retried: number;
  readonly deadLettered: number;
  readonly failed: number;
};

/**
 * Optional application dispatch hook — hosts may wrap Application Runtime.
 * Default path uses EventBus-registered handlers only.
 */
export type ApplicationDispatchHook = {
  dispatch(envelope: Parameters<EventHandler>[0]): Promise<
    Result<void, PlatformError>
  >;
};

export class ConsumerRuntime {
  readonly #bus: BrokerEventBus;
  readonly #inbox: InboxRuntime;
  readonly #clock: Clock;
  readonly #logger: Logger;
  readonly #config: MessagingConfig;
  readonly #retry: RetryEngine;
  readonly #metrics: MessagingMetrics | null;
  readonly #tracer: Tracer | null;
  readonly #application: ApplicationDispatchHook | null;
  readonly #consumerName: string;

  constructor(options: {
    readonly bus: BrokerEventBus;
    readonly inbox: InboxRuntime;
    readonly clock: Clock;
    readonly logger: Logger;
    readonly config: MessagingConfig;
    readonly metrics?: MessagingMetrics;
    readonly tracer?: Tracer;
    readonly application?: ApplicationDispatchHook;
    readonly consumerName?: string;
  }) {
    this.#bus = options.bus;
    this.#inbox = options.inbox;
    this.#clock = options.clock;
    this.#logger = options.logger;
    this.#config = options.config;
    this.#retry = new RetryEngine(options.config);
    this.#metrics = options.metrics ?? null;
    this.#tracer = options.tracer ?? null;
    this.#application = options.application ?? null;
    this.#consumerName = options.consumerName ?? "messaging-broker-consumer";
  }

  async pollOnce(): Promise<Result<ConsumerPollResult, PlatformError>> {
    const started = this.#clock.now().getTime();
    const claims = await this.#bus.broker.claim({
      batchSize: this.#config.batchSize,
      leaseMs: this.#config.claimLeaseMs,
      now: this.#clock.now(),
    });
    if (!claims.ok) {
      return claims;
    }

    let processed = 0;
    let duplicates = 0;
    let retried = 0;
    let deadLettered = 0;
    let failed = 0;

    const workers = Math.max(1, this.#config.consumerConcurrency);
    const queue = [...claims.value];

    const runOne = async (): Promise<void> => {
      while (queue.length > 0) {
        const claim = queue.shift();
        if (!claim) {
          return;
        }
        const outcome = await this.#processClaim(claim.message.id, claim.message);
        if (outcome === "processed") processed += 1;
        else if (outcome === "duplicate") duplicates += 1;
        else if (outcome === "retried") retried += 1;
        else if (outcome === "dead_lettered") deadLettered += 1;
        else failed += 1;
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(workers, claims.value.length || 1) }, () =>
        runOne(),
      ),
    );

    const pending = await this.#bus.broker.pendingDepth();
    if (pending.ok) {
      this.#metrics?.lag(pending.value);
    }
    this.#metrics?.throughput(processed);
    this.#metrics?.latency(this.#clock.now().getTime() - started);

    return ok({
      claimed: claims.value.length,
      processed,
      duplicates,
      retried,
      deadLettered,
      failed,
    });
  }

  async #processClaim(
    brokerId: string,
    message: {
      readonly envelope: Parameters<EventHandler>[0];
      readonly attempts: number;
      readonly topic: string;
    },
  ): Promise<
    "processed" | "duplicate" | "retried" | "dead_lettered" | "failed"
  > {
    const correlation = propagateCorrelation(message.envelope);
    const eventId =
      correlation.eventId ?? message.envelope.messageId;

    const process = async (): Promise<
      "processed" | "duplicate" | "retried" | "dead_lettered" | "failed"
    > => {
      const claim = await this.#inbox.claim(this.#consumerName, eventId);
      if (!claim.ok) {
        await this.#failDelivery(
          brokerId,
          message.attempts,
          claim.error.message,
          false,
        );
        return "failed";
      }
      if (claim.value.kind === "duplicate") {
        await this.#bus.broker.acknowledge(brokerId);
        return "duplicate";
      }

      const handlers = this.#bus.matchingHandlers(message.topic);
      const errors: string[] = [];

      if (this.#application) {
        const appResult = await this.#application.dispatch(message.envelope);
        if (!appResult.ok) {
          errors.push(appResult.error.message);
        }
      }

      for (const handler of handlers) {
        try {
          const result = await handler(message.envelope);
          if (!result.ok) {
            errors.push(result.error.message);
          }
        } catch (error) {
          errors.push(String(error));
        }
      }

      if (errors.length === 0) {
        if (this.#config.acknowledgement === "manual" || this.#config.acknowledgement === "auto") {
          await this.#bus.broker.acknowledge(brokerId);
        }
        return "processed";
      }

      const poison =
        errors.some((e) => e.includes("poison")) ||
        (message.attempts + 1 >= this.#config.poisonThreshold &&
          errors.every((e) => e.includes("non_retryable")));

      const decision = await this.#failDelivery(
        brokerId,
        message.attempts,
        errors.join("; "),
        poison,
      );
      return decision;
    };

    if (this.#tracer) {
      const spanOptions = {
        attributes: {
          topic: message.topic,
          eventId,
          brokerId,
        },
        ...(correlation.correlationId
          ? { correlationId: CorrelationId.from(correlation.correlationId) }
          : {}),
      };
      return this.#tracer.withSpan("messaging.consume", spanOptions, () =>
        process(),
      );
    }
    return process();
  }

  async #failDelivery(
    brokerId: string,
    attempts: number,
    errorMessage: string,
    poison: boolean,
  ): Promise<"retried" | "dead_lettered" | "failed"> {
    const decision = this.#retry.decide({
      attempts,
      errorMessage,
      now: this.#clock.now(),
      poison,
    });

    if (decision.kind === "retry") {
      const scheduled = await this.#bus.broker.scheduleRetry({
        brokerId,
        attempts: decision.attempts,
        nextAttemptAt: decision.nextAttemptAt,
        errorMessage,
      });
      if (!scheduled.ok) {
        this.#logger.error("Failed to schedule consumer retry", {
          brokerId,
          error: scheduled.error.message,
        });
        return "failed";
      }
      this.#metrics?.retry("consumer");
      return "retried";
    }

    const dlq = await this.#bus.broker.moveToDeadLetter({
      brokerId,
      reason: decision.reason,
      attempts: decision.attempts,
      diagnostics: {
        consumerName: this.#consumerName,
        poison,
      },
    });
    if (!dlq.ok) {
      return "failed";
    }
    this.#metrics?.dlq("consumer");
    this.#logger.error("Consumer message dead-lettered", {
      brokerId,
      reason: decision.reason,
      attempts: decision.attempts,
    });
    return "dead_lettered";
  }

  async readiness(): Promise<Result<void, PlatformError>> {
    const health = await this.#bus.broker.healthCheck();
    if (!health.ok) {
      return health;
    }
    if (!health.value.healthy) {
      return fail(
        new InfrastructureError("Consumer broker not ready", {
          code: "consumer_not_ready",
        }),
      );
    }
    return ok(undefined);
  }
}
