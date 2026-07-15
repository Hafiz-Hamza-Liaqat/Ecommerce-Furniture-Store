/**
 * Messaging health probes — broker, publish, consumer, DLQ.
 */

import type { HealthProbe } from "@afh/infrastructure";
import { ok } from "@afh/shared-kernel";
import type { BrokerEventBus } from "../bus/broker-event-bus.js";
import type { ConsumerRuntime } from "../consumer/consumer-runtime.js";
import type { DurableDeadLetterQueue } from "../dlq/dead-letter-queue.js";
import type { MessagingMetrics } from "../observability/messaging-metrics.js";

export function createBrokerConnectivityHealthProbe(
  bus: BrokerEventBus,
): HealthProbe {
  return {
    name: "messaging_broker",
    async check() {
      const health = await bus.broker.healthCheck();
      if (!health.ok) {
        return health;
      }
      return ok({
        name: "messaging_broker",
        status: health.value.healthy ? "up" : "down",
        detail: health.value.detail,
      });
    },
  };
}

export function createPublishCapabilityHealthProbe(
  bus: BrokerEventBus,
): HealthProbe {
  return {
    name: "messaging_publish",
    async check() {
      const ready = await bus.publishReadiness();
      if (!ready.ok) {
        return ready;
      }
      return ok({
        name: "messaging_publish",
        status: "up",
        detail: "ready",
      });
    },
  };
}

export function createConsumerReadinessHealthProbe(
  consumer: ConsumerRuntime,
): HealthProbe {
  return {
    name: "messaging_consumer",
    async check() {
      const ready = await consumer.readiness();
      if (!ready.ok) {
        return ready;
      }
      return ok({
        name: "messaging_consumer",
        status: "up",
        detail: "ready",
      });
    },
  };
}

export function createDlqAvailabilityHealthProbe(
  dlq: DurableDeadLetterQueue,
  metrics?: MessagingMetrics,
): HealthProbe {
  return {
    name: "messaging_dlq",
    async check() {
      const health = dlq.healthCheck();
      if (!health.ok) {
        return health;
      }
      const depth = dlq.depth();
      if (depth.ok) {
        metrics?.setDlqDepth(depth.value);
      }
      return ok({
        name: "messaging_dlq",
        status: "up",
        detail: health.value.detail,
      });
    },
  };
}
