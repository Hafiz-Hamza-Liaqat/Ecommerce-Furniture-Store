# RC7.2a Planning Proposal — Sales List Implementation

- **Version:** 1.0
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Status:** APPROVED WITH MINOR REFINEMENTS — **implementation complete; awaiting review (not committed)**
- **Depends on:** RC7.1 committed (`1fb1a26`); ADR D56; V1 freeze Sales Included
- **Canonical slice:** `docs/rc7/05-Slice-Roadmap.md` §RC7.2a
- **V1 freeze:** `docs/rc7/03-V1-Scope-Freeze.md` §Sales (subordinate — no Included expansion)
- **Implementation reports:** `RC7.2a-sales-list-implementation.md`, `RC7.2a-verification-report.md`, `RC7.2a-audit-report.md`, `RC7.2a-test-summary.md`

---

## 1. Title

**RC7.2a — Sales List Implementation**

Register Sales `List*` query handlers for freeze-Included entities only, reusing the RC7.1 shared List* foundation.

---

## 2. Objectives

1. Deliver authoritative CQRS `List*` queries for **Opportunity**, **Quote**, and **SalesOrder**.
2. Reuse RC7.1 contracts + `buildAuthorizedListPage` (bounded authorized scan; authorized `totalCount` only — ADR D56).
3. Authorize via existing Sales read Policy actions + collection gate (`principalListScope`) — Policy sole authorizer.
4. Wire handlers into the existing Sales application composition / generic `POST /queries` path (no new HTTP routes).
5. Prove handlers with unit/integration-style tests (Policy filter, totals, paging) without UI de-fixturing.

## Non-goals

RC7.2a does **not**:

- De-fixture or change Sales UI / ModuleApp (RC7.3)
- Add Procurement, Inventory, Finance, CRM, Projects, or Service `List*` handlers
- Start RC7.2b or later
- Duplicate paging, filtering, or Policy logic from RC7.1
- Add SQL migrations (unless an unforeseen repository gap is proven — default: none)
- Change Workflow / Approval / Policy ownership
- Expand the V1 freeze Included set
- Implement Sales attachments, notes, import/export, or company-wide sales summary

---

## 3. Exact IN scope

| Item | Notes |
|---|---|
| `sales.ListOpportunity` | Query type + handler + AuthorizationSpec |
| `sales.ListQuote` | Query type + handler + AuthorizationSpec |
| `sales.ListSalesOrder` | Query type + handler + AuthorizationSpec |
| Request payloads | Compose `ListQueryRequest` / `QueryCriteria` (companyId, page/sort/filter/`q`) |
| Responses | `Page<T>` via `buildAuthorizedListPage` — authorized `totalCount` |
| Candidate fetch | Adapt existing Sales repository `listByCompany` (offset batches) |
| Policy | Collection gate + row filter using `sales.opportunities.read` / `sales.quotes.read` / `sales.orders.read` |
| Sort/filter allow-lists | Sales-owned field sets passed into RC7.1 validators |
| Registration | Sales application composition root only |
| Tests | Handler tests: allow/deny, authorized totals ≠ repo totals, paging |
| Docs | Implementation + verification + audit reports at close |

### Sales entities included (V1 freeze only)

| Entity | List query (proposed type string) | Read Policy action (existing) |
|---|---|---|
| Opportunity | `sales.ListOpportunity` | `sales.opportunities.read` |
| Quote | `sales.ListQuote` | `sales.quotes.read` |
| SalesOrder | `sales.ListSalesOrder` | `sales.orders.read` |

Existing Create/Update/Revise/Cancel/Get handlers remain authoritative and unchanged except for registration of the three new queries.

---

## 4. Exact OUT scope

| Forbidden | Deferred to |
|---|---|
| UI / ModuleApp live wiring / Production de-fixturing | RC7.3 |
| Procurement / Inventory / Finance / CRM / Projects / Service List* | RC7.2b–g |
| Shipments, RMA, price lists, territories, discounts, other sales UI entities | Excluded by freeze |
| Company-wide sales summary | Deferred (freeze) |
| Attachments / notes / import / export | RC7.6 / RC7.7 |
| New HTTP routes | Never — reuse `POST /queries` |
| New paging/Policy frameworks | Forbidden (RC7.1 / D56) |
| Workflow/Approval/Policy engine changes | Forbidden |
| Alternate total-count strategies | Forbidden (D56) |

---

## 5. Architecture constraints

| Constraint | Source |
|---|---|
| Policy Engine sole authorizer | D43, RC5 |
| `buildAuthorizedListPage` only path for List* totals | ADR D56 / RC7.1 |
| Repository totals never exposed on `Page.totalCount` | ADR D56 |
| Load-before-authorize unchanged for Get* | D45 |
| Workflow = lifecycle SSoT; entity status projection | D04, D54 |
| shared-kernel owns contracts; application owns Policy list integration; sales owns repositories | RC7.1 package ownership |
| No V1 freeze Included expansion without amendment | V1 freeze Authority |

