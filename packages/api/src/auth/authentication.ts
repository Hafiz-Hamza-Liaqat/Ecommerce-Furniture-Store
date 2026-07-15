/**
 * Transport authentication — Identity sessions only.
 * Authorization remains Policy-only inside Application Runtime.
 */

import {
  AuthorizationError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { IdentityFoundation, SessionRecord } from "@afh/identity";
import {
  AuthorizationHeader,
  CompanyHeader,
  CorrelationHeader,
  BranchHeader,
} from "../constants.js";
import { headerValue, type TransportRequest } from "../transport/contracts.js";

export type AuthenticatedCaller = {
  readonly userId: string;
  readonly companyId: string | null;
  readonly sessionId: string;
  readonly session: SessionRecord;
};

export type TransportAuthContext = {
  readonly correlationId: string;
  readonly companyId: string | null;
  readonly branchId: string | null;
  readonly caller: AuthenticatedCaller | null;
};

function newCorrelationId(): string {
  return crypto.randomUUID();
}

export function extractBearerToken(request: TransportRequest): string | null {
  const raw = headerValue(request.headers, AuthorizationHeader);
  if (!raw) return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  return match?.[1]?.trim() || null;
}

export function resolveCorrelationId(request: TransportRequest): string {
  return headerValue(request.headers, CorrelationHeader) ?? newCorrelationId();
}

/**
 * Authenticate via session id presented as Bearer token.
 * Does not authorize — Policy runs in the application pipeline.
 */
export async function authenticateRequest(
  identity: IdentityFoundation,
  request: TransportRequest,
  options: { readonly required: boolean },
): Promise<Result<TransportAuthContext, PlatformError>> {
  const correlationId = resolveCorrelationId(request);
  const companyHeader = headerValue(request.headers, CompanyHeader);
  const branchId = headerValue(request.headers, BranchHeader);
  const token = extractBearerToken(request);

  if (!token) {
    if (options.required) {
      return fail(
        new AuthorizationError("Missing Bearer session token", {
          code: "unauthenticated",
          correlationId,
        }),
      );
    }
    return ok({
      correlationId,
      companyId: companyHeader,
      branchId,
      caller: null,
    });
  }

  const session = await identity.store.getSession(token);
  if (!session || session.revokedAt) {
    return fail(
      new AuthorizationError("Invalid or revoked session", {
        code: "session_invalid",
        correlationId,
      }),
    );
  }

  const now = identity.clock.now();
  if (new Date(session.expiresAt) < now || new Date(session.absoluteExpiresAt) < now) {
    return fail(
      new AuthorizationError("Session expired", {
        code: "session_expired",
        correlationId,
      }),
    );
  }

  await identity.sessions.touchSession(session.id);

  return ok({
    correlationId,
    companyId: companyHeader ?? session.companyId,
    branchId,
    caller: {
      userId: session.userId,
      companyId: session.companyId,
      sessionId: session.id,
      session,
    },
  });
}
