/**
 * Enterprise API host — startup, health registration, graceful shutdown.
 * No business logic.
 */

import { seedPlatformDefinitions } from "@afh/platform";
import type { RouteDefinition } from "../transport/contracts.js";
import {
  createNodeHttpServer,
  type NodeHttpServerHandle,
} from "../transport/node-http.js";
import { createAllRoutes, type RouteDeps } from "../routes/routes.js";
import {
  createEnterpriseComposition,
  type CreateEnterpriseCompositionOptions,
  type EnterpriseComposition,
} from "../composition/composition-root.js";
import { createDamUploadRouter } from "../upload/upload-router.js";
import {
  allowAllRateLimitHook,
  type RateLimitHook,
} from "../rate-limit/rate-limit.js";
import {
  DEFAULT_VERSION_CATALOG,
  type ApiVersionCatalog,
} from "../versioning/versioning.js";
import type { StreamingHook } from "../streaming/streaming.js";
import { API_SERVICE_NAME } from "../constants.js";

export type CreateApiHostOptions = CreateEnterpriseCompositionOptions & {
  readonly host?: string;
  readonly port?: number;
  readonly corsOrigin?: string;
  readonly rateLimit?: RateLimitHook;
  readonly versionCatalog?: ApiVersionCatalog;
  readonly streaming?: StreamingHook;
  /** When false, OpenAPI document route is not registered (RC5.4). */
  readonly exposeOpenApi?: boolean;
};

export type ApiHost = {
  readonly composition: EnterpriseComposition;
  readonly routes: readonly RouteDefinition[];
  readonly http: NodeHttpServerHandle;
  readonly started: boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
};

/**
 * Creates the enterprise API host.
 * Controllers remain thin; all mutations/queries go through Application Runtime.
 */
export function createApiHost(options: CreateApiHostOptions): ApiHost {
  const composition = createEnterpriseComposition(options);
  let started = false;

  const uploadRouter = createDamUploadRouter(
    options.repositories.damAssets,
    composition.infrastructure.clock,
  );

  const routeDeps: RouteDeps = {
    runtime: composition.runtime,
    identity: composition.identity,
    health: composition.infrastructure.health,
    uploadRouter,
    rateLimit: options.rateLimit ?? allowAllRateLimitHook,
    observability: {
      logger: composition.infrastructure.logger,
      metrics: composition.infrastructure.metrics,
      tracer: composition.infrastructure.tracer,
    },
    versionCatalog: options.versionCatalog ?? DEFAULT_VERSION_CATALOG,
    startedAt: composition.infrastructure.clock.now(),
    startupReady: () => started,
    exposeOpenApi: options.exposeOpenApi ?? true,
  };

  // Optional streaming hook reserved for future stream routes.
  void options.streaming;

  const routes = createAllRoutes(routeDeps);
  const httpOptions: {
    routes: readonly RouteDefinition[];
    host?: string;
    port?: number;
    corsOrigin?: string;
  } = { routes };
  if (options.host !== undefined) {
    httpOptions.host = options.host;
  }
  if (options.port !== undefined) {
    httpOptions.port = options.port;
  }
  if (options.corsOrigin !== undefined) {
    httpOptions.corsOrigin = options.corsOrigin;
  }
  const http = createNodeHttpServer(httpOptions);

  composition.infrastructure.logger.info("api.host.created", {
    service: API_SERVICE_NAME,
    routeCount: routes.length,
  });

  return {
    composition,
    routes,
    http,
    get started() {
      return started;
    },
    async start() {
      // RC6.1 — register default workflow/approval definitions before serving.
      const seeded = await seedPlatformDefinitions({
        workflow: composition.platform.workflow,
        approval: composition.platform.approval,
        audit: composition.identity.audit,
      });
      if (!seeded.ok) {
        composition.infrastructure.logger.error(
          "api.host.definitions_seed_failed",
          {
            service: API_SERVICE_NAME,
            code: seeded.error.code,
            message: seeded.error.message,
          },
        );
        throw seeded.error;
      }
      composition.infrastructure.logger.info("api.host.definitions_seeded", {
        service: API_SERVICE_NAME,
        catalogVersion: seeded.value.catalogVersion,
        workflowsCreated: seeded.value.workflows.created,
        workflowsExisting: seeded.value.workflows.existing,
        approvalsCreated: seeded.value.approvals.created,
        approvalsExisting: seeded.value.approvals.existing,
      });

      await http.start();
      started = true;
      composition.infrastructure.logger.info("api.host.started", {
        service: API_SERVICE_NAME,
        host: http.host,
        port: (http.server.address() as { port?: number } | null)?.port ?? http.port,
      });
    },
    async stop() {
      started = false;
      composition.infrastructure.logger.info("api.host.stopped", {
        service: API_SERVICE_NAME,
      });
      await http.stop();
      composition.dispose();
    },
  };
}
