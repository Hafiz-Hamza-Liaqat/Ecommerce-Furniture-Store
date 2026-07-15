/**
 * Thin authentication transport — Identity AuthenticationService only.
 * No authorization decisions (Policy remains sole authz engine).
 */

import type { IdentityFoundation } from "@afh/identity";
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

function readString(
  body: Record<string, unknown>,
  key: string,
): string | null {
  const value = body[key];
  return typeof value === "string" ? value : null;
}

export function createAuthRoutes(identity: IdentityFoundation): RouteDefinition[] {
  return [
    {
      method: "POST",
      path: ApiPaths.AuthSignIn,
      authRequired: false,
      summary: "Sign in (Identity session)",
      tags: ["auth"],
      async handler(request) {
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
      path: ApiPaths.AuthSignOut,
      authRequired: true,
      summary: "Sign out current session",
      tags: ["auth"],
      async handler(request) {
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
  request: TransportRequest,
  field: string,
  action: (value: string) => Promise<Result<unknown, PlatformError>>,
): Promise<TransportResponse> {
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
