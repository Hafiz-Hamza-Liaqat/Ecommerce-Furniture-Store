/**
 * Thin authentication transport — Identity AuthenticationService only.
 * No authorization decisions (Policy remains sole authz engine).
 */

import {
  ALL_CANONICAL_PERMISSION_CODES,
  type IdentityFoundation,
} from "@afh/identity";
import { isFail, type PlatformError, type Result } from "@afh/shared-kernel";
import {
  ApiPaths,
  CorrelationHeader,
} from "../constants.js";
import {
  authenticateRequest,
  resolveCorrelationId,
} from "../auth/authentication.js";
import {
  platformErrorResponse,
  unauthorizedResponse,
  validationIssuesResponse,
} from "../errors/exception-mapping.js";
import { parseJsonBody } from "../dto/validation.js";
import {
  jsonResponse,
  type RouteDefinition,
  type TransportRequest,
  type TransportResponse,
} from "../transport/contracts.js";
import type { RateLimitHook } from "../rate-limit/rate-limit.js";
import { rateLimitExceededResponse as buildRateLimitResponse } from "../rate-limit/rate-limit.js";

const CANONICAL_PERMISSION_SET = new Set(ALL_CANONICAL_PERMISSION_CODES);

/**
 * Resolve the authenticated user's effective canonical permission codes using
 * the existing Policy principal builder. This exposes RBAC state only; it
 * performs no authorization decision and does not change Policy semantics.
 */
export async function resolveSessionPermissionCodes(
  identity: IdentityFoundation,
  userId: string,
): Promise<readonly string[]> {
  const principal = await identity.policyEngine.buildPrincipal(userId);
  if (principal === null) {
    return [];
  }
  return principal.permissionCodes
    .filter((code) => CANONICAL_PERMISSION_SET.has(code))
    .sort();
}

function readString(
  body: Record<string, unknown>,
  key: string,
): string | null {
  const value = body[key];
  return typeof value === "string" ? value : null;
}

async function gateAuthRateLimit(
  rateLimit: RateLimitHook,
  request: TransportRequest,
): Promise<TransportResponse | null> {
  const correlationId = resolveCorrelationId(request);
  const decision = await rateLimit.evaluate({
    request,
    auth: {
      correlationId,
      companyId: null,
      branchId: null,
      caller: null,
    },
  });
  if (!decision.allowed) {
    const limited = buildRateLimitResponse(
      correlationId,
      decision.retryAfterSeconds,
      decision.reason,
    );
    return jsonResponse(limited.status, limited.body, limited.headers);
  }
  return null;
}