---

## 6. Dependencies

| Dependency | Status |
|---|---|
| RC7.1 Shared List Foundation | Committed (`1fb1a26`) |
| ADR D56 | Accepted |
| V1 freeze Sales Included | Approved |
| Existing Sales repos `listByCompany` | Present (`packages/sales`) |
| Existing Sales Policy read codes | Present (`SalesPolicyActions.*Read`) |
| Human approval of this proposal | Required before code |

---

## 7. Deliverables

1. Three Sales `List*` query types, payloads, validators, handlers.
2. Composition registration in `@afh/sales-application`.
3. Candidate-batch adapters over existing `listByCompany` (no parallel list stack).
4. Tests covering Policy row filtering + authorized totals + paging.
5. RC7.2a implementation / verification / audit reports.
6. `docs/rc7/README.md` status update at commit time.

---

## 8. Reuse of RC7.1 shared foundation

Each handler **must**:

1. Authorize collection once (AuthorizationSpec + `principalListScope(readAction)`).
2. Validate sort/filter via `validateSortAllowList` / `validateFilterAllowList`.
3. Call **`buildAuthorizedListPage`** with:
   - `action` / `resourceType` / `toScope` from persisted Sales row fields;
   - `fetchCandidates` wrapping company-scoped repository batches;
   - `ListQueryRequest` from the query payload.
4. Return the resulting `Page<T>` unchanged (authorized `totalCount`).

**Must not** reimplement paging math, Policy row loops, or total aggregation.

---

## 9. Expected packages / files

| Location | Likely change |
|---|---|
| `packages/sales-application/src/constants.ts` | Add `ListOpportunity` / `ListQuote` / `ListSalesOrder` query types |
| `packages/sales-application/src/queries/` | List payloads |
| `packages/sales-application/src/handlers/query-handlers.ts` (or `list-handlers.ts`) | Three handlers |
| `packages/sales-application/src/validators/` | List payload validation |
| `packages/sales-application/src/composition/` | `registerQuery` for the three handlers |
| `packages/sales-application` tests | New List* tests |
| `packages/api` | **No new routes** — confirm existing query dispatch picks up registrations |
| `packages/web` | **Untouched** |
| `packages/persistence-sql` | **Default untouched** |
| `docs/release/RC7.2a-*` | Reports after implementation |
| `docs/rc7/README.md` | Status row |

**Explicitly untouched:** other `*-application` packages; Workflow/Approval/Policy engines; UI.

---

## 10. Acceptance criteria

| # | Criterion |
|---|---|
| S1 | `ListOpportunity`, `ListQuote`, `ListSalesOrder` registered and dispatchable via existing query transport |
| S2 | Each uses `buildAuthorizedListPage` (no custom totals) |
| S3 | `totalCount` reflects authorized rows only (tested) |
| S4 | Out-of-scope rows omitted; fail-closed on missing principal / Policy errors |
| S5 | Sort/filter fields restricted to Sales allow-lists |
| S6 | Existing Get/Create/Update lifecycle handlers still pass |
| S7 | **Zero** UI changes; **zero** other-module List handlers |
| S8 | Build, typecheck, lint, sales-application tests, runtime verify/harden/accept PASS |
| S9 | V1 freeze unchanged; docs/reports complete |

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Repo `Page.totalCount` accidentally returned | Always return helper output; tests assert ≠ raw repo total when scopes filter |
| Missing owner/org/branch on rows → empty lists for scoped users | Fail-closed per D46; document data-quality residual for RC7.4 |
| Filter/`q` semantics underspecified | Start with allow-listed fields + optional `q` mapped to known text columns only; reject unknown fields |
| Accidental UI wiring | OUT list + review gate (RC7.3 only) |
| Scope creep to other sales entities | Freeze Included only |

---

## 12. Verification plan

| Gate | When |
|---|---|
| Proposal approval | Before code |
| Handler unit tests | During implementation |
| `npm run build` / `typecheck` / `lint` | Before commit |
| Sales-application (+ shared-kernel/application regression) tests | Before commit |
| Confirm `git diff` has no web/api-routes/other-modules List* | Before commit |
| Runtime verify / harden / accept | Before commit |
| RC7.2a verification + audit | Before commit approval |

---

## 13. Stop rule

- This document is **planning only**.
- **Do not implement RC7.2a** until this proposal is explicitly approved.
- **Do not start RC7.2b**, UI de-fixturing (RC7.3), or any other module List work from this proposal.

---

## Suggested future commit message (implementation — not now)

```
feat(rc7.2a): add Sales List* queries via authorized list foundation

Register ListOpportunity, ListQuote, and ListSalesOrder using
buildAuthorizedListPage (ADR D56). No UI de-fixturing or other modules.
```
