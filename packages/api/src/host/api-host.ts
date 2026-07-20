/**
 * Enterprise API host — startup, health registration, graceful shutdown.
 * No business logic.
 */

import { seedRbacCatalog } from "@afh/identity";
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
  /** Dev/test only — challenge routes may return opaque tokens. */
  readonly revealChallengeTokens?: boolean;
  /** Prefer X-Forwarded-For for audit IP when behind a trusted proxy. */
  readonly trustProxy?: boolean;
  /** Emit Strict-Transport-Security when true (TLS-terminated production). */
  readonly enableHsts?: boolean;
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

  const uploadRouter = createDamUploadRouter({
    assets: options.repositories.damAssets,
    versions: options.repositories.damVersions,
    objectStore: options.repositories.damObjectStore,
    clock: composition.infrastructure.clock,
  });

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
    revealChallengeTokens: options.revealChallengeTokens === true,
    trustProxy: options.trustProxy === true,
  };

  // Optional streaming hook reserved for future stream routes.
  void options.streaming;

  const routes = createAllRoutes(routeDeps);
  const httpOptions: {
    routes: readonly RouteDefinition[];
    host?: string;
    port?: number;
    corsOrigin?: string;
    enableHsts?: boolean;
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
  if (options.enableHsts === true) {
    httpOptions.enableHsts = true;
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
      // RC5.1 — idempotent RBAC catalog seed so existing DBs pick up new
      // permissions (e.g. hr.employees.*, jobs.jobs.*) on admin/system roles.
      const rbacSeeded = await seedRbacCatalog({
        store: composition.identity.store,
        audit: composition.identity.audit,
      });
      if (!rbacSeeded.ok) {
        composition.infrastructure.logger.error(
          "api.host.rbac_catalog_seed_failed",
          {
            service: API_SERVICE_NAME,
            code: rbacSeeded.error.code,
            message: rbacSeeded.error.message,
          },
        );
        throw rbacSeeded.error;
      }
      composition.infrastructure.logger.info("api.host.rbac_catalog_seeded", {
        service: API_SERVICE_NAME,
        catalogVersion: rbacSeeded.value.catalogVersion,
        permissionsCreated:
          rbacSeeded.value.canonicalPermissions.created +
          rbacSeeded.value.platformPermissions.created +
          rbacSeeded.value.apiPermissions.created +
          rbacSeeded.value.routePermissions.created +
          rbacSeeded.value.legacyCompatibilityPermissions.created,
        rolePermissionLinksCreated:
          rbacSeeded.value.rolePermissionLinks.created,
      });

      // RC6.1 — register default workflow/approval definitions before serving.
      const seeded = await seedPlatformDefinitions({
        workflow: composition.platform.workflow,
        approval: composition.platform.approval,
        rules: composition.platform.rules,
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
        rulesCatalogVersion: seeded.value.rulesCatalogVersion,
        workflowsCreated: seeded.value.workflows.created,
        workflowsExisting: seeded.value.workflows.existing,
        approvalsCreated: seeded.value.approvals.created,
        approvalsExisting: seeded.value.approvals.existing,
        rulesCreated: seeded.value.rules.created,
        rulesExisting: seeded.value.rules.existing,
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
