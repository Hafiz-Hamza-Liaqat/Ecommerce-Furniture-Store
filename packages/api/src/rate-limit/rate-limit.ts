/**
 * Rate limiting hooks — transport only.
 * Policy remains the sole authorization engine.
 */

import type { TransportRequest } from "../transport/contracts.js";
import type { TransportAuthContext } from "../auth/authentication.js";
import { ApiPaths } from "../constants.js";

export type RateLimitDecision = {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number | null;
  readonly reason: string | null;
};

export type RateLimitHook = {
  evaluate(input: {
    readonly request: TransportRequest;
    readonly auth: TransportAuthContext;
  }): Promise<RateLimitDecision> | RateLimitDecision;
};

/** Default: allow all (no enforcement engine in Phase 7A) */
export const allowAllRateLimitHook: RateLimitHook = {
  evaluate() {
    return { allowed: true, retryAfterSeconds: null, reason: null };
  },
};

type Bucket = { count: number; resetAt: number };

const AUTH_PATHS = new Set<string>([
  ApiPaths.AuthRegister,
  ApiPaths.AuthSignIn,
  ApiPaths.AuthRefresh,
  ApiPaths.AuthPasswordResetRequest,
  ApiPaths.AuthPasswordResetConfirm,
  ApiPaths.AuthEmailVerifyConfirm,
]);

function clientKey(request: TransportRequest, auth: TransportAuthContext): string {
  if (auth.caller?.userId) return `user:${auth.caller.userId}`;
  const forwarded = request.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  if (forwarded) return `ip:${forwarded}`;
  return `path:${request.method}:${request.path}`;
}

/**
 * In-memory sliding-window limiter for single-process hosts.
 * RC4: replaces allow-all default in production composition.
 */
export function createInMemoryRateLimitHook(options?: {
  readonly windowMs?: number;
  readonly defaultMax?: number;
  readonly authMax?: number;
  readonly dispatchMax?: number;
}): RateLimitHook {
  const windowMs = options?.windowMs ?? 60_000;
  const defaultMax = options?.defaultMax ?? 120;
  const authMax = options?.authMax ?? 30;
  const dispatchMax = options?.dispatchMax ?? 180;
  const buckets = new Map<string, Bucket>();

  return {
    evaluate({ request, auth }) {
      const now = Date.now();
      const key = clientKey(request, auth);
      const isAuth = AUTH_PATHS.has(request.path);
      const isDispatch =
        request.path === ApiPaths.Commands || request.path === ApiPaths.Queries;
      const max = isAuth ? authMax : isDispatch ? dispatchMax : defaultMax;
      const bucketKey = `${key}:${isAuth ? "auth" : isDispatch ? "dispatch" : "api"}`;

      let bucket = buckets.get(bucketKey);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(bucketKey, bucket);
      }

      bucket.count += 1;
      if (bucket.count > max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        return {
          allowed: false,
          retryAfterSeconds,
          reason: "Rate limit exceeded",
        };
      }

      return { allowed: true, retryAfterSeconds: null, reason: null };
    },
  };
}

export function rateLimitExceededResponse(
  correlationId: string,
  retryAfterSeconds: number | null,
  reason: string | null,
): {
  status: 429;
  body: {
    error: {
      code: string;
      category: string;
      message: string;
      details: Record<string, unknown>;
      retryable: boolean;
      correlationId: string;
    };
  };
  headers: Record<string, string>;
} {
  return {
    status: 429,
    body: {
      error: {
        code: "rate_limited",
        category: "authorization",
        message: reason ?? "Rate limit exceeded",
        details: {},
        retryable: true,
        correlationId,
      },
    },
    headers: {
      "x-correlation-id": correlationId,
      ...(retryAfterSeconds != null ? { "retry-after": String(retryAfterSeconds) } : {}),
    },
  };
}
