# RC7.2c Planning Proposal — Inventory List Implementation

- **Version:** 1.1
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Status:** APPROVED (v1.1) — **implementation complete; awaiting review (not committed)**
- **Depends on:** RC7.2b committed (`d01c880`); RC7.2a (`2e811cf`); RC7.1 (`1fb1a26`); ADR D56; V1 freeze Inventory Included
- **Canonical slice:** `docs/rc7/05-Slice-Roadmap.md` §RC7.2c
- **V1 freeze:** `docs/rc7/03-V1-Scope-Freeze.md` §Inventory (subordinate — no Included expansion)
- **Pattern reference:** RC7.2a Sales + RC7.2b Procurement List* (approved implementation pattern + refinements)
- **Implementation reports:** `RC7.2c-inventory-list-implementation.md`, `RC7.2c-verification-report.md`, `RC7.2c-audit-report.md`, `RC7.2c-test-summary.md`

---

## 1. Title

**RC7.2c — Inventory List Implementation**

Register Inventory `List*` query handlers for freeze-Included **minimum** entities only, reusing the RC7.1 shared List* foundation exactly as RC7.2a/2b.

**Inventory remains the owner of Inventory aggregates and repositories. RC7.2c introduces only List\* query handlers and does not change domain ownership.** Stock quantity math, reservation/allocation engines, and valuation remain out of handlers (Rules / existing command paths).

---

## 2. Objectives

1. Deliver authoritative CQRS `List*` queries for **InventoryItem**, **Warehouse**, and **Stock** (`StockPosition`).
2. Reuse RC7.1 contracts + **unmodified** `buildAuthorizedListPage` (bounded authorized scan; authorized `totalCount` only — ADR D56).
3. Authorize via existing Inventory read Policy actions + collection gate (`principalListScope`) — Policy sole authorizer.
4. Wire handlers into the existing Inventory application composition / generic `POST /queries` path (no new HTTP routes).
5. Prove handlers with the RC7.2b test matrix (Policy filter, totals, paging, fail-closed) plus Get/lifecycle regression, without UI de-fixturing.

## Non-goals

RC7.2c does **not**:

- De-fixture or change Inventory UI / ModuleApp (RC7.3)
- Add Sales, Procurement, Finance, CRM, Projects, or Service `List*` handlers
- Start RC7.2d or later
- Add `List*` for ledger / batch / lot / serial (freeze: **only if** production UI treats them as primary grids — **not** claimed for RC7.2c; minimum is Item, Warehouse, Stock)
- Add `ListStorageLocation` (not named in freeze Included List* set)
- Duplicate paging, filtering, or Policy logic from RC7.1
- Modify RC7.1 foundation (`packages/application` / `packages/shared-kernel` List* helpers) unless a genuine defect is proven
- Change Workflow / Approval / Policy ownership
- Change Inventory domain ownership or invent a second stock ledger
- Expand the V1 freeze Included set
- Implement dual-branch transfer Policy completeness (→ RC7.4), attachments (→ RC7.6), import/export / cycle-count bulk (→ RC7.7 / Future)
- Implement Search-module indexing or full-text search (RC7.12)
- Implement WMS robotics / wave planning / manufacturing consumption as a second ledger

---

## 3. Exact IN scope

| Item | Notes |
|---|---|
| `inventory.ListInventoryItem` | Query type + handler + AuthorizationSpec |
| `inventory.ListWarehouse` | Query type + handler + AuthorizationSpec |
| `inventory.ListStock` | Query type + handler + AuthorizationSpec (lists `StockPosition`) |
| Request payloads | Compose `ListQueryRequest` / `QueryCriteria` (companyId, page/sort/filter/`q`) |
| Responses | `Page<T>` via `buildAuthorizedListPage` — authorized `totalCount` |
| Candidate fetch | Company-scoped bounded batches (see §5a — Stock gap) |
| Policy | Collection gate + row filter using existing read actions (below) |
| Sort/filter allow-lists | Inventory-owned field sets passed into RC7.1 validators |
| Registration | Inventory application composition root only |
| Tests | Per-handler matrix + Get/lifecycle regression |
| Docs | Implementation + verification + audit + test summary (RC7.2a/2b structure) |

### Inventory entities included (V1 freeze minimum only)

| Entity | List query (proposed type string) | Read Policy action (existing) | Resource type (align Get*/summary) | Row scope fields for `toScope` |
|---|---|---|---|---|
| InventoryItem | `inventory.ListInventoryItem` | `inventory.items.read` | `inventory_item` | `id` + `companyId` (no owner/org/branch on entity — same as summary) |
| Warehouse | `inventory.ListWarehouse` | `inventory.warehouses.read` | `warehouse` | `id` + `companyId` + `branchId` ← persisted `branchId` |
| Stock (`StockPosition`) | `inventory.ListStock` | `inventory.stock.read` | `stock` | `id` + `companyId` (no owner/org/branch on position; branch residual via warehouse is RC7.4 if needed) |

