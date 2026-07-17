# RC5.9 Independent Audit — Authorization Observability

- **Date:** 2026-07-18
- **Subject:** RC5.9 as delivered in
  `docs/release/RC5.9-authorization-observability.md` (ADR D48)
- **Method:** Independent adversarial review of the uncommitted diff, Policy
  Engine audit/metrics paths, harden smoke, tests, and signoff honesty.
  HIGH findings were remediated in-session before close.

## Verdict

**RC5.9 meets its approved scope** (authorization observability and
operational hardening; no new authz model / catalog / routes / session /
frontend). After remediation of the initial HIGH findings, evidence is
complete enough for review: audit emission is asserted by harden smoke,
§K entry criteria wording is honest about prior register rows, and this
audit packet exists.

## Findings and disposition

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | HIGH → closed | Plan cited missing audit packet | This document |
| 2 | HIGH → closed | §K claimed “RC5.1–5.8 signed” while register rows unchecked | Reworded to “implementation evidence packets”; human rows remain open |
| 3 | HIGH → closed | `authz_policy_smoke` did not assert audit emission | Smoke now requires `policy.deny` + `policy.allow` in `SecurityAuditService.recentRecords()`; allow path exercises platform (Enhanced) engine |
| 4 | MEDIUM | Allow-path audit availability coupling | Documented in residual register; intentional fail-closed per governance §5.2 |
| 5 | MEDIUM | Smoke used only identity engine | Closed with Finding 3 — allow via `platform.policyEngine` |
| 6 | MEDIUM | Enhanced early-deny enrichment incomplete | Enhanced denies now stamp engineVersion, catalogVersion, scopeBinding, contributingRoles |
| 7 | MEDIUM | Thin deny-reason / fail-closed tests | Added `company_isolation`, `scope_mismatch`, and audit-sink rejection tests |
| 8 | LOW | Optional `audit?.` fail-open if omitted | Accepted: composition always wires audit; harden asserts emission |
| 9 | LOW | Metrics before audit await | Closed: metrics now increment after successful audit append |
| 10 | INFO | No double-logging via Enhanced | Confirmed |
| 11 | INFO | Metrics do not authorize (ADR D44) | Confirmed |
| 12 | INFO | p95/p99 excludes audit sink per §6 | Confirmed; e2e % not claimed |
| 13 | INFO | Diff respects scope boundaries | Confirmed |

## Scope check

No changes under `packages/web/**`, `packages/identity/src/rbac/**`,
authentication/session modules, or API route/auth protection.

## Remaining open (honest, not blocking code acceptance)

- Human Engineering/Security/Product signatures on `12-RC5-Signoff.md` §J
- `rc5-candidate` git tag (ops after human signoff)
- Full operator role-assignment runbook (partial troubleshooting notes only)
- Prior milestone §K register rows for RC5.1–5.8 (implementation packets exist; human checkboxes remain for owners)
