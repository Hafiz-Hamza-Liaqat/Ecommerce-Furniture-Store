# RC5.7 — Verification Report

- **Date:** 2026-07-18
- **Scope verified:** Query/list record filtering (Policy-based result filtering) — see `docs/release/RC5.7-list-filtering.md`

## 1. Build / typecheck / lint

| Check | Command | Result |
|---|---|---|
| Full workspace build | `npm run build` (34 packages, includes web Vite production build) | **PASS** (exit 0) |
| Full workspace typecheck | `npm run typecheck` (34 packages) | **PASS** (exit 0) |
| Full workspace lint | `npm run lint` (`eslint --max-warnings 0` per package) | **PASS** (exit 0) |

## 2. Test suites

| Suite | Command | Result |
|---|---|---|
| Identity | `npm test -w @afh/identity` | **PASS** — 56/56 (catalog, legacy mapping, roles, route catalog, seed, validation) |
| API | `npm test -w @afh/api` | **PASS** — 61/61 (RC5.2 session projection, RC5.3 module permissions, RC5.4 API authorization, RC5.5 record authorization, RC5.6 field security, **RC5.7 list filtering — 11 new tests**) |
| Web | `npm test -w @afh/web` | **PASS** — 48/48 (vitest, 5 files) |

New RC5.7 coverage (`packages/api/src/authorization/list-filtering.test.ts`),
exercised through the real ExceptionMapping → Authorization → handler stack
with the seeded RBAC catalog and the real `RbacPolicyEngine`:

- owner-scope filtering keeps only owned rows; unassigned/foreign-owned rows
  are omitted from counts and id arrays;
- an own-scoped principal can now run the collection query (gate targets
  caller scopes) and receives an empty, not denied, result when nothing is
  in scope;
- organization isolation keeps only same-org rows;
- branch isolation keeps only same-branch warehouses;
- company scope still sees every company row;
- cross-company rows never surface behind company-keyed repositories, and a
  simulated leaky adapter's foreign row is dropped by Policy company
  isolation (defense in depth);
- a throwing Policy Engine fails the whole query
  (`policy_evaluation_failed`) — never partial results;
- filtering without an active principal fails (`principal_missing`);
- `principalListScope` derives gate hints only from scoped assignments and
  returns all-null hints for a missing principal.

## 3. Runtime verify / harden / accept

| Stage | Result |
|---|---|
| `npm run verify -w @afh/runtime-host` | **PASS** — configuration, secrets, migrations |
| `npm run harden -w @afh/runtime-host` | **PASS** — resilience scenarios, SQL integrity/busy-timeout/transaction, backup, disaster recovery, 17 monitoring probes, security (JWT, rotation, audit pipeline, MFA provider) |
| `npm run accept -w @afh/runtime-host` | **PASS** — all 15 acceptance checks ok (startup composition, SQL/broker/API runtime, health, observability, security providers, backup/restore, DR, load foundation, diagnostics, release validation, production composition, lifecycle start/shutdown) |

## 4. Regression statement

All pre-existing Identity, API, and Web tests pass unchanged. The RBAC
catalog version, role seeds, session handling, route protection, frontend
code, repositories, and the Policy Engine algorithm are untouched
(confirmed by the independent audit: `git diff packages/identity` and
`git diff packages/web` are empty).

## 5. Independent audit

Verdict: **PASS WITH FINDINGS** (two low-severity documentation findings,
both corrected before this report). See
`docs/release/RC5.7-list-filtering-audit.md`.
