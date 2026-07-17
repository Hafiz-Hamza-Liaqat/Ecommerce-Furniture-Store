# RC5.9 — Authorization Observability and Operational Hardening

- **Date:** 2026-07-18
- **Approved scope:** Authorization observability and operational hardening as
  defined by the frozen RC5 documentation (governance §5–§6, signoff §H/K).
  No new authorization model; no RBAC catalog redesign; no route protection
  changes; no authentication/session redesign; no frontend redesign.
- **Decision record:** `docs/architecture/decision-records/ADR-D48-authorization-observability.md`

## What was delivered

1. **Allow + deny audit (closes governance §5.2 gap)**
   - `RbacPolicyEngine.evaluate` records `policy.allow` and `policy.deny`
     through the existing `SecurityAuditService`.
   - Details include permission, decision, engine name/version, catalog
     version, `scopeBinding` (`bound` | `legacy`), contributing role
     code/scope tuples, and correlation id.
2. **Stable reason-code catalog**
   - `packages/identity/src/policy/reason-codes.ts` freezes Policy Engine,
     Enhanced Policy, and application authz reason codes with type guards.
3. **Authorization metrics (operational signals only)**
   - Optional `Metrics` on identity foundation → Policy Engine.
   - Counters/histogram: `authz.policy.decision`, `authz.policy.duration_ms`,
     `authz.policy.legacy_principal`. Pre-registered in runtime observability.
   - Metrics never replace audit records (ADR D44).
4. **Harden smoke**
   - `validateSecurityHardening` adds `authz_policy_smoke`: synthetic deny
     (`permission_missing`) and allow through the composed Policy Engine.
5. **Performance disposition**
   - In-process evaluate p95 ≤ 10 ms / p99 ≤ 25 ms asserted in the identity
     observability suite (governance §6 goals).
6. **Enhanced Policy deny details**
   - Early Enhanced denies stamp `engine: EnhancedPolicyEngine` for operator
     triage; allows continue to be audited by the inner engine (no double-allow).

## Behavioral change

- Successful Policy evaluations now append `policy.allow` audit records
  (including per-row list filtering allows). Access decisions are unchanged;
  observability volume increases.
- Legacy (unbound) principals are tagged in audit details and counted.

## What was not changed

- Authorization model, evaluation order, reason-code *values*, RBAC catalog,
  route protection, authentication/session handling, frontend.
- `PolicyEngine.evaluate` public signature.

## Files changed (summary)

| Area | Files |
|---|---|
| Identity Policy | `policy-engine.ts`, `reason-codes.ts`, `authorization-metrics.ts`, composition metrics wiring |
| Platform | `enhanced-policy-engine.ts` deny audit enrichment |
| API / identity-providers | metrics passed into `createIdentityFoundation` |
| Runtime-host | `security-validation.ts` smoke; observability metric registration |
| Tests | `authorization-observability.test.ts` (identity + api) |
| Docs | ADR D48, governance §5, plan/test/signoff, release reports |

## Operator notes

1. **Troubleshoot a denial:** locate the request `correlationId`, find the
   matching `policy.deny` (or `field.*`) audit record, read `details.reasonCode`
   against the frozen catalog in `reason-codes.ts` / governance §5.3.
2. **Allow volume / audit availability:** company-scoped list filtering can emit
   many `policy.allow` rows (governance forbids sampling). Audit store outage
   fails evaluate closed, including list-row allows — treat audit health as an
   authorization availability dependency.
3. **Legacy binding metric:** a rising `authz.policy.legacy_principal` rate
   means some caller is evaluating a hand-built principal without per-entry
   permission data — production should use `buildPrincipal` only.
4. **Harden smoke:** `authz_policy_smoke` asserts decision outcomes and
   `policy.deny` / `policy.allow` emission via `SecurityAuditService.recentRecords()`.
5. **Candidate tag:** frozen docs name `rc5-candidate` after RC5.9; tagging is
   an ops step after human signoff on `12-RC5-Signoff.md` §J.

## Residual risks

| Risk | Severity | Notes |
|---|---|---|
| Allow audit volume on filtered lists | Low | Accepted |
| Allow-path audit availability coupling | Medium | Fail closed on audit sink outage |
| Legacy principal fallback | Low | Metric + audit tag; production path bound |
| Full operator role-assignment runbook | — | Partial troubleshooting notes only; ops-owned |
| Human Engineering/Security/Product signoff | — | Checklist §J signature line remains open |
| `rc5-candidate` git tag | — | Not applied in this change set; ops after review |
