# RC7.2b Planning Proposal — Procurement List Implementation

- **Version:** 1.1
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Status:** APPROVED (v1.1) — **implementation complete; awaiting review (not committed)**
- **Depends on:** RC7.2a committed (`2e811cf`); RC7.1 (`1fb1a26`); ADR D56; V1 freeze Procurement Included
- **Canonical slice:** `docs/rc7/05-Slice-Roadmap.md` §RC7.2b
- **V1 freeze:** `docs/rc7/03-V1-Scope-Freeze.md` §Procurement (subordinate — no Included expansion)
- **Pattern reference:** RC7.2a Sales List* (approved implementation pattern)
- **Approval refinements:** repository candidate contract; company-before-Policy sequence; Procurement ownership; fail-closed sort; `q` ≠ Search module; Get/lifecycle regression; bounded scan ceiling; RC7.2a-shaped closeout docs
- **Implementation reports:** `RC7.2b-procurement-list-implementation.md`, `RC7.2b-verification-report.md`, `RC7.2b-audit-report.md`, `RC7.2b-test-summary.md`

---

## 1. Title

**RC7.2b — Procurement List Implementation**

Register Procurement `List*` query handlers for freeze-Included entities only, reusing the RC7.1 shared List* foundation exactly as RC7.2a did for Sales.

**Procurement remains the owner of Procurement aggregates and repositories. RC7.2b introduces only List\* query handlers and does not change domain ownership.**

---

## 2. Objectives

1. Deliver authoritative CQRS `List*` queries for **Supplier**, **PurchaseRequisition**, and **PurchaseOrder**.
2. Reuse RC7.1 contracts + **unmodified** `buildAuthorizedListPage` (bounded authorized scan; authorized `totalCount` only — ADR D56).
3. Authorize via existing Procurement read Policy actions + collection gate (`principalListScope`) — Policy sole authorizer.
4. Wire handlers into the existing Procurement application composition / generic `POST /queries` path (no new HTTP routes).
5. Prove handlers with the same required test matrix as RC7.2a (Policy filter, totals, paging, fail-closed) plus Get/lifecycle regression, without UI de-fixturing.

## Non-goals

RC7.2b does **not**:

- De-fixture or change Procurement UI / ModuleApp (RC7.3)
- Add Sales, Inventory, Finance, CRM, Projects, or Service `List*` handlers
- Start RC7.2c or later
- Duplicate paging, filtering, or Policy logic from RC7.1
- Modify RC7.1 foundation (`packages/application` / `packages/shared-kernel` List* helpers)
- Add SQL migrations (unless an unforeseen repository gap is proven — default: none)
- Change Workflow / Approval / Policy ownership
- Change Procurement domain/repository ownership
- Expand the V1 freeze Included set
- Implement attachments, notes, import/export, scorecards, or sourcing engines
- Implement Search-module indexing or full-text search (RC7.12)

---

## 3. Exact IN scope

| Item | Notes |
|---|---|
| `procurement.ListSupplier` | Query type + handler + AuthorizationSpec |
| `procurement.ListPurchaseRequisition` | Query type + handler + AuthorizationSpec |
| `procurement.ListPurchaseOrder` | Query type + handler + AuthorizationSpec |
| Request payloads | Compose `ListQueryRequest` / `QueryCriteria` (companyId, page/sort/filter/`q`) |
| Responses | `Page<T>` via `buildAuthorizedListPage` — authorized `totalCount` |
| Candidate fetch | Adapt existing Procurement repository `listByCompany` (offset batches) |
| Policy | Collection gate + row filter using existing read actions (below) |
| Sort/filter allow-lists | Procurement-owned field sets passed into RC7.1 validators |
| Registration | Procurement application composition root only |
| Tests | Per-handler matrix + Get/lifecycle regression |
| Docs | Implementation + verification + audit + test summary (RC7.2a structure) |

### Procurement entities included (V1 freeze only)

| Entity | List query (proposed type string) | Read Policy action (existing) | Resource type (align Get*) | Row scope fields for `toScope` |
|---|---|---|---|---|
| Supplier | `procurement.ListSupplier` | `procurement.suppliers.read` | `supplier` | `organizationId` ← `identityOrganizationId` (no `ownerUserId` / `branchId` on entity) |
| PurchaseRequisition | `procurement.ListPurchaseRequisition` | `procurement.requisitions.read` | `requisition` | `ownerUserId` ← `requestedByUserId` |
| PurchaseOrder | `procurement.ListPurchaseOrder` | `procurement.purchase_orders.read` | `purchase_order` | company + attributes as today (`supplierId`, etc.); no persisted owner/branch on PO model |

