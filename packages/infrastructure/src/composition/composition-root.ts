/**
 * Enterprise runtime composition root — infrastructure wiring only.
 * No business services, APIs, or domain engines.
 */

import {
  SystemUtcClock,
  type Clock,
  type Logger,
  type Metrics,
  type Tracer,
} from "@afh/shared-kernel";
import {
  createInMemoryPersistenceFoundation,
  type PersistenceFoundation,
} from "@afh/persistence";
import {
  DEFAULT_INFRASTRUCTURE_CONFIG,
  MapConfigurationSource,
  MapSecretProvider,
  bindInfrastructureConfig,
  type InfrastructureConfig,
} from "../configuration/configuration.js";
import type { ConfigurationSource, SecretProvider } from "@afh/shared-kernel";
import { ConsoleLogger } from "../logging/logging.js";
import { InMemoryMetrics } from "../metrics/metrics.js";
import { InMemoryTracer } from "../tracing/tracing.js";
import {
  createSerializationRuntime,
  type SerializationRuntime,
} from "../serialization/serialization.js";
import { InMemoryEventBus, type EventBus } from "../event-bus/event-bus.js";
import {
  OutboxDispatcher,
  DEFAULT_OUTBOX_RETRY_POLICY,
} from "../outbox/outbox-dispatcher.js";
import { InboxRuntime } from "../inbox/inbox-runtime.js";
import {
  createDatabaseProviderFromPersistence,
  type DatabaseProvider,
} from "../database/database-provider.js";
import {
  HealthRegistry,
  createConfigurationHealthProbe,
  createDatabaseHealthProbe,
  createEventBusHealthProbe,
} from "../health/health.js";

export type InfrastructureRuntime = {
  readonly config: InfrastructureConfig;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly metrics: Metrics;
  readonly tracer: Tracer;
  readonly secrets: SecretProvider;
  readonly serialization: SerializationRuntime;
  readonly persistence: PersistenceFoundation;
  readonly database: DatabaseProvider;
  readonly eventBus: EventBus;
  readonly outboxDispatcher: OutboxDispatcher;
  readonly inbox: InboxRuntime;
  readonly health: HealthRegistry;
  dispose(): void;
};

export type CreateInfrastructureRuntimeOptions = {
  readonly config?: Partial<InfrastructureConfig>;
  readonly configSource?: ConfigurationSource;
  readonly secrets?: SecretProvider;
  readonly clock?: Clock;
  readonly logger?: Logger;
  readonly metrics?: Metrics;
  readonly tracer?: Tracer;
  readonly persistence?: PersistenceFoundation;
};

/**
 * Wires persistence, outbox→bus publisher path, inbox idempotency,
 * observability, serialization, and health probes.
 */
export function createInfrastructureRuntime(
  options: CreateInfrastructureRuntimeOptions = {},
): InfrastructureRuntime {
  const source =
    options.configSource ??
    new MapConfigurationSource({
      ...DEFAULT_INFRASTRUCTURE_CONFIG,
      ...options.config,
    });

  const bound = bindInfrastructureConfig(source, {
    ...DEFAULT_INFRASTRUCTURE_CONFIG,
    ...options.config,
  });
  const config = bound.ok
    ? bound.value
    : { ...DEFAULT_INFRASTRUCTURE_CONFIG, ...options.config };

  const clock = options.clock ?? new SystemUtcClock();
  const logger =
    options.logger ??
    new ConsoleLogger(config.logLevel, {
      service: config.serviceName,
      environment: config.environment,
    });
  const metrics = options.metrics ?? new InMemoryMetrics();
  const tracer = options.tracer ?? new InMemoryTracer();
  const secrets = options.secrets ?? new MapSecretProvider();
  const serialization = createSerializationRuntime();

  const persistence =
    options.persistence ?? createInMemoryPersistenceFoundation({ clock });

  const database = createDatabaseProviderFromPersistence(persistence);
  const eventBus = new InMemoryEventBus(serialization.event);
  const outboxDispatcher = new OutboxDispatcher({
    store: persistence.outboxStore,
    bus: eventBus,
    clock,
    logger,
    policy: {
      ...DEFAULT_OUTBOX_RETRY_POLICY,
      maxAttempts: config.outboxMaxAttempts,
    },
    batchSize: config.outboxBatchSize,
  });
  const inbox = new InboxRuntime(persistence.inboxStore, clock);

  const health = new HealthRegistry();
  health.register(createDatabaseHealthProbe(database));
  health.register(createEventBusHealthProbe(eventBus));
  health.register(createConfigurationHealthProbe(config));

  logger.info("Infrastructure runtime initialized", {
    service: config.serviceName,
    environment: config.environment,
    eventBusEnabled: config.eventBusEnabled,
  });

  return {
    config,
    clock,
    logger,
    metrics,
    tracer,
    secrets,
    serialization,
    persistence,
    database,
    eventBus,
    outboxDispatcher,
    inbox,
    health,
    dispose() {
      logger.info("Infrastructure runtime disposed", {
        service: config.serviceName,
      });
    },
  };
}
