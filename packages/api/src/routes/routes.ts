/**
 * Thin route handlers — dispatch only; no business logic.
 */

import type { ApplicationRuntime } from "@afh/application";
import type { IdentityFoundation } from "@afh/identity";
import type { HealthRegistry } from "@afh/infrastructure";
import { AuthorizationError } from "@afh/shared-kernel";
import {
  API_PACKAGE_VERSION,
  API_SERVICE_NAME,
  ApiPaths,
  DEFAULT_API_VERSION,
  IdempotencyHeader,
} from "../constants.js";
import {
  authenticateRequest,
  type TransportAuthContext,
} from "../auth/authentication.js";
import {
  platformErrorResponse,
  unauthorizedResponse,
  validationIssuesResponse,
} from "../errors/exception-mapping.js";
import {
  parseJsonBody,
  validateDispatchCommandDto,
  validateDispatchQueryDto,
  validateUploadRequestDto,
} from "../dto/validation.js";
import type {
  DispatchCommandRequestDto,
  DispatchQueryRequestDto,
  UploadRequestDto,
} from "../dto/dto.js";
import {
  headerValue,
  jsonResponse,
  type RouteDefinition,
  type TransportRequest,
  type TransportResponse,
} from "../transport/contracts.js";
import { buildCommand, buildQuery } from "../transport/messaging.js";
import type { RateLimitHook } from "../rate-limit/rate-limit.js";
import type { UploadRouter } from "../upload/upload-router.js";
import { buildOpenApiDocument } from "../openapi/openapi.js";
import type { ApiVersionCatalog } from "../versioning/versioning.js";
import type { CxWorkspaceStore } from "../cx-sync/workspace-store.js";
import {
  recordTransportMetrics,
  withTransportSpan,
  type TransportObservability,
} from "../observability/observability.js";

export type RouteDeps = {
  readonly runtime: ApplicationRuntime;
  readonly identity: IdentityFoundation;
  readonly health: HealthRegistry;
  readonly uploadRouter: UploadRouter;
  readonly rateLimit: RateLimitHook;
  readonly observability: TransportObservability;
  readonly versionCatalog: ApiVersionCatalog;
  readonly startedAt: Date;
  readonly startupReady: () => boolean;
  /**
   * When false, GET /api/v1/openapi.json is not registered (RC5.4 prod lockdown).
   * Defaults to true for development/test hosts.
   */
  readonly exposeOpenApi?: boolean;
  /**
   * When true, auth challenge routes may return opaque tokens (dev/test only).
   * Production must leave this false / omit it.
   */
  readonly revealChallengeTokens?: boolean;
  /** Prefer X-Forwarded-For for audit IP when behind a trusted proxy. */
  readonly trustProxy?: boolean;
  /** RC10.5 — optional CX workspace snapshot store. */
  readonly workspaceStore?: CxWorkspaceStore;
};

async function applyRateLimit(
  deps: RouteDeps,
  request: TransportRequest,
  authRequired: boolean,
): Promise<
  | { ok: true; auth: TransportAuthContext }
  | { ok: false; response: TransportResponse }
> {
  const authResult = await authenticateRequest(deps.identity, request, {
    required: authRequired,
  });
  if (!authResult.ok) {
    const authCode = authResult.error.code ?? "";
    if (
      authCode === "unauthenticated" ||
      authCode === "session_invalid" ||
      authCode === "session_expired" ||
      authCode === "session_idle_expired" ||
      authCode === "session_absolute_expired" ||
      authCode === "session_refresh_expired"
    ) {
      return {
        ok: false,
        response: unauthorizedResponse(
          authResult.error.correlationId ?? null,
          authResult.error.message,
          authCode === "unauthenticated" ? "unauthenticated" : authCode,
        ),
      };
    }
    return {
      ok: false,
      response: platformErrorResponse(
        authResult.error,
        authResult.error.correlationId ?? null,
      ),
    };
  }

  const decision = await deps.rateLimit.evaluate({
    request,
    auth: authResult.value,
  });
  if (!decision.allowed) {
    return {
      ok: false,
      response: jsonResponse(
        429,
        {
          error: {
            code: "rate_limited",
            category: "authorization",
            message: decision.reason ?? "Rate limit exceeded",
            details: {},
            retryable: true,
            correlationId: authResult.value.correlationId,
          },
        },
        {
          "x-correlation-id": authResult.value.correlationId,
          ...(decision.retryAfterSeconds != null
            ? { "retry-after": String(decision.retryAfterSeconds) }
            : {}),
        },
      ),
    };
  }

  return { ok: true, auth: authResult.value };
}

