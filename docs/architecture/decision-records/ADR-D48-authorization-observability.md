# ADR D48 — Authorization observability and operational hardening (RC5.9)

- **Status:** Accepted
- **Date:** 2026-07-18
- **Phase:** RC5.9 — Authorization observability and operational hardening
- **Depends on:** D02, D43, D44, D45, D46, D47

## Context

Governance (`docs/rc5/13-Authorization-Governance-Specification.md` §5) requires
every Policy allow **and** deny to be logged through the existing
`SecurityAuditService`, with a stable reason code and safe diagnostic fields.
Before RC5.9 the Policy Engine logged denies only (`policy.deny`) — an explicit
"RC5 hardening gap" in §5.2. Deny reason codes existed as string literals with
no frozen catalog artifact. Authorization decisions produced no operational
metrics, and runtime harden validation checked JWT/session/audit wiring but not
the Policy evaluate path.

RC5.9 is the release-candidate hardening slice: close those observability and
operational gaps **without** changing the authorization model, RBAC catalog,
route protection, authentication/session design, or frontend.

ADR D44 still applies: metrics and traces are operational signals and must not
become a second authorizer or replace audit records.

## Decision

1. **Allow-path audit.** `RbacPolicyEngine.evaluate` records both
   `policy.allow` (outcome success) and `policy.deny` (outcome failure) via
   the existing `SecurityAuditService`. Audit details include permission,
   decision, engine name/version, catalog version, scope-binding mode
   (`bound` | `legacy`), contributing role codes/scopes, and correlation id.
2. **Stable reason-code catalog.** Export frozen const arrays and type guards
   for Policy Engine, Enhanced Policy, and application authz reason codes
   (`packages/identity/src/policy/reason-codes.ts`). Changing a code is a
   breaking observability change requiring an ADR.
3. **Authorization metrics.** Optional `Metrics` injection on identity
   foundation / Policy Engine records `authz.policy.decision`,
   `authz.policy.duration_ms`, and `authz.policy.legacy_principal`. Metrics
   never replace audit records and never alter allow/deny outcomes.
4. **Harden smoke.** `validateSecurityHardening` adds `authz_policy_smoke`:
   synthetic allow and deny evaluates through the composed Policy Engine with
   stable `permission_missing` on deny.
5. **Performance disposition.** In-process evaluate p95/p99 goals from
   governance §6 are measured in the identity observability suite and reported
   for signoff §H.

## Consequences

- Allow decisions increase audit volume (including RC5.7 per-row list
  filtering allows). Accepted: governance forbids sampling decision records.
- Legacy principals (no per-entry permission data) are tagged in audit details
  and counted via `authz.policy.legacy_principal` for operational visibility
  (RC5.8 residual follow-up).
- Operators can correlate denials via `correlationId` + `reasonCode` without
  a new HTTP diagnostics surface.
- No catalog, route, session, or frontend changes; `PolicyEngine.evaluate`
  signature unchanged.

## Rejected alternatives

- **Sampling allows:** violates governance §5.2.
- **New authz microservice / diagnostics HTTP API:** out of RC5.9 scope and
  would invent a parallel surface.
- **Replacing audit with metrics alone:** forbidden by ADR D44 and §5.2.
- **Changing reason-code strings:** would break existing tests and operator
  runbooks; catalog freezes current strings instead.
