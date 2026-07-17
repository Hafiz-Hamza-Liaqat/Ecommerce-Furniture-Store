# RC5.4 — Independent Authorization Audit

**Date:** 2026-07-17  
**Scope:** Verify RC5.4 implementation against frozen RC5 documentation without
modifying application code further.  
**Companion report:** `docs/release/RC5.4-api-authorization.md`

---

## Verdict

**PASS** — RC5.4 remaining items are implemented within approved scope. The
Policy Engine remains the sole runtime authorizer. No RC5.5 record-level
load-before-authorize, field-level security, frontend, or session-format
changes were introduced.

---

## Requirement matrix

| # | Requirement | Result | Evidence |
|---|---|---|---|
| 1 | Only RC5.4 scope changed | **PASS** | Changes limited to catalog v3 API permission, handler `PolicyResource` population, upload Policy call, OpenAPI exposure config, tests, and RC5 docs |
| 2 | Policy Engine remains authoritative | **PASS** | Upload uses `identity.policyEngine.buildPrincipal` + `evaluate`; CQRS still goes through `AuthorizationBehavior`; no parallel authorizer |
| 3 | No Policy Engine algorithm change | **PASS** | `packages/identity/src/policy/policy-engine.ts` untouched |
| 4 | No new authorization framework | **PASS** | Reuses RBAC catalog, seed, Policy Engine, existing route/host options |
| 5 | Fail-closed upload behavior | **PASS** | Missing permission → `permission_missing` / 403; missing principal denied; company mismatch still denied before Policy |
| 6 | `dam.assets.upload` catalog + enforcement | **PASS** | `API_PERMISSION_DEFINITIONS`; seeded; granted to admin/editor/super_admin; upload route evaluates the code |
| 7 | PolicyResource owner/org/branch from payload | **PASS** | `companyResource` extended; create/update handlers with payload fields populate scope; get-by-id without ownership fields remain company-only (RC5.5 for persisted load) |
| 8 | No premature record-level ownership logic | **PASS** | No repository load inside `authorize()`; no post-load re-authorization |
| 9 | OpenAPI prod lockdown | **PASS** | Staging/production default `exposeOpenApi: false`; env `AFH_EXPOSE_OPENAPI`; route omitted when false |
| 10 | No new endpoints | **PASS** | Existing 18 routes; OpenAPI optionally unregistered |
| 11 | No frontend / dashboard / menu / session behavior redesign | **PASS** | Web package unchanged except rebuild; session projection naturally includes new canonical code when granted |
| 12 | Backward compatibility / overlap | **PASS** | 105 CQRS legacy map unchanged; RC5.3 canonical handler actions unchanged; legacy compat grants still seeded |
| 13 | Targeted authorization tests pass | **PASS** | New API authorization suite + catalog/seed updates green |
| 14 | Build / typecheck / lint / identity / api / web / runtime | **PASS** | All green on 2026-07-17 |

---

## Explicit non-goals confirmed not implemented

| Non-goal | Status |
|---|---|
| RC5.5 load-before-authorize / IDOR suite | Not started |
| Field-level security (RC5.5/RC5.6) | Not started |
| Dashboard authorization (plan RC5.3) | Not started |
| New CQRS handlers / HTTP APIs | None |
| Changing JWT/session token format | None |

---

## Residual notes (not blockers)

1. Many get-by-id / lifecycle handlers still authorize with company + id only
   because the payload does not carry owner/org/branch. Enforcing own/branch/
   org scopes against **persisted** records remains RC5.5.
2. `attributes` on `PolicyResource` are informational for future ABAC /
   Approval context; the current Policy Engine does not branch on them.
3. Existing company-scoped role assignments continue to pass `#scopeAllows`
   before own/org/branch matching is required — populating owner/org/branch
   does not alter allow/deny for typical company-scoped staff today, but it
   supplies the data RC5.5 needs.

---

## Conclusion

RC5.4 is complete and auditable. Safe to review and commit after approval.
Do not begin RC5.5 until explicitly requested.