Existing Create/Update/Submit/Issue/Cancel/Get handlers remain authoritative and unchanged except for registration of the three new queries.

**Proven repo surface (already present):**

- `SupplierRepository.listByCompany`
- `PurchaseRequisitionRepository.listByCompany`
- `PurchaseOrderRepository.listByCompany`

**Proven Policy codes (already present in `ProcurementPolicyActions`):**

- `SupplierRead`, `RequisitionRead`, `PurchaseOrderRead`

---

## 4. Exact OUT scope

| Forbidden | Deferred to |
|---|---|
| UI / ModuleApp live wiring / Production de-fixturing | RC7.3 |
| Sales / Inventory / Finance / CRM / Projects / Service List* | RC7.2a done / RC7.2c–g |
| Supplier scorecards, advanced sourcing, blanket agreements | Excluded by freeze |
| Inventory receipt ownership | Inventory module |
| Attachments on PO/PR | RC7.6 |
| PO/PR import/export | RC7.7 / Future |
| Search-module full-text / index search | RC7.12 |
| New HTTP routes | Never — reuse `POST /queries` |
| New paging/Policy frameworks | Forbidden (RC7.1 / D56) |
| Workflow/Approval/Policy engine changes | Forbidden |
| Alternate total-count strategies | Forbidden (D56) |
| V1 freeze Included expansion | Forbidden without amendment |
| Domain ownership transfer out of Procurement | Forbidden |

---

## 5. Architecture constraints

| Constraint | Source |
|---|---|
| Policy Engine sole authorizer | D43, RC5 |
| `buildAuthorizedListPage` only path for List* totals | ADR D56 / RC7.1 |
| Repository totals never exposed on `Page.totalCount` | ADR D56 |
| Load-before-authorize unchanged for Get* | D45 |
| Workflow = lifecycle SSoT; entity status projection | D04, D54 |
| shared-kernel owns contracts; application owns Policy list integration; **Procurement owns Procurement aggregates and repositories** | RC7 ownership / RC7.1 package ownership |
| No V1 freeze Included expansion without amendment | V1 freeze Authority |

Continue to enforce (same as RC7.2a refinements):

- Workflow remains lifecycle owner.
- Approval remains approval owner.
- Policy remains the sole authorization engine.
- `buildAuthorizedListPage` from RC7.1 is reused **without modification**.
- No duplicate paging or Policy logic.
- Repository totals are never exposed.
- `totalCount` always represents the authorized population after Policy row filtering (ADR D56).

---

## 5a. Repository contract (refinement)

Every repository used by RC7.2b must expose the same **bounded candidate-fetch** pattern expected by `buildAuthorizedListPage`:

- Input: company id + page/offset batch bound.
- Output: a **bounded**, **company-scoped** candidate batch (existing `listByCompany(companyId, page?)` is the intended surface).

`buildAuthorizedListPage` remains the **only** owner of:

| Concern | Owner |
|---|---|
| Authorized paging | `buildAuthorizedListPage` only |
| Authorized totals (`Page.totalCount`) | `buildAuthorizedListPage` only |
| Policy row filtering | `buildAuthorizedListPage` → `filterAuthorizedRecords` only |

Repositories must **only** return bounded company-scoped candidate batches. They must not compute authorized totals, apply Policy decisions, or page the authorized sequence.

**Performance (D56 / RC7.1):** Maximum candidate scan remains bounded (`LIST_MAX_CANDIDATE_SCAN` / helper ceiling) and must **never** degrade into an unbounded repository scan.

---

## 5b. Company isolation sequence (refinement)

Every Procurement repository query used for List* **must be company-scoped before** Policy row filtering. Policy is **not** a replacement for repository scoping.

**Required sequence:**

```
company scope
    ↓
repository candidate batch (company-scoped, bounded)
    ↓
Policy row filtering (via buildAuthorizedListPage)
    ↓
authorized page
    ↓
response
```

IDOR / adapter-leak tests still prove Policy company isolation as a second line of defense, but the first line is mandatory repository company scoping.

---

## 6. Required implementation constraints

Each handler must:

