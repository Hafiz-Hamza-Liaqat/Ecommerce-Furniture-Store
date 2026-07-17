# RC5.7 — Independent Audit Report (Query/List Record Filtering)

- **Date:** 2026-07-18
- **Auditor:** independent review pass over the uncommitted RC5.7 working tree (base commit `b1290f1`), with a full build and test execution
- **Verdict:** **PASS WITH FINDINGS** — implementation faithful to the approved scope; Policy Engine remains the sole authorization authority; two low-severity documentation findings, both remediated before commit

## 1. Checklist results

| # | Requirement | Result | Evidence |
|---|---|---|---|
| A | Only RC5.7-scope files changed | **PASS** | `git status --short` / `git diff --stat`: 5 docs + `packages/api/package.json` + `packages/application/src/security/index.ts` + 5 `query-handlers.ts` modified; 4 new files (`record-filtering.ts`, `list-filtering.test.ts`, ADR-D46, RC5.7 report). Nothing outside the claimed set. |
| B | Policy Engine untouched | **PASS** | `git diff packages/identity` is empty; `RbacPolicyEngine.evaluate` / `#scopeAllows` unchanged. |
| C | RBAC catalog / seeds / roles untouched | **PASS** | No identity diffs; all row actions are pre-existing canonical `*.read` permissions from catalog `rc5.rbac-catalog.v3`. |
| D | No authentication/session changes | **PASS** | No diffs under `packages/api/src/auth`, `packages/web/src/state`, or identity sessions. |
| E | No route protection or frontend changes | **PASS** | `git diff packages/web` is empty. |
| F | Filtering helper never decides; no scope-logic duplication | **PASS** | Every keep/drop in `filterAuthorizedRecords` is `decision.allowed` from `ctx.policyEngine.evaluate`; `principalListScope` reads assignment metadata only and makes no allow/deny decision. `#scopeAllows` is not reimplemented anywhere. |
| G | Fail-closed paths | **PASS** | Missing principal → `principal_missing`; thrown evaluation → `policy_evaluation_failed`, whole query aborts; both verified in code and tests. |
| H | Counts/id arrays derive only from filtered rows | **PASS** | All five summary return objects traced: no leftover use of unfiltered `page.items` reaches any count, id projection, or the inventory movement sampling loop (which iterates visible items only). |
| I | New tests pass with required coverage | **PASS** | `npm test -w @afh/api`: 61/61. RC5.7 suite covers owner allow/deny, organization isolation, branch isolation, company visibility, cross-company denial including a leaked-row defense-in-depth case, and both fail-closed paths. |
| J | No regressions | **PASS** | All pre-existing RC5.2–RC5.6 API suites, Identity (56/56), and Web (48/48) tests green. |
| K | Documentation accuracy | **FINDINGS** | ADR-D46, ADR-INDEX, and the `docs/rc5` updates match the code. Two report inaccuracies found (below). |

## 2. Security analysis of the collection-gate change

The highest-risk design point — populating the collection gate resource from
the principal's own assignments (`principalListScope`) — was traced end to
end and does **not** weaken any guarantee:

- The permission check (`permissionCodes.includes(action)`) runs first in
  the unchanged engine, before any scope field is consulted.
- The gate resource `companyId` is still the request's company and is bound
  to the execution scope by `requireCompanyId`; cross-company still denies
  with `company_isolation`.
- A principal with no active scoped assignments produces all-null hints and
  remains denied by the unchanged `#scopeAllows`.
- The gate only admits the operation; the actual data slice is enforced
  per row against **persisted** row fields, and each row resource carries
  the row's persisted `companyId`, so even a defective adapter leaking a
  foreign row is stopped by the engine's company isolation rule (covered by
  a dedicated test).

Domain scope-field mappings were verified against the models:
`salesRepUserId`/`organizationId` (sales), `requestedByUserId`
(procurement requisitions), `ownerUserId` (crm leads/accounts/campaigns),
`branchId` (warehouses), `organizationId` (invoices). Aggregates without
scope fields correctly yield all-null resources — scoped principals see none
of them (missing data denies).

## 3. Findings and remediation

| # | Severity | Finding | Remediation |
|---|---|---|---|
| F1 | Low (docs) | `docs/rc5/09-Implementation-Plan.md` cited two evidence files that did not yet exist (verification report, audit report) | Both files were produced before commit; references now resolve |
| F2 | Low (docs) | Release report claimed "13 tests"; the suite contains 11 RC5.7 test cases | Corrected to 11 in `docs/release/RC5.7-list-filtering.md` |
| — | Informational | Report intro mentioned "seven module summaries and the service history/summary pair" while five handlers changed (projects/service summaries intentionally keep their RC5.5 D45 parent gates) | Intro sentence tightened to name the five changed handlers |

## 4. Conclusion

RC5.7 is safe to commit: authorization remains centralized in the unchanged
Policy Engine, every returned count/id is provably derived from
Policy-filtered rows, error and missing-principal paths fail the entire
query closed, and no regression was introduced across Identity, API, or Web
suites.
