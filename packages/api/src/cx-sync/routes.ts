/**
 * RC10.5 — Authenticated CX workspace sync routes (first CX cloud APIs).
 * Session-scoped only — no RBAC catalog changes.
 */

import type { IdentityFoundation } from "@afh/identity";
import { AuthorizationError } from "@afh/shared-kernel";
import {
  jsonResponse,
  type RouteDefinition,
  type TransportRequest,
  type TransportResponse,
} from "../transport/contracts.js";
import {
  platformErrorResponse,
  unauthorizedResponse,
  validationIssuesResponse,
} from "../errors/exception-mapping.js";
import { parseJsonBody } from "../dto/validation.js";
import { ApiPaths } from "../constants.js";
import { authenticateRequest, type TransportAuthContext } from "../auth/authentication.js";
import type { RateLimitHook } from "../rate-limit/rate-limit.js";
import type { CxWorkspaceSnapshotDto, CxWorkspaceStore } from "./workspace-store.js";

export type CxSyncRouteDeps = {
  readonly identity: IdentityFoundation;
  readonly rateLimit: RateLimitHook;
  readonly workspaceStore: CxWorkspaceStore;
};

async function gate(
  deps: CxSyncRouteDeps,
  request: TransportRequest,
): Promise<{ ok: true; auth: TransportAuthContext } | { ok: false; response: TransportResponse }> {
  const authResult = await authenticateRequest(deps.identity, request, { required: true });
  if (!authResult.ok) {
    if (authResult.error.code === "unauthenticated") {
      return {
        ok: false,
        response: unauthorizedResponse(
          authResult.error.correlationId ?? null,
          authResult.error.message,
        ),
      };
    }
    return {
      ok: false,
      response: platformErrorResponse(authResult.error, authResult.error.correlationId ?? null),
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
          "retry-after": String(decision.retryAfterSeconds ?? 60),
          "x-correlation-id": authResult.value.correlationId,
        },
      ),
    };
  }

  if (!authResult.value.caller?.userId) {
    return {
      ok: false,
      response: unauthorizedResponse(authResult.value.correlationId, "Sign in required for CX sync"),
    };
  }

  return { ok: true, auth: authResult.value };
}

function isSnapshot(value: unknown): value is CxWorkspaceSnapshotDto {
  if (!value || typeof value !== "object") return false;
  const v = value as CxWorkspaceSnapshotDto;
  return (
    v.version === 1 &&
    typeof v.userId === "string" &&
    typeof v.revision === "number" &&
    typeof v.revisedAt === "string" &&
    Array.isArray(v.records) &&
    Array.isArray(v.devices)
  );
}

export function createCxSyncRoutes(deps: CxSyncRouteDeps): RouteDefinition[] {
  return [
    {
      method: "GET",
      path: ApiPaths.CxWorkspace,
      authRequired: true,
      summary: "Download CX workspace snapshot for the signed-in user",
      tags: ["cx", "sync"],
      async handler(request) {
        const gated = await gate(deps, request);
        if (!gated.ok) return gated.response;
        const userId = gated.auth.caller!.userId;
        const snapshot = deps.workspaceStore.get(userId);
        return jsonResponse(
          200,
          { ok: true, data: { snapshot }, correlationId: gated.auth.correlationId },
          { "x-correlation-id": gated.auth.correlationId },
        );
      },
    },
    {
      method: "PUT",
      path: ApiPaths.CxWorkspace,
      authRequired: true,
      summary: "Upload CX workspace snapshot for the signed-in user",
      tags: ["cx", "sync"],
      async handler(request) {
        const gated = await gate(deps, request);
        if (!gated.ok) return gated.response;
        const userId = gated.auth.caller!.userId;

        let body: unknown;
        try {
          body = parseJsonBody(request.bodyText);
        } catch {
          return validationIssuesResponse(
            [{ field: "body", code: "invalid_json", message: "Body must be valid JSON" }],
            gated.auth.correlationId,
          );
        }

        const snapshot = (body as { snapshot?: unknown })?.snapshot ?? body;
        if (!isSnapshot(snapshot)) {
          return validationIssuesResponse(
            [{ field: "snapshot", code: "invalid", message: "Invalid workspace snapshot" }],
            gated.auth.correlationId,
          );
        }
        if (snapshot.userId !== userId) {
          return platformErrorResponse(
            new AuthorizationError("Snapshot userId must match session", {
              code: "user_mismatch",
              correlationId: gated.auth.correlationId,
            }),
            gated.auth.correlationId,
          );
        }

        try {
          deps.workspaceStore.put(userId, snapshot);
        } catch (err) {
          return platformErrorResponse(
            new AuthorizationError(err instanceof Error ? err.message : "cx_sync_write_failed", {
              code: "cx_sync_write_failed",
              correlationId: gated.auth.correlationId,
            }),
            gated.auth.correlationId,
          );
        }

        return jsonResponse(
          200,
          {
            ok: true,
            data: { revision: snapshot.revision },
            correlationId: gated.auth.correlationId,
          },
          { "x-correlation-id": gated.auth.correlationId },
        );
      },
    },
  ];
}
