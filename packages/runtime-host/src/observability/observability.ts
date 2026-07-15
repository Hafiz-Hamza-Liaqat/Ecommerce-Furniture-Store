/**
 * Production observability registration — uses existing 0F contracts.
 * No vendor lock-in.
 */

import {
  ConsoleLogger,
  InMemoryMetrics,
  InMemoryTracer,
} from "@afh/infrastructure";
import type { Logger, Metrics, Tracer } from "@afh/shared-kernel";
import type { ProductionRuntimeConfig } from "../config/runtime-config.js";

export type ProductionObservability = {
  readonly logger: Logger;
  readonly metrics: Metrics;
  readonly tracer: Tracer;
};

/**
 * Configures structured logging (with redaction), metrics, and tracing for production.
 */
export function createProductionObservability(
  config: ProductionRuntimeConfig,
): ProductionObservability {
  const logger = new ConsoleLogger(config.logLevel, {
    service: config.serviceName,
    environment: config.profile,
  });
  const metrics = new InMemoryMetrics();
  const tracer = new InMemoryTracer();

  // Register baseline enterprise metric series (counters/gauges created lazily on use).
  metrics.counter("runtime.startup").add(0);
  metrics.counter("runtime.shutdown").add(0);
  metrics.gauge("runtime.ready").set(0);
  metrics.counter("messaging.outbox.published");
  metrics.counter("security.auth.login.success");

  logger.info("Production observability registered", {
    logLevel: config.logLevel,
    profile: config.profile,
  });

  return { logger, metrics, tracer };
}