1. Define an `AuthorizationSpec`.
2. Use collection authorization via `principalListScope(readAction)`.
3. Load only a bounded **company-scoped** candidate set (via existing `listByCompany`).
4. Pass candidates through Policy row filtering via **`buildAuthorizedListPage`** (which calls `filterAuthorizedRecords` internally — do not double-filter or reimplement).
5. Build the response using `buildAuthorizedListPage`.
6. Return the shared `Page<T>` / authorized list contract.

**No handler may** implement its own paging, authorization, filtering (Policy), or total-count calculation.

Domain sort/filter/`q` allow-lists remain Procurement-owned candidate preparation (same pattern as RC7.2a `list-support`), not a parallel authorized-paging stack.

---

## 6a. Sorting (refinement)

Proposed allow-lists (below) are the starting field sets.

**Unknown sort fields must fail validation.** They must **never** silently fall back to a default sort.

Use RC7.1 `validateSortAllowList` (and reject unknown filter fields via `validateFilterAllowList` the same way).

---

## 6b. Search `q` (refinement)

`q` performs **bounded application search only** over allow-listed text fields on already company-scoped candidates (module-owned candidate prep).

It is **not** Search-module functionality. The Search module remains **RC7.12** and is out of scope for RC7.2b.

---

## 7. Dependencies

| Dependency | Status |
|---|---|
| RC7.1 Shared List Foundation | Committed (`1fb1a26`) |
| RC7.2a Sales List* (pattern proof) | Committed (`2e811cf`) |
| ADR D56 | Accepted |
| V1 freeze Procurement Included | Approved |
| Existing Procurement repos `listByCompany` | Present (`packages/procurement`) |
| Existing Procurement Policy read codes | Present (`ProcurementPolicyActions.*Read`) |
| Planning refinements (v1.1) | Incorporated |
| Explicit implementation approval | **Required before code** |

---

## 8. Deliverables (after implementation approval + engineering)

1. Three Procurement `List*` query types, payloads, validators, handlers.
2. Composition registration in `@afh/procurement-application`.
3. Candidate-batch adapters over existing `listByCompany` (no parallel list stack).
4. Tests covering the required matrix + Get/lifecycle regression (below).
5. Closeout docs following the **exact RC7.2a structure**:
   - Implementation report
   - Verification report
   - Audit report
   - Test summary
6. `docs/rc7/README.md` status update at commit time.

---

## 9. Reuse of RC7.1 shared foundation

Each handler **must**:

1. Authorize collection once (`AuthorizationSpec` + `principalListScope(readAction)`).
2. Validate sort/filter via `validateSortAllowList` / `validateFilterAllowList` (**fail closed** on unknown fields).
3. Call **`buildAuthorizedListPage`** with:
   - `action` / `resourceType` / `toScope` from persisted Procurement row fields;
   - `fetchCandidates` wrapping **company-scoped** repository batches;
   - `ListQueryRequest` from the query payload.
4. Return the resulting `Page<T>` unchanged (authorized `totalCount`).

**Must not** reimplement paging math, Policy row loops, or total aggregation.

---

## 10. Expected packages / files

| Location | Likely change |
|---|---|
| `packages/procurement-application/src/constants.ts` | Add `ListSupplier` / `ListPurchaseRequisition` / `ListPurchaseOrder` |
| `packages/procurement-application/src/queries/` | List payloads (`ListQueryRequest`) |
| `packages/procurement-application/src/handlers/list-handlers.ts` (+ support) | Three handlers |
| `packages/procurement-application/src/validators/` | List payload validation + allow-lists |
| `packages/procurement-application/src/composition/` | `registerQuery` × 3 |
| `packages/procurement-application` tests + `test` script | Required List* matrix + regression |
| `packages/api` | **No new routes** |
| `packages/web` | **Untouched** |
| `packages/persistence-sql` | **Default untouched** |
| `packages/procurement` domain/repos | **Default untouched** (ownership unchanged; only consumed) |
| `docs/release/RC7.2b-*` | Reports after implementation (RC7.2a structure) |
| `docs/rc7/README.md` | Status row at commit |

**Explicitly untouched:** Sales and other `*-application` packages; Workflow/Approval/Policy engines; UI; RC7.1 foundation sources; Search module.

### Proposed sort/filter allow-lists (planning defaults — refine at implementation if needed)

