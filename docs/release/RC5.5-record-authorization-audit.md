# RC5.5 — Independent Authorization Audit

**Date:** 2026-07-17  
**Scope:** Verify RC5.5 implementation against frozen RC5 documentation without
further application-code changes.  
**Companion report:** `docs/release/RC5.5-record-authorization.md`  
**ADR under audit:** `docs/architecture/decision-records/ADR-D45-record-authorization-load-before-authorize.md`

---

## Verdict

**PASS** — RC5.5 record-level authorization is implemented within approved
scope. The Policy Engine remains the sole runtime authorizer. Persisted
owner/organization/branch data feeds Policy for record-targeting operations.
Fail-closed behavior holds when authorization context cannot be resolved. No
field-level security, catalog, role, authentication, session, frontend, or
Policy Engine algorithm changes were introduced.

---

## Requirement matrix

| # | Requirement | Result | Evidence |
|---|---|---|---|
| 1 | Only RC5.5 scope changed | **PASS** | Diff limited to seven `*-application` support helpers + record-targeting handlers, API record-authorization tests / package script, ADR D45 + index, and RC5 docs. Identity policy/catalog, web, auth, session packages unchanged |
| 2 | Policy Engine remains the only authorization authority | **PASS** | Handlers only load data and build `AuthorizationSpec`; decisions still flow through `AuthorizationBehavior` → `RbacPolicyEngine.evaluate`. No parallel allow/deny helpers |
| 3 | No Policy Engine algorithm change | **PASS** | `packages/identity/src/policy/policy-engine.ts` and identity package not in the RC5.5 diff |
| 4 | No permission catalog / role definition change | **PASS** | Identity catalog/role/seed files untouched; catalog remains v3 from RC5.4 |
| 5 | Populate complete PolicyResource from persisted records | **PASS** | Update/lifecycle/get-by-id handlers call `loadRecordForAuthorization` then set `ownerUserId` / `organizationId` / `branchId` / `attributes` from the loaded record |
| 6 | Load-before-authorize only where frozen spec requires it | **PASS** | Applied to record-targeting operations (ADR D45); create-style commands remain payload-derived (RC5.4) |
| 7 | Fail-closed when context cannot be resolved | **PASS** | Helper throws repository `PlatformError`; ExceptionMapping maps to failed result; test proves handler never reached |
| 8 | Owner allow/deny on persisted ownership | **PASS** | Tests allow own-scoped owner; deny when payload spoofs `salesRepUserId` (`scope_mismatch`) |
| 9 | Organization isolation | **PASS** | Same-org allow; cross-org deny |
| 10 | Branch isolation | **PASS** | Same-branch warehouse allow; cross-branch deny |
| 11 | Cross-company denial (IDOR) | **PASS** | Foreign companyId → `company_isolation`; company-keyed findById never returns foreign rows |
| 12 | Missing resource handling | **PASS** | Scoped principals denied; company-scoped principals reach handler not-found without existence leak |
| 13 | No authentication / session changes | **PASS** | No auth/session package diffs |
| 14 | No frontend routing / navigation / dashboard changes | **PASS** | Web package unchanged |
| 15 | Field-level authorization not started | **PASS** | No field metadata / DTO redaction work |
| 16 | Authorization model unchanged | **PASS** | Same PolicyResource shape and engine rules; only data source for scope fields changed for record-targeting ops |
| 17 | Targeted authorization tests pass | **PASS** | 11 new cases in `record-authorization.test.ts`; API suite 41/41 |
| 18 | Build / typecheck / lint / identity / api / web / runtime | **PASS** | All green on 2026-07-17 (identity 56, api 41, web 43; verify/harden/accept ok) |

---

## Explicit non-goals confirmed not implemented

| Non-goal | Status |
|---|---|
| Permission-to-scope binding (engine algorithm change) | Deferred; documented in ADR D45 |
| Field-level security (RC5.6) | Not started |
| List-query row filters (RC7) | Not started |
| Dual-branch transfer engine evaluation | Deferred; destination only in attributes |
| Catalog / role / session / frontend changes | None |
| New HTTP endpoints or CQRS types | None |

---

## Behavioral spot-checks (against ADR D45)

1. **Spoof resistance:** UpdateOpportunity authorize loads by `{ companyId, opportunityId }` and sets `ownerUserId` from `record?.salesRepUserId`, ignoring payload `salesRepUserId`.
2. **Company keying:** Authorization loads use the same company-scoped repository contract as `handle()`.
3. **Missing data denies:** Null load leaves scope fields null → own/org/branch `#scopeAllows` fails.
4. **Engine sole decider:** Test harness dispatches through real `ExceptionMappingBehavior` + `AuthorizationBehavior` + seeded `policyEngine`; no stubbed authorize decisions.

---

## Residual notes (not blockers)

1. Union of permissions across assignments with independent scope checks remains the known least-privilege risk until an approved engine change implements permission-to-scope binding.
2. Fixture / list UI surfaces remain untrusted for multi-tenant isolation (RC7).
3. Attributes glossary is documentation-only; do not grow client-side authorization from attribute keys.

---

## Conclusion

RC5.5 is complete and auditable. Safe to review and commit after approval.
Do not begin RC5.6 until explicitly requested.
