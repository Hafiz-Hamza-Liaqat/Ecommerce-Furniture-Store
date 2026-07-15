/**
 * Messaging composition — production broker + Event Bus + consumer runtime.
 */

import {
  createSerializationRuntime,
  type EventBus,
  type HealthProbe,
  type InboxRuntime,
  type JsonSerializer,
} from "@afh/infrastructure";
import type {
  Clock,
  ConfigurationSource,
  Logger,
  Metrics,
  Tracer,
} from "@afh/shared-kernel";
import { SystemUtcClock } from "@afh/shared-kernel";
import { DurableMessageBroker } from "../broker/durable-broker.js";
import { BrokerEventBus } from "../bus/broker-event-bus.js";
import {
  bindMessagingConfig,
  DEFAULT_MESSAGING_CONFIG,
  type MessagingConfig,
} from "../config/messaging-config.js";
import {
  ConsumerRuntime,
  type ApplicationDispatchHook,
} from "../consumer/consumer-runtime.js";
import { DurableDeadLetterQueue } from "../dlq/dead-letter-queue.js";
import {
  createBrokerConnectivityHealthProbe,
  createConsumerReadinessHealthProbe,
  createDlqAvailabilityHealthProbe,
  createPublishCapabilityHealthProbe,
} from "../health/messaging-health.js";
import { MessagingMetrics } from "../observability/messaging-metrics.js";

export type MessagingRuntime = {
  readonly config: MessagingConfig;
  readonly broker: DurableMessageBroker;
  readonly eventBus: BrokerEventBus;
  readonly dlq: DurableDeadLetterQueue;
  readonly consumer: ConsumerRuntime;
  readonly metrics: MessagingMetrics;
  readonly healthProbes: readonly HealthProbe[];
  dispose(): void;
};

export type CreateMessagingRuntimeOptions = {
  readonly config?: Partial<MessagingConfig>;
  readonly configSource?: ConfigurationSource;
  readonly clock?: Clock;
  readonly logger: Logger;
  readonly metrics: Metrics;
  readonly tracer?: Tracer;
  readonly inbox: InboxRuntime;
  readonly serializer?: JsonSerializer;
  readonly application?: ApplicationDispatchHook;
  readonly consumerName?: string;
};

/**
 * Creates production durable broker-backed Event Bus + consumer runtime.
 * Wire `eventBus` into `createInfrastructureRuntime({ eventBus })`.
 */
export function createMessagingRuntime(
  options: CreateMessagingRuntimeOptions,
): MessagingRuntime {
  const config = options.configSource
    ? bindMessagingConfig(options.configSource, options.config ?? {})
    : {
        ...DEFAULT_MESSAGING_CONFIG,
        ...options.config,
        backoffMs:
          options.config?.backoffMs ?? DEFAULT_MESSAGING_CONFIG.backoffMs,
      };

  const clock = options.clock ?? new SystemUtcClock();
  const serializer =
    options.serializer ?? createSerializationRuntime().event;
  const messagingMetrics = new MessagingMetrics(options.metrics);

  const broker = new DurableMessageBroker({
    databasePath: config.brokerDatabasePath,
    endpoint: config.brokerEndpoint,
  });
  const dlq = new DurableDeadLetterQueue(broker);
  const eventBus = new BrokerEventBus({
    broker,
    dlq,
    serializer,
    metrics: messagingMetrics,
  });
  const consumer = new ConsumerRuntime({
    bus: eventBus,
    inbox: options.inbox,
    clock,
    logger: options.logger,
    config,
    metrics: messagingMetrics,
    ...(options.tracer ? { tracer: options.tracer } : {}),
    ...(options.application ? { application: options.application } : {}),
    ...(options.consumerName ? { consumerName: options.consumerName } : {}),
  });

  const healthProbes: HealthProbe[] = [
    createBrokerConnectivityHealthProbe(eventBus),
    createPublishCapabilityHealthProbe(eventBus),
    createConsumerReadinessHealthProbe(consumer),
    createDlqAvailabilityHealthProbe(dlq, messagingMetrics),
  ];

  return {
    config,
    broker,
    eventBus,
    dlq,
    consumer,
    metrics: messagingMetrics,
    healthProbes,
    dispose() {
      broker.dispose();
    },
  };
}

export type MessagingAdapterSelection = "memory" | "broker";

/**
 * Helper: select Event Bus adapter for infrastructure composition.
 * When `broker`, returns messaging runtime EventBus; otherwise null (use default in-memory).
 */
export function resolveEventBusAdapter(
  selection: MessagingAdapterSelection,
  messaging: MessagingRuntime | null,
): EventBus | undefined {
  if (selection === "broker" && messaging) {
    return messaging.eventBus;
  }
  return undefined;
}
