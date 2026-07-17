# RC5.9 Verification Report — Authorization Observability

- **Date:** 2026-07-18
- **Scope verified:** RC5.9 as delivered in
  `docs/release/RC5.9-authorization-observability.md` (ADR D48)
- **Environment:** Windows, Node >= 20, npm workspaces

## Results summary

| Stage | Command | Result |
|---|---|---|
| Build | `npm run build` (all workspaces) | PASS |
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` (`--max-warnings 0`) | PASS |
| Identity tests | `npm test -w @afh/identity` | PASS — 79 tests, 0 fail (9 new RC5.9 observability tests) |
| API tests | `npm test -w @afh/api` | PASS — 68 tests, 0 fail (2 new RC5.9 pipeline audit tests) |
| Web tests | `npm test -w @afh/web` | PASS — 48 tests, 0 fail |
| Runtime verify | `npm run verify -w @afh/runtime-host` | PASS |
| Runtime harden | `npm run harden -w @afh/runtime-host` | PASS — security checked includes `authz_policy_smoke` |
| Runtime accept | `npm run accept -w @afh/runtime-host` | PASS — 15/15; security_providers detail includes `authz_policy_smoke` |

## New test evidence

### Identity — `authorization-observability.test.ts` (9 tests)

- Frozen Policy Engine deny reason codes and known authz catalog (10 codes).
- `policy.allow` audit with engine/catalog/scopeBinding/contributingRoles/correlationId.
- `policy.deny` audit with stable `permission_missing`.
- `company_isolation` and `scope_mismatch` audited with frozen codes.
- Audit sink rejection fails `evaluate` closed.
- Legacy principal tagged `scopeBinding: legacy` + legacy metric.
- Allow/deny decision counters and duration histogram (after successful audit).
- In-process evaluate p95 ≤ 10 ms and p99 ≤ 25 ms (governance §6 disposition).

### API — `authorization-observability.test.ts` (2 tests)

- Pipeline allow writes `policy.allow` with request correlation id.
- Pipeline deny writes `policy.deny` with `permission_missing`.

## Performance disposition

Governance goal: Policy overhead p95 ≤ 10 ms, p99 ≤ 25 ms per in-process
evaluation (excluding auth/DB/network/audit sink). Measured in the identity
suite with an allow/deny mix (every 5th iteration denied). **Disposition: PASS.**

## Harden evidence

`validateSecurityHardening` checked list now includes:

`jwt_signing_key`, `jwt_rotation_configured`, `security_composition`,
`security_health_probes`, `audit_pipeline`, `mfa_provider`, **`authz_policy_smoke`**.

## Constraint compliance

| Constraint | Status |
|---|---|
| No new authorization model | Respected — evaluate algorithm/outcomes unchanged |
| No RBAC catalog redesign | Respected — catalog/seeds untouched |
| No route protection changes | Respected |
| No authentication/session redesign | Respected |
| No frontend redesign | Respected — Web suite unchanged green |
| Metrics do not replace audit (ADR D44) | Respected — metrics optional; audit mandatory when wired |

## Signoff notes

- Engineering evidence for §H Quality and RC5.9 evidence register is this packet.
- Human Engineering/Security/Product signatures on `12-RC5-Signoff.md` §J remain open.
- `rc5-candidate` git tag is an ops step after human signoff — not applied here.
