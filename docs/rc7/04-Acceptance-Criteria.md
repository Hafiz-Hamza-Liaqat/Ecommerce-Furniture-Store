# RC7.0 — Acceptance Criteria

- **Version:** 1.0
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Applies to:** Complete RC7 (after RC7.1 through RC7.8 and later), judged against the V1 freeze [`03-V1-Scope-Freeze.md`](./03-V1-Scope-Freeze.md)

## Functional acceptance

| # | Criterion |
|---|---|
| F1 | Every **Included** entity has authoritative create/get (where claimed) and **`List*`** with filter, sort, page/cursor, and search as defined in RC7.1 |
| F2 | **Production profile** operational lists for Included entities use live CQRS — **no fixture fallback** |
| F3 | **Demo/Test profile** may use fixtures only when explicitly selected |
| F4 | Manufacturing V1 delivers only the frozen production-order subset — no BOM/routing/capacity/shop floor/MRP/cost/maintenance |
| F5 | HR / CMS / Notifications / Reporting / Search V1 match freeze subsets only |
| F6 | DAM provides production binary/object storage; module attachments reference DAM asset ids |
| F7 | Notes/comments/activity are server-backed for entities claimed in RC7.6 |
| F8 | Import/export/bulk (RC7.7) enforce Policy, audit, company isolation, and optimistic concurrency |
| F9 | Migration, seed, reconciliation, and data-quality acceptance tests pass for Included data |
| F10 | No RC8–RC15 charter work is required for RC7 closeout |

## Architectural acceptance

| # | Criterion |
|---|---|
| A1 | Workflow Engine remains lifecycle SSoT; entity status remains projection (D04/D54) |
| A2 | Approval Engine remains approval owner |
| A3 | Policy Engine remains sole runtime authorization authority (D43) |
| A4 | DAM owns files; Reporting and Search remain **read models only; never business owners** |
| A5 | No new authorization framework; no SQL second authz / RLS duplicating Policy (D46 rejected alternatives) |
| A6 | No unapproved cross-module write ownership or parallel status machines (D34 rejected) |
| A7 | Cross-module read models introduced only with ADR |

## Authorization requirements

| # | Criterion |
|---|---|
| Z1 | Every new command/query ships with AuthorizationSpec |
| Z2 | Mutating and Get paths use load-before-authorize (D45) where records are targeted by id |
| Z3 | `List*` uses Policy row filtering via shared helpers (`filterAuthorizedRecords` / equivalent) |
| Z4 | Collection gate hints remain action-aware (`principalListScope` / D47) |
| Z5 | Frontend gates remain presentation-only — never the security boundary |
| Z6 | Company header/binding isolation preserved; branch scope where resources declare it |

## Policy requirements

| # | Criterion |
|---|---|
| P1 | Allow and deny decisions go through Policy Engine only |
| P2 | `List*` **totals and page membership** reflect Policy row filtering (D46) |
| P3 | Out-of-scope row existence is not leaked via totals or ids |
| P4 | Import/export/bulk actions are distinct Policy actions where risk warrants |
| P5 | Scoped principals with missing data scope fields fail closed (empty), not open |

## Audit requirements

| # | Criterion |
|---|---|
| U1 | Policy deny (and allow where RC5.9 requires) continue to emit security audit evidence |
| U2 | Mutating operational commands emit domain/security audit as established by module patterns |
| U3 | Import/export/bulk operations emit audit records including actor, company, entity set summary, and outcome |
| U4 | Audit trails are queryable in production composition (no silent swallow) |

## Testing requirements

| # | Criterion |
|---|---|
| T1 | Handler tests: happy path, Policy deny, company isolation, IDOR negatives |
| T2 | `List*` tests: filter/sort/page, empty page, totals after Policy row filtering, scoped principal subset |
| T3 | Concurrency tests: stale `expectedVersion` fails closed — never silently overwrites state |
| T4 | Migration/seed idempotency tests |
| T5 | Reconciliation/DQ acceptance suite for Included modules |
| T6 | Web tests: Production profile does not fall back to fixtures for Included lists |
| T7 | Package gates: identity, api, web, platform, persistence-sql, and touched `*-application` packages green |

## Release requirements

| # | Criterion |
|---|---|
| R1 | `npm run build`, `typecheck`, `lint` PASS |
| R2 | Runtime `verify`, `harden`, `accept` PASS |
| R3 | Per-slice implementation, verification, and audit docs (RC6 pattern) |
| R4 | Final RC7 verification + audit + checklist |
| R5 | Working tree contains only approved RC7 scope at each commit |
| R6 | Annotated release tags only after human approval; no push until authorized |
| R7 | RC8 not started as part of RC7 closeout |
| R8 | No Production profile path depends on browser-local persistence for Included entities |

## RC7.0 (this slice) acceptance

| # | Criterion |
|---|---|
| D1 | `docs/rc7/` pack complete: README, 01–05 |
| D2 | V1 freeze covers all required modules with Included/Excluded/Deferred/Future |
| D3 | Slice roadmap matches freeze and architecture ownership |
| D4 | No application/handler/API/migration/UI/test code in the RC7.0 change set |
| D5 | Planning report + planning audit produced; commit only after review |
