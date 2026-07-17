# RC5.3 — Module Permissions (Independent Verification Audit)

**Date:** 2026-07-17
**Subject:** `docs/release/RC5.3-module-permissions.md`
**Method:** Evidence gathered independently of the implementation's own test
suite: `git diff` scope inspection, repository-wide pattern searches, and a
standalone Node script executed against the compiled `dist` output.

---

## Audit matrix

| # | Requirement | Verdict | Evidence |
|---|---|---|---|
| 1 | All 107 handler action references are canonical catalog codes | **PASS** | Standalone script over compiled `dist` of all seven `*-application` packages + `@afh/identity`: `{"references":107,"distinct":105,"equalsCatalog":true,"legacyRemaining":[]}` |
| 2 | The 105 distinct actions equal the frozen catalog exactly (no missing, no extra, no invented codes) | **PASS** | Same script: sorted distinct action set is string-equal to sorted `CANONICAL_PERMISSION_CODES` |
| 3 | No differing legacy executable key remains anywhere in `*-application` source | **PASS** | Repo-wide regex sweep for all 96 differing legacy key shapes (`opportunity.create` … `inventory.item.*`, `finance.account.*`, `project.summary.read`, etc.) across `packages/**/*-application/src/**`: zero matches |
| 4 | Normalization followed the frozen `LEGACY_ACTION_MAP` (no reinterpretation) | **PASS** | Script check `legacyRemaining: []` plus test "every canonical action is the mapped target of its frozen legacy key"; the mapping itself is unchanged (`git diff` on `permission-catalog.ts` shows doc comments only) |
| 5 | Policy Engine, pipeline, dispatcher, routes, seed, and catalogs unchanged | **PASS** | `git diff --name-only` touches only: 7 `constants.ts`, `permission-catalog.ts` (comments), `api/package.json` (test script), 2 docs, 1 new test file. `git diff --stat` over `packages/identity`, `packages/application`, `packages/platform`, `packages/api/src/{routes,host,upload}` shows only the comment-level catalog change |
| 6 | Overlap window intact: legacy compatibility grants still seeded and still resolve | **PASS** | `seed.ts` untouched; test "keeps the documented legacy overlap window" proves a seeded role holds both `sales.orders.create` and `order.create` and that the legacy key still evaluates to allow |
| 7 | Module permission enforcement proven through the existing Policy Engine | **PASS** | 9 behavior tests: per-role allow (sales_manager, finance_manager, warehouse_manager, read_only, admin), cross-module deny `permission_missing`, cross-company deny `company_isolation`, unassigned-user deny |
| 8 | Enforcement proven at CQRS dispatch level without new authorization logic | **PASS** | 3 tests run the real `CreateOpportunity` handler `authorize()` through the real `AuthorizationBehavior`: allow continues the pipeline; deny (`permission_missing` / `company_isolation`) blocks before the handler executes |
| 9 | No new APIs, routes, endpoints, or authorization framework | **PASS** | No changes under `packages/api/src/routes`, `host`, `upload`; no new exports in runtime packages; the only new file is a test |
| 10 | Out-of-scope items untouched (record security, ownership, field security, workflow, dashboards, frontend gating) | **PASS** | `PolicyResource` builders (`companyResource`) unchanged (owner/org/branch remain null); `packages/web` untouched; platform workflow/approval untouched |
| 11 | Build / typecheck / lint green | **PASS** | `npm run build`, `npm run typecheck`, `npm run lint` across all 34 packages: exit 0, zero warnings |
| 12 | Full test results green, prior milestones unaffected | **PASS** | `@afh/identity` 54/54 (rerun after final rebuild), `@afh/api` 20/20 (4 pre-existing + 16 new), `@afh/web` 43/43 |

## Residual notes (not blockers)

- The RC5.1 seed is still not invoked by any production bootstrap path;
  runtime enforcement of the canonical codes presumes the catalog seed has
  been applied to the target environment (unchanged posture since RC5.1,
  owned by the migration plan).
- The frozen-plan RC5.4 remainder (owner/org/branch `PolicyResource`
  population, `dam.assets.upload` on the upload route, OpenAPI production
  exposure policy) is explicitly deferred and documented in
  `docs/rc5/09-Implementation-Plan.md`.

**Overall verdict: PASS — RC5.3 is compliant with the approved scope and the frozen RC5 governance rules.**
