/**
 * RC5.9 — Authorization decision metrics (operational signals only).
 * Does not authorize; does not replace SecurityAuditService records (ADR D44).
 */

import type { Metrics } from "@afh/shared-kernel";

export class AuthorizationMetrics {
  constructor(private readonly metrics: Metrics) {}

  decisionAllow(engine: string): void {
    this.metrics
      .counter("authz.policy.decision")
      .add(1, { decision: "allow", engine });
  }

  decisionDeny(engine: string, reasonCode: string): void {
    this.metrics.counter("authz.policy.decision").add(1, {
      decision: "deny",
      engine,
      reason: reasonCode,
    });
  }

  evaluateDurationMs(engine: string, elapsedMs: number): void {
    this.metrics
      .histogram("authz.policy.duration_ms")
      .record(elapsedMs, { engine });
  }

  legacyPrincipal(): void {
    this.metrics.counter("authz.policy.legacy_principal").add(1);
  }
}