Existing Create/Update/Receive/Adjust/Reserve/Release/Transfer/Get handlers remain authoritative and unchanged except for registration of the three new queries.

**Proven Policy codes (already present in `InventoryPolicyActions`):**

- `ItemRead`, `WarehouseRead`, `StockRead`

**Proven repo surface:**

| Repository | Company-scoped `listByCompany` today |
|---|---|
| `InventoryRepository` | **Yes** |
| `WarehouseRepository` | **Yes** |
| `StockRepository` | **No** — only `listByItem(companyId, inventoryItemId, page?)` |

---

## 4. Exact OUT scope

| Forbidden | Deferred to |
|---|---|
| UI / ModuleApp live wiring / Production de-fixturing | RC7.3 |
| Sales / Procurement / Finance / CRM / Projects / Service List* | RC7.2a–b done / RC7.2d–g |
| `ListStockLedger` / `ListBatch` / `ListLot` / `ListSerial` | Freeze optional; **out of RC7.2c** unless freeze amended |
| `ListStorageLocation` | Not in freeze Included List* names |
| Dual-branch transfer Policy/resource completeness | RC7.4 |
| Attachments on items | RC7.6 |
| Stock import/export / cycle-count bulk | RC7.7 / Future |
| Manufacturing second stock ledger / WMS robotics | Excluded by freeze |
| Search-module full-text / index search | RC7.12 |
| New HTTP routes | Never — reuse `POST /queries` |
| New paging/Policy frameworks | Forbidden (RC7.1 / D56) |
| Workflow/Approval/Policy engine changes | Forbidden |
| Alternate total-count strategies | Forbidden (D56) |
| V1 freeze Included expansion | Forbidden without amendment |
| Domain ownership transfer out of Inventory | Forbidden |

---

## 5. Architecture constraints

| Constraint | Source |
|---|---|
| Policy Engine sole authorizer | D43, RC5 |
| `buildAuthorizedListPage` only path for List* totals | ADR D56 / RC7.1 |
| Repository totals never exposed on `Page.totalCount` | ADR D56 |
| Load-before-authorize unchanged for Get* | D45 |
| Workflow = lifecycle SSoT; entity status projection | D04, D54 |
| Stock / Inventory module owns stock | RC7 ownership freeze |
| shared-kernel owns contracts; application owns Policy list integration; **Inventory owns Inventory aggregates and repositories** | RC7 ownership / RC7.1 package ownership |
| Search / Reporting = read models only | RC7 architecture |
| No V1 freeze Included expansion without amendment | V1 freeze Authority |

Continue to enforce (RC7.2a/2b refinements):

- Workflow remains lifecycle owner.
- Approval remains approval owner.
- Policy remains the sole authorization engine.
- `buildAuthorizedListPage` from RC7.1 is reused **without modification**.
- No duplicate paging or Policy logic.
- Repository totals are never exposed.
- `totalCount` always represents the authorized population after Policy row filtering (ADR D56).

---

## 5a. Repository contract

Every repository used by RC7.2c must expose the same **bounded candidate-fetch** pattern expected by `buildAuthorizedListPage`:

- Input: company id + page/offset batch bound.
- Output: a **bounded**, **company-scoped** candidate batch.

`buildAuthorizedListPage` remains the **only** owner of:

| Concern | Owner |
|---|---|
| Authorized paging | `buildAuthorizedListPage` only |
| Authorized totals (`Page.totalCount`) | `buildAuthorizedListPage` only |
| Policy row filtering | `buildAuthorizedListPage` → `filterAuthorizedRecords` only |

Repositories must **only** return bounded company-scoped candidate batches. They must not compute authorized totals, apply Policy decisions, or page the authorized sequence.

**Performance (D56 / RC7.1):** Maximum candidate scan remains bounded (`LIST_MAX_CANDIDATE_SCAN` / helper ceiling) and must **never** degrade into an unbounded repository scan.

### Known gap — `StockRepository.listByCompany`

Today `StockRepository` exposes `listByItem` only. RC7.2c **requires** company-scoped candidates for `ListStock`.

Adding `listByCompany()` is a **repository contract completion** required to satisfy the existing RC7.1 authorized-list abstraction (`buildAuthorizedListPage` candidate fetch). It is **not** a new business capability, schema change, or V1 scope expansion.

**Resolution (minimal contract completion only):**

