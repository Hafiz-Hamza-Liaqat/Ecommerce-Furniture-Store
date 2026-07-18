/**
 * Production composition root — wires SQL, broker, identity providers, API host.
 * Phase 9B: resilience knobs, integrity probe, startup schema verification.
 * No business logic.
 */

import {
  createApiHost,
  createInMemoryRateLimitHook,
  type ApiHost,
  type EnterpriseModuleRepositories,
} from "@afh/api";
import { InboxRuntime } from "@afh/infrastructure";
import { createMessagingRuntime, type MessagingRuntime } from "@afh/messaging-broker";
import {
  createIntegrityHealthProbe,
  createMigrationHealthProbe,
  createSqlPersistenceFoundation,
  createTransactionHealthProbe,
  type SqlPersistenceFoundation,
} from "@afh/persistence-sql";
import { SystemUtcClock, isFail, type Logger } from "@afh/shared-kernel";
import {
  assertProductionRuntimeConfig,
  loadProductionRuntimeConfig,
  type ProductionRuntimeConfig,
} from "../config/runtime-config.js";
import {
  createInboxHealthProbe,
  createOutboxDispatcherHealthProbe,
  createOutboxHealthProbe,
  createSecretsHealthProbe,
} from "../health/production-health.js";
import { verifyStartupSchema } from "../hardening/sql-validation.js";
import {
  createDeploymentLifecycle,
  installGracefulShutdown,
  type DeploymentLifecycle,
} from "../lifecycle/deployment.js";
import { createProductionObservability } from "../observability/observability.js";
import {
  loadProductionSecrets,
  validateProductionSecrets,
} from "../secrets/load-secrets.js";
import { validateStartup } from "../validation/startup-validation.js";

export const RUNTIME_HOST_VERSION = "0.1.0";

export type ProductionHost = {
  readonly config: ProductionRuntimeConfig;
  readonly sql: SqlPersistenceFoundation;
  readonly messaging: MessagingRuntime;
  readonly api: ApiHost;
  readonly lifecycle: DeploymentLifecycle;
  readonly logger: Logger;
  dispose(): Promise<void>;
};

export type CreateProductionHostOptions = {
  readonly config?: Partial<ProductionRuntimeConfig>;
  readonly env?: NodeJS.ProcessEnv;
  /** When false, skips listen — useful for validation-only composition. */
  readonly autoStart?: boolean;
};

function toEnterpriseRepositories(
  sql: SqlPersistenceFoundation,
): EnterpriseModuleRepositories {
  const repos = sql.repositories;
  return {
    sales: repos.sales,
    procurement: repos.procurement,
    inventory: repos.inventory,
    finance: repos.finance,
    projects: repos.projects,
    service: repos.service,
    crm: repos.crm,
    collaboration: repos.collaboration,
    damAssets: repos.damAssets,
  };
}

/**
 * Creates the full production runtime: SQL + broker + security + API.
 * Registers Phase 0F-aligned health probes and validates startup.
 */