| Entity | Sort (proposed) | Filter (proposed) | Application `q` fields (not Search module) |
|---|---|---|---|
| Supplier | `updatedAt`, `createdAt`, `name`, `code`, `status` | `status`, `code`, `name`, `categoryId`, `identityOrganizationId` | `name`, `code` |
| PurchaseRequisition | `updatedAt`, `createdAt`, `number`, `status` | `status`, `number`, `requestedByUserId`, `projectId`, `warehouseId` | `number`, `notes` |
| PurchaseOrder | `updatedAt`, `createdAt`, `number`, `status` | `status`, `number`, `supplierId`, `requisitionId`, `projectId`, `warehouseId` | `number` |

Unknown sort (and filter) fields → **validation failure**, never silent fallback.

---

## 11. Required tests

For **each** Procurement List* handler, include tests for:

- Happy path
- Policy deny
- Company isolation
- IDOR negative cases
- Authorized `totalCount`
- Empty authorized result
- Pagination
- Sorting
- Filtering
- Search (`q` application-bounded)
- Invalid sort field (must fail; no silent fallback)
- Invalid filter
- Missing principal (fail closed)
- Policy evaluation failure (fail closed)

### Required regression assertions (refinement)

| Assertion | Intent |
|---|---|
| Existing Get handlers still behave identically | Protect against unintended registration / composition side effects |
| Existing Create/Update/Lifecycle tests remain green | Same — composition must not break write/lifecycle paths |

---

## 12. Acceptance criteria

| # | Criterion |
|---|---|
| P1 | `ListSupplier`, `ListPurchaseRequisition`, `ListPurchaseOrder` registered and dispatchable via existing query transport |
| P2 | Each uses `buildAuthorizedListPage` (no custom totals) |
| P3 | `totalCount` reflects authorized rows only (tested) |
| P4 | Out-of-scope rows omitted; fail-closed on missing principal / Policy errors |
| P5 | Sort/filter fields restricted to Procurement allow-lists; unknown sort fields fail validation |
| P6 | Existing Get handlers behave identically; Create/Update/Lifecycle tests remain green |
| P7 | **Zero** UI changes; **zero** other-module List handlers; **zero** RC7.1 foundation edits; domain ownership unchanged |
| P8 | Company-scoped repository candidates **before** Policy; scan remains bounded (never unbounded) |
| P9 | Build, typecheck, lint, procurement-application tests, runtime verify/harden/accept PASS |
| P10 | V1 freeze unchanged; RC7.2a-structured closeout docs complete |

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Repo `Page.totalCount` accidentally returned | Always return helper output; tests assert ≠ raw repo total when scopes filter |
| Supplier / PO lack `ownerUserId` → empty lists for `own`-scoped principals | Fail-closed per D46; align `toScope` with existing Get* / summary patterns; document residual for RC7.4 |
| Filter/`q` semantics underspecified | Allow-listed fields + bounded application `q` only; reject unknown fields; Search module deferred to RC7.12 |
| Accidental UI wiring | OUT list + review gate (RC7.3 only) |
| Scope creep beyond three freeze entities | Freeze Included only |
| Copying Sales list-support instead of Procurement-owned code | Mirror pattern in `@afh/procurement-application` only; do not couple packages |
| Unbounded candidate scan | Enforce RC7.1 ceiling; never widen into unbounded repo walk |
| Registration side effects on Get/lifecycle | Explicit regression assertions |

---

## 14. Verification plan

| Gate | When |
|---|---|
| Planning refinements incorporated (this v1.1) | Done |
| Explicit implementation approval | **Before code** |
| Handler unit tests + Get/lifecycle regression | During implementation |
| `npm run build` / `typecheck` / `lint` | Before commit |
| Procurement-application (+ shared-kernel/application regression) tests | Before commit |
| Confirm `git diff` has no web/api-routes/other-modules List* / no RC7.1 edits | Before commit |
| Runtime verify / harden / accept | Before commit |
| RC7.2b verification + audit (RC7.2a doc structure) | Before commit approval |

---

## 15. Stop rule

- Refinements from planning review are incorporated in **v1.1**.
- **Do not implement RC7.2b** until implementation is **explicitly approved**.
- **Do not start RC7.2c**, UI de-fixturing (RC7.3), Search (RC7.12), or any other module List work from this proposal.
- Leave this planning file uncommitted until the user requests a docs commit (or fold into the RC7.2b implementation commit after approval).

---

## Suggested future commit message (implementation — not now)

```
feat(rc7.2b): add Procurement List* queries using shared authorized list foundation

Implement ListSupplier, ListPurchaseRequisition, and ListPurchaseOrder using
principalListScope and buildAuthorizedListPage from RC7.1.
No UI, APIs, SQL, migrations, or other module changes.
```