export function createAuthRoutes(
  identity: IdentityFoundation,
  rateLimit: RateLimitHook,
): RouteDefinition[] {
  return [
    {
      method: "POST",
      path: ApiPaths.AuthRegister,
      authRequired: false,
      summary: "Register user (Identity AuthenticationService)",
      tags: ["auth"],
      async handler(request) {
        const limited = await gateAuthRateLimit(rateLimit, request);
        if (limited) return limited;
        const correlationId = resolveCorrelationId(request);
        let body: Record<string, unknown>;
        try {
          body = parseJsonBody(request.bodyText) as Record<string, unknown>;
        } catch {
          return validationIssuesResponse(
            [
              {
                field: "body",
                code: "invalid_json",
                message: "Body must be valid JSON",
              },
            ],
            correlationId,
          );
        }

        const email = readString(body, "email");
        const password = readString(body, "password");
        const fullName = readString(body, "fullName");
        if (!email || !password || !fullName) {
          return validationIssuesResponse(
            [
              {
                field: "email",
                code: "required",
                message: "email, password, and fullName are required",
              },
            ],
            correlationId,
          );
        }

        const companyId = readString(body, "companyId");
        const phone = readString(body, "phone");
        const result = await identity.authentication.register({
          email,
          password,
          fullName,
          companyId,
          phone,
        });
        if (isFail(result)) {
          return platformErrorResponse(result.error, correlationId);
        }
        const user = result.value;
        return jsonResponse(
          201,
          {
            ok: true,
            data: {
              user: {
                id: user.id,
                email: user.email,
                fullName,
                companyId: user.companyId,
                status: user.status,
                mfaEnabled: user.mfaEnabled,
                emailVerified: Boolean(user.emailVerifiedAt),
              },
            },
            correlationId,
          },
          { [CorrelationHeader]: correlationId },
        );
      },
    },
    {
      method: "POST",
      path: ApiPaths.AuthSignIn,
      authRequired: false,
      summary: "Sign in (Identity session)",
      tags: ["auth"],
      async handler(request) {
        const limited = await gateAuthRateLimit(rateLimit, request);
        if (limited) return limited;
        const correlationId = resolveCorrelationId(request);
        let body: Record<string, unknown>;
        try {
          body = parseJsonBody(request.bodyText) as Record<string, unknown>;
        } catch {
          return validationIssuesResponse(
            [
              {
                field: "body",
                code: "invalid_json",
                message: "Body must be valid JSON",
              },
            ],
            correlationId,
          );
        }

        const email = readString(body, "email");
        const password = readString(body, "password");
        if (!email || !password) {
          return validationIssuesResponse(
            [
              {
                field: "email",
                code: "required",
                message: "email and password are required",
              },
            ],
            correlationId,
          );
        }

        const result = await identity.authentication.signIn({
          email,
          password,
          deviceLabel: readString(body, "deviceLabel"),
          userAgent: readString(body, "userAgent"),
          ipAddress: readString(body, "ipAddress"),
          mfaToken: readString(body, "mfaToken"),
        });

        if (isFail(result)) {
          return platformErrorResponse(result.error, correlationId);
        }

        return jsonResponse(
          200,
          {
            ok: true,
            data: {
              user: {
                id: result.value.user.id,
                email: result.value.user.email,
                companyId: result.value.user.companyId,
                status: result.value.user.status,
                mfaEnabled: result.value.user.mfaEnabled,
              },
              tokens: result.value.tokens,
            },
            correlationId,
          },
          { [CorrelationHeader]: correlationId },
        );
      },
    },
    {
      method: "POST",
      path: ApiPaths.AuthRefresh,
      authRequired: false,
      summary: "Refresh session tokens (Identity SessionService)",
      tags: ["auth"],
      async handler(request) {
        const limited = await gateAuthRateLimit(rateLimit, request);
        if (limited) return limited;
        const correlationId = resolveCorrelationId(request);
        let body: Record<string, unknown>;
        try {
          body = parseJsonBody(request.bodyText) as Record<string, unknown>;
        } catch {
          return validationIssuesResponse(
            [
              {
                field: "body",
                code: "invalid_json",
                message: "Body must be valid JSON",
              },
            ],
            correlationId,
          );
        }
        const sessionId = readString(body, "sessionId");
        const refreshToken = readString(body, "refreshToken");
        if (!sessionId || !refreshToken) {
          return validationIssuesResponse(
            [
              {
                field: "sessionId",
                code: "required",
                message: "sessionId and refreshToken are required",
              },
            ],
            correlationId,
          );
        }
        const result = await identity.sessions.refreshSession(
          sessionId,
          refreshToken,
        );
        if (isFail(result)) {
          return platformErrorResponse(result.error, correlationId);
        }
        return jsonResponse(
          200,
          {
            ok: true,
            data: { tokens: result.value },
            correlationId,
          },
          { [CorrelationHeader]: correlationId },
        );
      },
    },
    {
      method: "POST",
      path: ApiPaths.AuthSignOut,
      authRequired: true,
      summary: "Sign out current session",
      tags: ["auth"],
      async handler(request) {
        const limited = await gateAuthRateLimit(rateLimit, request);
        if (limited) return limited;
        const auth = await authenticateRequest(identity, request, {
          required: true,
        });
        if (!auth.ok) {
          return unauthorizedResponse(
            auth.error.correlationId ?? null,
            auth.error.message,
          );
        }
        const sessionId = auth.value.caller?.sessionId;
        if (!sessionId) {
          return unauthorizedResponse(auth.value.correlationId, "No session");
        }
        const result = await identity.authentication.signOut(
          sessionId,
          auth.value.caller?.userId ?? null,
        );
        if (isFail(result)) {
          return platformErrorResponse(result.error, auth.value.correlationId);
        }
        return jsonResponse(
          200,
          { ok: true, data: { signedOut: true }, correlationId: auth.value.correlationId },
          { [CorrelationHeader]: auth.value.correlationId },
        );
      },
    },
    {
      method: "GET",
      path: ApiPaths.AuthSession,
      authRequired: true,
      summary: "Current session",
      tags: ["auth"],
      async handler(request) {
        const limited = await gateAuthRateLimit(rateLimit, request);
        if (limited) return limited;
        const auth = await authenticateRequest(identity, request, {
          required: true,
        });
        if (!auth.ok) {
          return unauthorizedResponse(
            auth.error.correlationId ?? null,
            auth.error.message,
          );
        }
        const userId = auth.value.caller?.userId;
        if (!userId) {
          return unauthorizedResponse(auth.value.correlationId, "No session");
        }
        const user = await identity.store.getUserById(userId);
        const profile = await identity.store.getProfile(userId);
        const permissionCodes = await resolveSessionPermissionCodes(
          identity,
          userId,
        );
        return jsonResponse(
          200,
          {
            ok: true,
            data: {
              sessionId: auth.value.caller?.sessionId ?? null,
              user: user
                ? {
                    id: user.id,
                    email: user.email,
                    companyId: user.companyId,
                    status: user.status,
                    mfaEnabled: user.mfaEnabled,
                    fullName: profile?.fullName ?? null,
                  }
                : null,
              permissionCodes,
            },
            correlationId: auth.value.correlationId,
          },
          { [CorrelationHeader]: auth.value.correlationId },
        );
      },
    },
    {
      method: "POST",
      path: ApiPaths.AuthPasswordResetRequest,
      authRequired: false,
      summary: "Request password reset",
      tags: ["auth"],
      async handler(request) {
        return handleTokenChallenge(
          rateLimit,
          request,
          "email",
          async (email) => identity.authentication.requestPasswordReset(email),
        );
      },
    },
    {
      method: "POST",
      path: ApiPaths.AuthPasswordResetConfirm,
      authRequired: false,
      summary: "Confirm password reset",
      tags: ["auth"],
      async handler(request) {
        const limited = await gateAuthRateLimit(rateLimit, request);
        if (limited) return limited;
        const correlationId = resolveCorrelationId(request);
        let body: Record<string, unknown>;
        try {
          body = parseJsonBody(request.bodyText) as Record<string, unknown>;
        } catch {
          return validationIssuesResponse(
            [
              {
                field: "body",
                code: "invalid_json",
                message: "Body must be valid JSON",
              },
            ],
            correlationId,
          );
        }
        const token = readString(body, "token");
        const newPassword = readString(body, "newPassword");
        if (!token || !newPassword) {
          return validationIssuesResponse(
            [
              {
                field: "token",
                code: "required",
                message: "token and newPassword are required",
              },
            ],
            correlationId,
          );
        }
        const result = await identity.authentication.resetPassword({
          token,
          newPassword,
        });
        if (isFail(result)) {
          return platformErrorResponse(result.error, correlationId);
        }
        return jsonResponse(
          200,
          { ok: true, data: { reset: true }, correlationId },
          { [CorrelationHeader]: correlationId },
        );
      },
    },
    {
      method: "POST",
      path: ApiPaths.AuthEmailVerifyRequest,
      authRequired: true,
      summary: "Request email verification",
      tags: ["auth"],
      async handler(request) {
        const limited = await gateAuthRateLimit(rateLimit, request);
        if (limited) return limited;
        const auth = await authenticateRequest(identity, request, {
          required: true,
        });
        if (!auth.ok) {
          return unauthorizedResponse(
            auth.error.correlationId ?? null,
            auth.error.message,
          );
        }
        const userId = auth.value.caller?.userId;
        if (!userId) {
          return unauthorizedResponse(auth.value.correlationId, "No session");
        }
        const result =
          await identity.authentication.requestEmailVerification(userId);
        if (isFail(result)) {
          return platformErrorResponse(result.error, auth.value.correlationId);
        }
        return jsonResponse(
          200,
          {
            ok: true,
            data: result.value,
            correlationId: auth.value.correlationId,
          },
          { [CorrelationHeader]: auth.value.correlationId },
        );
      },
    },
    {
      method: "POST",
      path: ApiPaths.AuthEmailVerifyConfirm,
      authRequired: false,
      summary: "Confirm email verification",
      tags: ["auth"],
      async handler(request) {
        const limited = await gateAuthRateLimit(rateLimit, request);
        if (limited) return limited;
        const correlationId = resolveCorrelationId(request);
        let body: Record<string, unknown>;
        try {
          body = parseJsonBody(request.bodyText) as Record<string, unknown>;
        } catch {
          return validationIssuesResponse(
            [
              {
                field: "body",
                code: "invalid_json",
                message: "Body must be valid JSON",
              },
            ],
            correlationId,
          );
        }
        const token = readString(body, "token");
        if (!token) {
          return validationIssuesResponse(
            [
              {
                field: "token",
                code: "required",
                message: "token is required",
              },
            ],
            correlationId,
          );
        }
        const result = await identity.authentication.verifyEmail(token);
        if (isFail(result)) {
          return platformErrorResponse(result.error, correlationId);
        }
        return jsonResponse(
          200,
          { ok: true, data: { verified: true }, correlationId },
          { [CorrelationHeader]: correlationId },
        );
      },
    },
    {
      method: "POST",
      path: ApiPaths.AuthMfaEnable,
      authRequired: true,
      summary: "Enable MFA hook (challenge issuance)",
      tags: ["auth"],
      async handler(request) {
        const limited = await gateAuthRateLimit(rateLimit, request);
        if (limited) return limited;
        const auth = await authenticateRequest(identity, request, {
          required: true,
        });
        if (!auth.ok) {
          return unauthorizedResponse(
            auth.error.correlationId ?? null,
            auth.error.message,
          );
        }
        const userId = auth.value.caller?.userId;
        if (!userId) {
          return unauthorizedResponse(auth.value.correlationId, "No session");
        }
        const result = await identity.authentication.enableMfaHook(userId);
        if (isFail(result)) {
          return platformErrorResponse(result.error, auth.value.correlationId);
        }
        return jsonResponse(
          200,
          {
            ok: true,
            data: result.value,
            correlationId: auth.value.correlationId,
          },
          { [CorrelationHeader]: auth.value.correlationId },
        );
      },
    },
  ];
}

async function handleTokenChallenge(
  rateLimit: RateLimitHook,
  request: TransportRequest,
  field: string,
  action: (value: string) => Promise<Result<unknown, PlatformError>>,
): Promise<TransportResponse> {
  const limited = await gateAuthRateLimit(rateLimit, request);
  if (limited) return limited;
  const correlationId = resolveCorrelationId(request);
  let body: Record<string, unknown>;
  try {
    body = parseJsonBody(request.bodyText) as Record<string, unknown>;
  } catch {
    return validationIssuesResponse(
      [
        {
          field: "body",
          code: "invalid_json",
          message: "Body must be valid JSON",
        },
      ],
      correlationId,
    );
  }
  const value = readString(body, field);
  if (!value) {
    return validationIssuesResponse(
      [{ field, code: "required", message: `${field} is required` }],
      correlationId,
    );
  }
  const result = await action(value);
  if (isFail(result)) {
    return platformErrorResponse(result.error, correlationId);
  }
  return jsonResponse(
    200,
    { ok: true, data: result.value, correlationId },
    { [CorrelationHeader]: correlationId },
  );
}