export function createHealthRoutes(deps: RouteDeps): RouteDefinition[] {
  return [
    {
      method: "GET",
      path: ApiPaths.Live,
      authRequired: false,
      summary: "Liveness probe",
      tags: ["health"],
      async handler() {
        return jsonResponse(200, {
          status: "alive",
          service: API_SERVICE_NAME,
        });
      },
    },
    {
      method: "GET",
      path: ApiPaths.Ready,
      authRequired: false,
      summary: "Readiness probe",
      tags: ["health"],
      async handler() {
        const report = await deps.health.checkAll();
        if (!report.ok) {
          return platformErrorResponse(report.error, null);
        }
        const ready = report.value.status === "up";
        return jsonResponse(ready ? 200 : 503, {
          status: ready ? "ready" : "not_ready",
          checks: report.value.checks,
        });
      },
    },
    {
      method: "GET",
      path: ApiPaths.Startup,
      authRequired: false,
      summary: "Startup probe",
      tags: ["health"],
      async handler() {
        const ready = deps.startupReady();
        return jsonResponse(ready ? 200 : 503, {
          status: ready ? "started" : "starting",
          ready,
        });
      },
    },
    {
      method: "GET",
      path: ApiPaths.Version,
      authRequired: false,
      summary: "Service version",
      tags: ["health"],
      async handler() {
        return jsonResponse(200, {
          service: API_SERVICE_NAME,
          version: API_PACKAGE_VERSION,
          apiVersion: DEFAULT_API_VERSION,
        });
      },
    },
  ];
}

export function createDispatchRoutes(deps: RouteDeps): RouteDefinition[] {
  return [
    {
      method: "POST",
      path: ApiPaths.Commands,
      authRequired: true,
      summary: "Dispatch command through Application Runtime",
      tags: ["commands"],
      async handler(request) {
        const gated = await applyRateLimit(deps, request, true);
        if (!gated.ok) return gated.response;
        const auth = gated.auth;

        return withTransportSpan(
          deps.observability,
          "api.command",
          auth.correlationId,
          async () => {
            const started = Date.now();
            let body: unknown;
            try {
              body = parseJsonBody(request.bodyText);
            } catch {
              const response = validationIssuesResponse(
                [
                  {
                    field: "body",
                    code: "invalid_json",
                    message: "Body must be valid JSON",
                  },
                ],
                auth.correlationId,
              );
              recordTransportMetrics(
                deps.observability,
                request,
                response,
                Date.now() - started,
              );
              return response;
            }

            const validated = validateDispatchCommandDto(body);
            if (!validated.ok) {
              const response = validationIssuesResponse(
                validated.issues,
                auth.correlationId,
              );
              recordTransportMetrics(
                deps.observability,
                request,
                response,
                Date.now() - started,
              );
              return response;
            }

            const dto = body as DispatchCommandRequestDto;
            const idempotency =
              dto.idempotencyKey ??
              headerValue(request.headers, IdempotencyHeader);

            const command = buildCommand({
              commandType: dto.commandType,
              payload: dto.payload,
              correlationId: auth.correlationId,
              companyId: auth.companyId,
              actorId: auth.caller?.userId ?? null,
              idempotencyKey: idempotency,
              clock: deps.runtime.infrastructure.clock,
            });

            const result = await deps.runtime.commands.dispatch(command, {
              correlationId: auth.correlationId,
              userId: auth.caller?.userId ?? null,
              companyId: auth.companyId,
              branchId: auth.branchId,
            });

            const response = result.ok
              ? jsonResponse(
                  200,
                  {
                    ok: true,
                    data: result.value,
                    correlationId: auth.correlationId,
                  },
                  { "x-correlation-id": auth.correlationId },
                )
              : platformErrorResponse(result.error, auth.correlationId);

            recordTransportMetrics(
              deps.observability,
              request,
              response,
              Date.now() - started,
            );
            return response;
          },
        );
      },
    },
    {
      method: "POST",
      path: ApiPaths.Queries,
      authRequired: true,
      summary: "Dispatch query through Application Runtime",
      tags: ["queries"],
      async handler(request) {
        const gated = await applyRateLimit(deps, request, true);
        if (!gated.ok) return gated.response;
        const auth = gated.auth;

        return withTransportSpan(
          deps.observability,
          "api.query",
          auth.correlationId,
          async () => {
            const started = Date.now();
            let body: unknown;
            try {
              body = parseJsonBody(request.bodyText);
            } catch {
              const response = validationIssuesResponse(
                [
                  {
                    field: "body",
                    code: "invalid_json",
                    message: "Body must be valid JSON",
                  },
                ],
                auth.correlationId,
              );
              recordTransportMetrics(
                deps.observability,
                request,
                response,
                Date.now() - started,
              );
              return response;
            }

            const validated = validateDispatchQueryDto(body);
            if (!validated.ok) {
              const response = validationIssuesResponse(
                validated.issues,
                auth.correlationId,
              );
              recordTransportMetrics(
                deps.observability,
                request,
                response,
                Date.now() - started,
              );
              return response;
            }

            const dto = body as DispatchQueryRequestDto;
            const query = buildQuery({
              queryType: dto.queryType,
              payload: dto.payload,
              correlationId: auth.correlationId,
              companyId: auth.companyId,
              actorId: auth.caller?.userId ?? null,
              clock: deps.runtime.infrastructure.clock,
            });

            const result = await deps.runtime.queries.dispatch(query, {
              correlationId: auth.correlationId,
              userId: auth.caller?.userId ?? null,
              companyId: auth.companyId,
              branchId: auth.branchId,
            });

            const response = result.ok
              ? jsonResponse(
                  200,
                  {
                    ok: true,
                    data: result.value,
                    correlationId: auth.correlationId,
                  },
                  { "x-correlation-id": auth.correlationId },
                )
              : platformErrorResponse(result.error, auth.correlationId);

            recordTransportMetrics(
              deps.observability,
              request,
              response,
              Date.now() - started,
            );
            return response;
          },
        );
      },
    },
  ];
}

