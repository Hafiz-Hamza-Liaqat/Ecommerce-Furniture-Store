/**
 * Rate limiting hooks — transport only.
 * Policy remains the sole authorization engine.
 */

import type { TransportRequest } from "../transport/contracts.js";
import type { TransportAuthContext } from "../auth/authentication.js";

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