1. Add `listByCompany(companyId, page?)` to `StockRepository` in `@afh/inventory` (same signature as Item/Warehouse).
2. Implement it on the existing SQL document adapter (`createSqlStockRepository`) via existing company-scoped document listing — **no SQL migration / schema change** expected (documents already store `company_id`).
3. Do **not** invent Policy in the repository or walk all items unbounded to synthesize a company list.

If implementation discovers a genuine persistence defect beyond this contract fill, stop and report before inventing alternate total strategies. No SQL migrations unless a genuine persistence defect is proven.

---

## 5b. Company isolation sequence

Every Inventory repository query used for List* **must be company-scoped before** Policy row filtering. Policy is **not** a replacement for repository scoping.

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
3. Load only a bounded **company-scoped** candidate set.
4. Pass candidates through Policy row filtering via **`buildAuthorizedListPage`** (which calls `filterAuthorizedRecords` internally — do not double-filter or reimplement).
5. Build the response using `buildAuthorizedListPage`.
6. Return the shared `Page<T>` / authorized list contract.

**No handler may** implement its own paging, authorization, filtering (Policy), or total-count calculation.

Domain sort/filter/`q` allow-lists remain Inventory-owned candidate preparation (same pattern as RC7.2a/2b `list-support`), not a parallel authorized-paging stack.

---

## 6a. Sorting

Proposed allow-lists (below) are the starting field sets.

**Unknown sort fields must fail validation.** They must **never** silently fall back to a default sort.

Use RC7.1 `validateSortAllowList` (and reject unknown filter fields via `validateFilterAllowList` the same way).

---

## 6b. Search `q`

`q` performs **bounded application search only** over allow-listed text fields on already company-scoped candidates (module-owned candidate prep).

It is **not** Search-module functionality. The Search module remains **RC7.12** and is out of scope for RC7.2c.

---

## 7. Dependencies

| Dependency | Status |
|---|---|
| RC7.1 Shared List Foundation | Committed (`1fb1a26`) |
| RC7.2a Sales List* (pattern proof) | Committed (`2e811cf`) |
| RC7.2b Procurement List* (pattern + refinements) | Committed (`d01c880`) |
| ADR D56 | Accepted |
| V1 freeze Inventory Included (minimum) | Approved |
| Existing Item/Warehouse `listByCompany` | Present |
| Stock `listByCompany` | **Missing — see §5a** |
| Existing Inventory Policy read codes | Present (`InventoryPolicyActions.*Read`) |
| Human approval of this proposal | **Required before code** |

---

## 8. Deliverables (after implementation approval + engineering)

1. Three Inventory `List*` query types, payloads, validators, handlers.
2. Composition registration in `@afh/inventory-application`.
3. Candidate-batch adapters over company-scoped repository batches (including Stock `listByCompany` fill if approved).
4. Tests covering the required matrix + Get/lifecycle regression (below).
5. Closeout docs following the **exact RC7.2a/2b structure**:
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
   - `action` / `resourceType` / `toScope` from persisted Inventory row fields;
   - `fetchCandidates` wrapping **company-scoped** repository batches;
   - `ListQueryRequest` from the query payload.
4. Return the resulting `Page<T>` unchanged (authorized `totalCount`).

**Must not** reimplement paging math, Policy row loops, or total aggregation.

**Must not** modify RC7.1 foundation sources unless a genuine defect is discovered and separately approved.

---

## 10. Expected packages / files

| Location | Likely change |
|---|---|
| `packages/inventory-application/src/constants.ts` | Add `ListInventoryItem` / `ListWarehouse` / `ListStock` |
| `packages/inventory-application/src/queries/` | List payloads (`ListQueryRequest`) |
| `packages/inventory-application/src/handlers/list-handlers.ts` (+ support) | Three handlers |
| `packages/inventory-application/src/validators/` | List payload validation + allow-lists |
| `packages/inventory-application/src/composition/` | `registerQuery` × 3 |
| `packages/inventory-application` tests + `test` script | Required List* matrix + regression |
| `packages/inventory` `StockRepository` | **Likely:** add `listByCompany` (§5a) |
| `packages/persistence-sql` inventory stock adapter | **Likely:** implement `listByCompany` only — **no migration** |
| `packages/api` | **No new routes** |
| `packages/web` | **Untouched** |
| `docs/release/RC7.2c-*` | Reports after implementation (RC7.2a/2b structure) |
| `docs/rc7/README.md` | Status row at commit |

**Explicitly untouched:** other `*-application` packages; Workflow/Approval/Policy engines; UI; RC7.1 foundation sources; Search / Reporting modules; ledger/batch/lot/serial List*.

### Proposed sort/filter allow-lists (planning defaults — refine at implementation if needed)