export function createUploadRoutes(deps: RouteDeps): RouteDefinition[] {
  return [
    {
      method: "POST",
      path: ApiPaths.Uploads,
      authRequired: true,
      summary: "Route file upload metadata to DAM",
      tags: ["uploads", "dam"],
      async handler(request) {
        const gated = await applyRateLimit(deps, request, true);
        if (!gated.ok) return gated.response;
        const auth = gated.auth;

        let body: unknown;
        try {
          body = parseJsonBody(request.bodyText);
        } catch {
          return validationIssuesResponse(
            [
              {
                field: "body",
                code: "invalid_json",
                message: "Body must be valid JSON",
              },
            ],
            auth.correlationId,
          );
        }

        const validated = validateUploadRequestDto(body);
        if (!validated.ok) {
          return validationIssuesResponse(validated.issues, auth.correlationId);
        }

        const dto = body as UploadRequestDto;
        if (
          auth.caller?.companyId &&
          dto.companyId !== auth.caller.companyId
        ) {
          return platformErrorResponse(
            new AuthorizationError("Upload companyId must match session company", {
              code: "company_mismatch",
              correlationId: auth.correlationId,
            }),
            auth.correlationId,
          );
        }

        if (!auth.caller?.userId) {
          return unauthorizedResponse(
            auth.correlationId,
            "Authenticated principal is required for uploads",
          );
        }

        const principal = await deps.identity.policyEngine.buildPrincipal(
          auth.caller.userId,
        );
        if (!principal) {
          return platformErrorResponse(
            new AuthorizationError("Active principal is required for uploads", {
              code: "principal_unavailable",
              correlationId: auth.correlationId,
            }),
            auth.correlationId,
          );
        }

        const uploadDecision = await deps.identity.policyEngine.evaluate(
          principal,
          "dam.assets.upload",
          {
            type: "digital_asset",
            id: null,
            companyId: dto.companyId,
            ownerUserId: auth.caller.userId,
            organizationId: null,
            branchId: null,
            attributes: {
              mimeType: dto.mimeType ?? null,
              assetType: dto.assetType ?? null,
              name: dto.name,
              folderId: dto.folderId ?? null,
            },
          },
          { correlationId: auth.correlationId },
        );
        if (!uploadDecision.allowed) {
          return platformErrorResponse(
            new AuthorizationError(uploadDecision.message, {
              code: uploadDecision.reasonCode,
              correlationId: auth.correlationId,
            }),
            auth.correlationId,
          );
        }

        const routed = await deps.uploadRouter.routeUpload({
          dto,
          uploadedByUserId: auth.caller.userId,
          // This HTTP contract accepts JSON metadata only. The JSON request
          // bytes are not an asset body and must never become a DAM version.
          rawBody: null,
        });

        if (!routed.ok) {
          return platformErrorResponse(routed.error, auth.correlationId);
        }

        return jsonResponse(
          202,
          {
            ok: true,
            data: routed.value,
            correlationId: auth.correlationId,
          },
          {
            "x-correlation-id": auth.correlationId,
          },
        );
      },
    },
  ];
}

export function createOpenApiRoute(
  deps: RouteDeps,
  routes: readonly RouteDefinition[],
): RouteDefinition {
  return {
    method: "GET",
    path: ApiPaths.OpenApi,
    authRequired: false,
    summary: "OpenAPI document",
    tags: ["documentation"],
    async handler() {
      return jsonResponse(
        200,
        buildOpenApiDocument(routes, deps.versionCatalog),
      );
    },
  };
}

import { createAuthRoutes } from "./auth-routes.js";
import { createCxSyncRoutes } from "../cx-sync/routes.js";
import { createMemoryCxWorkspaceStore } from "../cx-sync/workspace-store.js";

export function createAllRoutes(deps: RouteDeps): RouteDefinition[] {
  const routes: RouteDefinition[] = [
    ...createHealthRoutes(deps),
    ...createAuthRoutes(deps.identity, deps.rateLimit, {
      revealChallengeTokens: deps.revealChallengeTokens === true,
      trustProxy: deps.trustProxy === true,
    }),
    ...createDispatchRoutes(deps),
    ...createUploadRoutes(deps),
    ...createCxSyncRoutes({
      identity: deps.identity,
      rateLimit: deps.rateLimit,
      workspaceStore: deps.workspaceStore ?? createMemoryCxWorkspaceStore(),
    }),
  ];
  if (deps.exposeOpenApi !== false) {
    routes.push(createOpenApiRoute(deps, routes));
  }
  return routes;
}
