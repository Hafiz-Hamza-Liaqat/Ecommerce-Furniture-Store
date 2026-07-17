# RC5.8 Verification Report — Permission-to-Scope Binding

- **Date:** 2026-07-18
- **Scope verified:** RC5.8 as delivered in `docs/release/RC5.8-scope-binding.md`
  (ADR D47)
- **Environment:** Windows, Node >= 20, npm workspaces

## Results summary

| Stage | Command | Result |
|---|---|---|
| Build | `npm run build` (all 34 workspaces) | PASS |
| Typecheck | `npm run typecheck` (all 34 workspaces, `--noEmit`) | PASS |
| Lint | `npm run lint` (all 34 workspaces, `--max-warnings 0`) | PASS |
| Identity tests | `npm test -w @afh/identity` | PASS — 70 tests, 0 fail (includes 14 new RC5.8 engine tests) |
| API tests | `npm test -w @afh/api` | PASS — 66 tests, 0 fail (includes 5 new RC5.8 pipeline tests) |
| Web tests | `npm test -w @afh/web` | PASS — 48 tests in 5 files, 0 fail |
| Runtime verify | `npm run verify -w @afh/runtime-host` | PASS — configuration, secrets, migrations |
| Runtime harden | `npm run harden -w @afh/runtime-host` | PASS — resilience ×5, SQL integrity, backup, DR ×6, 17 monitoring probes, security ×6 |
| Runtime accept | `npm run accept -w @afh/runtime-host` | PASS — 15/15 acceptance checks |

## New test evidence

### Identity — `packages/identity/src/policy/policy-engine.test.ts` (14 tests)

- **buildPrincipal binding data (2):** per-entry `permissionCodes` populated
  with the flat union preserved; inherited chain roles carry the assignment's
  scope and their own grants.
- **Cross-role widening closed (6):** own/organization/branch-granted
  permissions denied (`scope_mismatch`) outside the granting assignment's
  scope despite a company-scoped second role; owned/in-scope resources still
  allowed; the company assignment's own grants stay company-wide; two
  assignments granting the same permission union their scopes.
- **super_admin binding (2):** bypass kept for actions super_admin grants;
  a super_admin entry cannot bypass scope for actions it did not grant.
- **Backward compatibility (2):** legacy principals without per-entry data
  keep pre-RC5.8 union behavior; partially populated principals fail closed.
- **Unchanged stages (2):** `permission_missing` still precedes scope;
  `company_isolation` still denies cross-company resources.

### API — `packages/api/src/authorization/scope-binding.test.ts` (5 tests)

Real behavior stack (`ExceptionMappingBehavior` → `AuthorizationBehavior`)
with the seeded RBAC catalog and system roles:

- `sales_manager@own` + `warehouse_manager@company` denied
  (`scope_mismatch`, handler never runs) when updating a non-owned
  opportunity — the exact cross-role widening case that passed before RC5.8.
- The same principal still updates its own opportunity.
- The company-scoped assignment's own inventory grants stay company-wide
  (summary sees both branches' warehouses).
- Scoped list gate passes via the granting assignment and rows stay filtered
  to it (1 of 2 opportunities visible).
- A non-granting assignment's branch cannot shadow the granting assignment's
  branch in the collection gate (action-aware `principalListScope`).

## Regression evidence

- All pre-existing Identity (56), API (61), and Web (48) tests pass unchanged
  — RC5.1 catalog/seeds, RC5.2 session projection, RC5.3 module permissions,
  RC5.4 resource population/upload, RC5.5 record authorization, RC5.6 field
  security, and RC5.7 list filtering suites are all green with the bound
  engine, confirming single-assignment and company-scoped behavior is
  unchanged.
- Session projection (`/api/v1/auth/session`) output unchanged (flat
  presentation union; asserted by the existing auth-routes tests).
- Runtime verify/harden/accept all pass against the rebuilt artifacts.

## Constraint compliance

| Constraint | Status |
|---|---|
| No authentication/session changes | Respected — no auth/session file touched; session tests unchanged and green |
| No RBAC catalog redesign | Respected — catalog, seeds, and hierarchy untouched; all RC5.1 tests green |
| No route protection changes | Respected — no route/permission mapping touched |
| No frontend redesign | Respected — zero frontend changes; Web suite green |
| Backward compatibility | Legacy principals keep pre-RC5.8 behavior; engine/API signatures unchanged; `principalListScope` action parameter is optional |