| Entity | Sort (proposed) | Filter (proposed) | Application `q` fields (not Search module) |
|---|---|---|---|
| InventoryItem | `updatedAt`, `createdAt`, `name`, `code`, `status` | `status`, `code`, `name`, `classification`, `itemType` | `name`, `code` |
| Warehouse | `updatedAt`, `createdAt`, `name`, `code`, `status` | `status`, `code`, `name`, `warehouseType`, `branchId` | `name`, `code` |
| Stock | `updatedAt`, `inventoryItemId`, `warehouseId` | `inventoryItemId`, `warehouseId`, `locationId`, `batchId`, `lotId` | (optional) `inventoryItemId`, `warehouseId` as exact/contains on ids only if useful; prefer filters over free-text |

Unknown sort (and filter) fields → **validation failure**, never silent fallback.

---

## 11. Required tests

For **each** Inventory List* handler, include tests for:

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

### Required regression assertions

| Assertion | Intent |
|---|---|
| Existing Get handlers still behave identically | Protect against unintended registration / composition side effects |
| Existing Create/Update/Lifecycle (stock command) handlers remain registered / green | Same — composition must not break write/lifecycle paths |

---

## 12. Acceptance criteria

| # | Criterion |
|---|---|
| I1 | `ListInventoryItem`, `ListWarehouse`, `ListStock` registered and dispatchable via existing query transport |
| I2 | Each uses `buildAuthorizedListPage` (no custom totals) |
| I3 | `totalCount` reflects authorized rows only (tested) |
| I4 | Out-of-scope rows omitted; fail-closed on missing principal / Policy errors |
| I5 | Sort/filter fields restricted to Inventory allow-lists; unknown sort fields fail validation |
| I6 | Existing Get handlers behave identically; Create/Update/Lifecycle tests remain green |
| I7 | **Zero** UI changes; **zero** other-module List handlers; **zero** unjustified RC7.1 foundation edits; domain ownership unchanged |
| I8 | Company-scoped repository candidates **before** Policy; scan remains bounded (never unbounded) |
| I9 | Stock candidates come from company-scoped `listByCompany` (after §5a fill) — not unbounded item walks |
| I10 | Build, typecheck, lint, inventory-application tests, runtime verify/harden/accept PASS |
| I11 | V1 freeze unchanged (no ledger/batch/lot/serial List* unless amended); RC7.2a-structured closeout docs complete |

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Repo `Page.totalCount` accidentally returned | Always return helper output; tests assert ≠ raw repo total when scopes filter |
| Items/Stock lack owner/org/branch → empty lists for `own`-scoped principals | Fail-closed per D46; align `toScope` with summary/Get*; document residual for RC7.4 |
| Warehouse `branchId` incomplete for dual-branch transfer scenarios | Out of RC7.2c; freeze defers to RC7.4 |
| `StockRepository` missing `listByCompany` | §5a contract fill; no alternate total strategy |
| Filter/`q` semantics underspecified | Allow-listed fields + bounded application `q` only; Search → RC7.12 |
| Accidental UI wiring | OUT list + review gate (RC7.3 only) |
| Scope creep to ledger/batch/lot/serial / locations | Freeze minimum only |
| Copying Sales/Procurement list-support into Inventory | Mirror pattern in `@afh/inventory-application` only; do not couple packages |
| Unbounded candidate scan | Enforce RC7.1 ceiling; never widen into unbounded repo walk |
| Registration side effects on Get/lifecycle | Explicit regression assertions |
| Accidental SQL migration | Default none; document adapter-only change |

---

## 14. Verification plan

| Gate | When |
|---|---|
| Proposal approval | **Before code** |
| Explicit implementation approval | **Before code** |
| Handler unit tests + Get/lifecycle regression | During implementation |
| `npm run build` / `typecheck` / `lint` | Before commit |
| Inventory-application (+ shared-kernel/application regression) tests | Before commit |
| Confirm `git diff` has no web/api-routes/other-modules List* / no unjustified RC7.1 edits | Before commit |
| Runtime verify / harden / accept | Before commit |
| RC7.2c verification + audit (RC7.2a/2b doc structure) | Before commit approval |

---

## 15. Stop rule

- This document is **planning only**.
- **Do not implement RC7.2c** until this proposal is explicitly approved (and implementation is separately approved if required by process).
- **Do not start RC7.2d**, UI de-fixturing (RC7.3), Search (RC7.12), or any other module List work from this proposal.
- **Do not commit** this planning file until/unless the user requests a docs commit.

---

## Suggested future commit message (implementation — not now)

```
feat(rc7.2c): add Inventory List* queries using shared authorized list foundation

Implement ListInventoryItem, ListWarehouse, and ListStock using
principalListScope and buildAuthorizedListPage from RC7.1.
No UI, APIs, migrations, or other module changes.
```
