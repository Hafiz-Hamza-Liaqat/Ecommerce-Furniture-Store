/**
 * Security observability — reuses Phase 0F Metrics contracts.
 */

import type { Metrics } from "@afh/shared-kernel";

export class SecurityMetrics {
  constructor(private readonly metrics: Metrics) {}

  loginSuccess(): void {
    this.metrics.counter("security.auth.login.success").add(1);
  }

  loginFailure(reason: string): void {
    this.metrics
      .counter("security.auth.login.failure")
      .add(1, { reason });
  }

  authFailure(reason: string): void {
    this.metrics
      .counter("security.auth.failure")
      .add(1, { reason });
  }

  tokenIssued(kind: string): void {
    this.metrics.counter("security.token.issued").add(1, { kind });
  }

  mfaChallenge(kind: string): void {
    this.metrics.counter("security.mfa.challenge").add(1, { kind });
  }

  mfaSuccess(kind: string): void {
    this.metrics.counter("security.mfa.verify.success").add(1, { kind });
  }

  mfaFailure(kind: string): void {
    this.metrics.counter("security.mfa.verify.failure").add(1, { kind });
  }
}

/**
 * Observes AuthenticationService outcomes without altering its flow.
 * Call from hosts after register/signIn results.
 */
export function recordLoginOutcome(
  metrics: SecurityMetrics,
  outcome: "success" | "failure",
  reason?: string,
): void {
  if (outcome === "success") {
    metrics.loginSuccess();
  } else {
    metrics.loginFailure(reason ?? "unknown");
  }
}