export async function createProductionHost(
  options: CreateProductionHostOptions = {},
): Promise<ProductionHost> {
  const config = loadProductionRuntimeConfig(options.config ?? {});
  assertProductionRuntimeConfig(config);

  const observability = createProductionObservability(config);
  const { logger, metrics, tracer } = observability;

  const rawSecrets = loadProductionSecrets(options.env ?? process.env);
  const secretsResult = await validateProductionSecrets(rawSecrets, {
    requireAll: config.requireSecrets,
    allowEphemeralJwt: config.profile === "development" || !config.requireSecrets,
  });
  if (isFail(secretsResult)) {
    throw secretsResult.error;
  }
  const secrets = secretsResult.value.provider;
  if (secretsResult.value.ephemeralJwt) {
    logger.warn("Using ephemeral JWT signing key (development only)");
  }

  const clock = new SystemUtcClock();
  const sql = createSqlPersistenceFoundation({
    config: {
      databasePath: config.databasePath,
      busyTimeoutMs: config.busyTimeoutMs,
      defaultOutboxBatchSize: config.outboxBatchSize,
    },
    clock,
  });

  const schema = await verifyStartupSchema(sql, {
    expectedBusyTimeoutMs: config.busyTimeoutMs,
    requireIntegrity: config.integrityCheckOnStartup,
  });
  if (isFail(schema)) {
    sql.dispose();
    throw schema.error;
  }
  logger.info("Startup schema verification passed", {
    checked: schema.value.checked.join(","),
  });

  const messagingInbox = new InboxRuntime(sql.inboxStore, clock);
  const messaging = createMessagingRuntime({
    logger,
    metrics,
    tracer,
    inbox: messagingInbox,
    config: {
      brokerDatabasePath: config.brokerDatabasePath,
      brokerEndpoint: config.brokerEndpoint,
      maxAttempts: config.messagingMaxAttempts,
      backoffMs: config.messagingBackoffMs,
      consumerConcurrency: config.messagingConsumerConcurrency,
      batchSize: config.messagingBatchSize,
      poisonThreshold: config.messagingPoisonThreshold,
      claimLeaseMs: config.messagingClaimLeaseMs,
    },
  });

  const api = createApiHost({
    repositories: toEnterpriseRepositories(sql),
    infrastructure: {
      config: {
        serviceName: config.serviceName,
        environment: config.profile,
        logLevel: config.logLevel,
        outboxBatchSize: config.outboxBatchSize,
        outboxMaxAttempts: config.outboxMaxAttempts,
        eventBusEnabled: config.eventBusEnabled,
      },
      secrets,
      logger,
      metrics,
      tracer,
      persistence: sql,
      persistenceAdapter: "sql",
      eventBus: messaging.eventBus,
      messagingAdapter: "broker",
    },
    identity: {
      store: sql.identityStore,
      auditStore: sql.securityAuditStore,
    },
    platform: {
      workflowStore: sql.workflowStore,
      approvalStore: sql.approvalStore,
    },
    security: { enabled: true },
    host: config.host,
    port: config.port,
    corsOrigin: config.corsOrigin,
    rateLimit: createInMemoryRateLimitHook(),
    exposeOpenApi: config.exposeOpenApi,
  });

  const health = api.composition.infrastructure.health;
  health.register(createMigrationHealthProbe(sql));
  health.register(createTransactionHealthProbe(sql));
  health.register(createIntegrityHealthProbe(sql));
  for (const probe of messaging.healthProbes) {
    health.register(probe);
  }
  health.register(createOutboxHealthProbe(sql.outboxStore));
  health.register(createInboxHealthProbe(sql.inboxStore));
  health.register(createSecretsHealthProbe(secrets));
  health.register(
    createOutboxDispatcherHealthProbe(
      api.composition.infrastructure.outboxDispatcher,
    ),
  );

  const startup = await validateStartup(
    {
      config,
      sql,
      messaging,
      host: api,
      packageVersion: RUNTIME_HOST_VERSION,
    },
    logger,
  );
  if (isFail(startup)) {
    messaging.dispose();
    sql.dispose();
    throw startup.error;
  }

  const lifecycle = createDeploymentLifecycle({
    host: api,
    messaging,
    logger,
    shutdownTimeoutMs: config.shutdownTimeoutMs,
    onBeforeStop: async () => {
      metrics.counter("runtime.shutdown").add(1);
      try {
        await api.composition.infrastructure.outboxDispatcher.dispatchOnce();
      } catch (error) {
        logger.warn("Outbox drain during shutdown failed", {
          error: String(error),
        });
      }
    },
  });

  const consumerIntervalMs = 2_000;
  const outboxIntervalMs = 5_000;
  let consumerTimer: ReturnType<typeof setInterval> | null = null;
  let outboxTimer: ReturnType<typeof setInterval> | null = null;

  const stopBackgroundWorkers = () => {
    if (consumerTimer) clearInterval(consumerTimer);
    if (outboxTimer) clearInterval(outboxTimer);
    consumerTimer = null;
    outboxTimer = null;
  };

  const startBackgroundWorkers = () => {
    consumerTimer = setInterval(() => {
      void messaging.consumer.pollOnce().catch((error: unknown) => {
        logger.warn("Consumer poll failed", { error: String(error) });
      });
    }, consumerIntervalMs);
    outboxTimer = setInterval(() => {
      void api.composition.infrastructure.outboxDispatcher
        .dispatchOnce()
        .catch((error: unknown) => {
          logger.warn("Outbox dispatch failed", { error: String(error) });
        });
    }, outboxIntervalMs);
  };

  const dispose = async () => {
    stopBackgroundWorkers();
    metrics.gauge("runtime.ready").set(0);
    await lifecycle.stop();
    sql.dispose();
  };

  installGracefulShutdown(logger, dispose);

  metrics.counter("runtime.startup").add(1);
  logger.info("Production host composed", {
    profile: config.profile,
    persistence: "sql",
    messaging: "broker",
    security: "enabled",
    hardening: "phase-9b",
  });

  if (options.autoStart !== false) {
    await lifecycle.start();
    startBackgroundWorkers();
    metrics.gauge("runtime.ready").set(1);
  }

  return {
    config,
    sql,
    messaging,
    api,
    lifecycle,
    logger,
    dispose,
  };
}
