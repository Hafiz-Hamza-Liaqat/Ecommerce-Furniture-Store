# RC7.2d Planning Proposal — Finance List Implementation

- **Version:** 1.1
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Status:** APPROVED (v1.1) — **implementation complete; awaiting review (not committed)**
- **Depends on:** RC7.2c committed (`7ee1a56`); RC7.2b (`d01c880`); RC7.2a (`2e811cf`); RC7.1 (`1fb1a26`); ADR D56; V1 freeze Finance Included
- **Canonical slice:** `docs/rc7/05-Slice-Roadmap.md` §RC7.2d
- **V1 freeze:** `docs/rc7/03-V1-Scope-Freeze.md` §Finance (subordinate — no Included expansion)
- **Pattern reference:** RC7.2a Sales + RC7.2b Procurement + RC7.2c Inventory List* (approved implementation pattern + refinements)
- **Implementation reports:** `RC7.2d-finance-list-implementation.md`, `RC7.2d-verification-report.md`, `RC7.2d-audit-report.md`, `RC7.2d-test-summary.md`

---

## 1. Title

**RC7.2d — Finance List Implementation**

Register Finance `List*` query handlers for freeze-Included Finance entities only, reusing the RC7.1 shared List* foundation exactly as RC7.2a/2b/2c.

**Finance remains the owner of Finance aggregates and repositories. RC7.2d introduces only List\* query handlers and does not change domain ownership.** Posting engines, tax productization, statutory GL, multi-book consolidation, and payment gateway capture remain out of handlers (Rules / existing command paths / Future).

---

## 2. Objectives

1. Deliver authoritative CQRS `List*` queries for **FinancialAccount**, **Invoice**, **Payment**, and **FinancialLedger** (freeze names `ListFinancialAccount` / `ListInvoice` / `ListPayment` / `ListLedger`).
2. Reuse RC7.1 contracts + **unmodified** `buildAuthorizedListPage` (bounded authorized scan; authorized `totalCount` only — ADR D56).
3. Authorize via existing Finance read Policy actions + collection gate (`principalListScope`) — Policy sole authorizer.
4. Wire handlers into the existing Finance application composition / generic `POST /queries` path (no new HTTP routes).
5. Prove handlers with the RC7.2c test matrix (Policy filter, totals, paging, fail-closed) plus Get/lifecycle regression, without UI de-fixturing.

## Non-goals

RC7.2d does **not**:

- De-fixture or change Finance UI / ModuleApp (RC7.3)
- Add Sales, Procurement, Inventory, CRM, Projects, or Service `List*` handlers
- Start RC7.2e or later
- Add `List*` for CreditAccount, CreditAdjustment, TaxProfile, InvoiceLine, or LedgerEntry as primary grids (not named in freeze Included List* set; Get* / append paths remain as today)
- Duplicate paging, filtering, or Policy logic from RC7.1
- Modify RC7.1 foundation (`packages/application` / `packages/shared-kernel` List* helpers) unless a genuine defect is proven
- Change Workflow / Approval / Policy ownership
- Change Finance domain ownership or invent a second GL / posting engine
- Expand the V1 freeze Included set
- Implement statutory GL, multi-book consolidation, tax engine productization, payroll posting, banking connectors, or multi-currency revaluation
- Implement Invoice PDF/binary (Reporting + DAM — RC7.5 / Reporting subset) or invoice/payment import/export (RC7.7 / Future)
- Implement Search-module indexing or full-text search (RC7.12)
- Implement field-level profit/margin hardening beyond existing Get* projection patterns (→ RC7.4 where live DTOs apply)

---

## 3. Exact IN scope

| Item | Notes |
|---|---|
| `finance.ListFinancialAccount` | Query type + handler + AuthorizationSpec |
| `finance.ListInvoice` | Query type + handler + AuthorizationSpec |
| `finance.ListPayment` | Query type + handler + AuthorizationSpec |
| `finance.ListLedger` | Query type + handler + AuthorizationSpec. **ListLedger returns ledger headers only. Ledger entries/accounting line details remain separate responsibilities and are outside RC7.2d.** |
| Request payloads | Compose `ListQueryRequest` / `QueryCriteria` (companyId, page/sort/filter/`q`) |
| Responses | `Page<T>` via `buildAuthorizedListPage` — authorized `totalCount` |
| Candidate fetch | Company-scoped bounded batches (see §5a — Payment + Ledger gaps) |
| Policy | Collection gate + row filter using existing read actions (below) |
| Sort/filter allow-lists | Finance-owned field sets passed into RC7.1 validators |
| Registration | Finance application composition root only |
| Tests | Per-handler matrix + Get/lifecycle regression |
| Docs | Implementation + verification + audit + test summary (RC7.2a/2b/2c structure) |

### Why `ListLedger` is included (not deferred)

V1 freeze names `ListLedger` with “ledger if UI primary.” Production ModuleApp already exposes **Ledger** as a primary nav entity (`entityKey: "ledger"`) alongside Accounts / Invoices / Payments. Roadmap §RC7.2d allows “(+ Ledger if required).” Therefore **ListLedger is IN** for RC7.2d.

**ListLedger returns ledger headers only. Ledger entries/accounting line details remain separate responsibilities and are outside RC7.2d.**

### Finance entities included (V1 freeze only — no expansion)

| Entity | List query (proposed type string) | Read Policy action (existing) | Resource type (align Get*) | Row scope fields for `toScope` | Expected handler |
|---|---|---|---|---|---|
| FinancialAccount | `finance.ListFinancialAccount` | `finance.accounts.read` | `financial_account` | `id` + `companyId` (no owner/org/branch on entity — same as Get*) | `createListFinancialAccountHandler` |
| Invoice | `finance.ListInvoice` | `finance.invoices.read` | `invoice` | `id` + `companyId` + `organizationId` + attributes (`customerId`, `billToAddressId`) — same as GetInvoice | `createListInvoiceHandler` |
| Payment | `finance.ListPayment` | `finance.payments.read` | `payment` | `id` + `companyId` + `organizationId` ← `payerOrganizationId` + attributes (`invoiceId`, `payerCustomerId`) — same as GetPayment | `createListPaymentHandler` |
| FinancialLedger | `finance.ListLedger` | `finance.ledgers.read` | `ledger` | `id` + `companyId` (no owner/org/branch on header — same as GetLedger) | `createListLedgerHandler` |

Existing Create/Update/Record/Append/Get/summary handlers remain authoritative and unchanged except for registration of the four new queries.

**Proven Policy codes (already present in `FinancePolicyActions`):**

- `AccountRead`, `InvoiceRead`, `PaymentRead`, `LedgerRead`

**Proven repo surface:**

| Repository | Company-scoped `listByCompany` today |
|---|---|
| `AccountRepository` | **Yes** |
| `InvoiceRepository` | **Yes** |
| `PaymentRepository` | **No** — only `listByInvoice(companyId, invoiceId, page?)` |
| `LedgerRepository` | **No** — only `findById` / `save` / `appendEntry` / `listEntries(companyId, ledgerId, page?)` |

### Field projection note (Invoice / Payment)

`GetInvoice` and `GetPayment` apply Finance field-security projection. List* responses for those entities must apply the **same** projection to each authorized row so List* cannot bypass Get* field redaction. Account and Ledger Get* return full aggregates today — List* may return the same shapes.

---

## 4. Exact OUT scope

| Forbidden | Deferred to |
|---|---|
| UI / ModuleApp live wiring / Production de-fixturing | RC7.3 |
| Sales / Procurement / Inventory / CRM / Projects / Service List* | RC7.2a–c done / RC7.2e–g |
| `ListCreditAccount` / credit adjustment grids / tax profile List* | Not in freeze Included List* names |
| `ListInvoiceLine` / `ListLedgerEntry` as primary List* queries | Not freeze Named List*; entries remain GetLedger / append paths |
| Statutory GL / multi-book / tax engine productization / payroll posting | Excluded / Future by freeze |
| Invoice PDF/binary | RC7.5 / Reporting + DAM |
| Invoice/payment import/export | RC7.7 / Future |
| Search-module full-text / index search | RC7.12 |
| New HTTP routes | Never — reuse `POST /queries` |
| New paging/Policy frameworks | Forbidden (RC7.1 / D56) |
| Workflow/Approval/Policy engine changes | Forbidden |
| Alternate total-count strategies | Forbidden (D56) |
| V1 freeze Included expansion | Forbidden without amendment |
| Domain ownership transfer out of Finance | Forbidden |
| Reporting ownership of Finance lists | Forbidden (Reporting = read model only) |

---

## 5. Architecture constraints

| Constraint | Source |
|---|---|
| Policy Engine sole authorizer | D43, RC5 |
| `buildAuthorizedListPage` only path for List* totals | ADR D56 / RC7.1 |
| Repository totals never exposed on `Page.totalCount` | ADR D56 |
| Load-before-authorize unchanged for Get* | D45 |
| Workflow = lifecycle SSoT; entity status projection | D04, D54 |
| Finance module owns Finance aggregates / money movement contracts | RC7 ownership freeze |
| shared-kernel owns contracts; application owns Policy list integration; **Finance owns Finance aggregates and repositories** | RC7 ownership / RC7.1 package ownership |
| Search / Reporting = read models only | RC7 architecture |
| No V1 freeze Included expansion without amendment | V1 freeze Authority |

Continue to enforce (RC7.2a–2c refinements):

- Workflow remains lifecycle owner.
- Approval remains approval owner.
- Policy remains the sole authorization engine.
- `buildAuthorizedListPage` from RC7.1 is reused **without modification**.
- No duplicate paging or Policy logic.
- Repository totals are never exposed.
- `totalCount` always represents the authorized population after Policy row filtering (ADR D56).

**Required RC7.1 reuse (exact — do not redesign or duplicate):**

- `buildAuthorizedListPage()`
- `principalListScope()`
- `ListQueryRequest`
- `Page<T>`
- `QueryCriteria`
- RC7.1 sort/filter validators (`validateSortAllowList` / `validateFilterAllowList`)
- ADR D56 authorized total semantics

---

## 5a. Repository contract

Every repository used by RC7.2d must expose the same **bounded candidate-fetch** pattern expected by `buildAuthorizedListPage`:

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

### Known gap — `PaymentRepository.listByCompany`

Today `PaymentRepository` exposes `listByInvoice` only. RC7.2d **requires** company-scoped candidates for `ListPayment`.

`listByCompany()` is a **repository contract completion** required by the existing RC7.1 authorized-list abstraction (`buildAuthorizedListPage` candidate fetch). It is **not** a new business capability, schema change, or V1 scope expansion.

**Resolution (minimal contract completion only):**

1. Add `listByCompany(companyId, page?)` to `PaymentRepository` in `@afh/finance` (same signature as Account/Invoice).
2. Implement it on the existing SQL document adapter (`createSqlPaymentRepository`) via existing company-scoped document listing — **no SQL migration / schema change** expected (documents already store `company_id`).
3. Do **not** invent Policy in the repository or walk all invoices unbounded via `listByInvoice` to synthesize a company list.

### Known gap — `LedgerRepository.listByCompany`

Today `LedgerRepository` has no company-wide ledger listing (only `listEntries` for a single ledger). RC7.2d **requires** company-scoped candidates for `ListLedger` (ledger **headers**).

`listByCompany()` is a **repository contract completion** required by the existing RC7.1 authorized-list abstraction (`buildAuthorizedListPage` candidate fetch). It is **not** a new business capability, schema change, or V1 scope expansion.

**Resolution (minimal contract completion only):**

1. Add `listByCompany(companyId, page?)` to `LedgerRepository` in `@afh/finance`.
2. Implement it on `createSqlFinanceLedgerRepository` via the existing `finance.ledger` document store’s `docs.listByCompany` — **no SQL migration** expected.
3. Do **not** treat `listEntries` / journal lines as the ListLedger candidate source. ListLedger returns ledger headers only; ledger entries/accounting line details remain outside RC7.2d.

If implementation discovers a genuine persistence defect beyond these contract fills, stop and report before inventing alternate total strategies. No SQL migrations unless a genuine persistence defect is proven.

---

## 5b. Company isolation sequence

Every Finance repository query used for List* **must be company-scoped before** Policy row filtering. Policy is **not** a replacement for repository scoping.

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

Domain sort/filter/`q` allow-lists remain Finance-owned candidate preparation (same pattern as RC7.2a–2c `list-support`), not a parallel authorized-paging stack.

---

## 6a. Sorting

Proposed allow-lists (below) are the starting field sets.

**Unknown sort fields must fail validation.** They must **never** silently fall back to a default sort.

Use RC7.1 `validateSortAllowList` (and reject unknown filter fields via `validateFilterAllowList` the same way).

---

## 6b. Search `q`

`q` performs **bounded application search only** over allow-listed text fields on already company-scoped candidates (module-owned candidate prep).

It is **not** Search-module functionality. The Search module remains **RC7.12** and is out of scope for RC7.2d.

---

## 7. Dependencies

| Dependency | Status |
|---|---|
| RC7.1 Shared List Foundation | Committed (`1fb1a26`) |
| RC7.2a Sales List* (pattern proof) | Committed (`2e811cf`) |
| RC7.2b Procurement List* | Committed (`d01c880`) |
| RC7.2c Inventory List* (pattern + Stock contract completion) | Committed (`7ee1a56`) |
| ADR D56 | Accepted |
| V1 freeze Finance Included | Approved |
| Account / Invoice `listByCompany` | Present |
| Payment `listByCompany` | **Missing — see §5a** |
| Ledger `listByCompany` | **Missing — see §5a** |
| Existing Finance Policy read codes | Present (`FinancePolicyActions.*Read`) |
| Human approval of this proposal | **Required before code** |

---

## 8. Deliverables (after implementation approval + engineering)

1. Four Finance `List*` query types, payloads, validators, handlers.
2. Composition registration in `@afh/finance-application`.
3. Candidate-batch adapters over company-scoped repository batches (including Payment + Ledger `listByCompany` fills if approved).
4. Tests covering the required matrix + Get/lifecycle regression (below).
5. Closeout docs following the **exact RC7.2a/2b/2c structure**:
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
   - `action` / `resourceType` / `toScope` from persisted Finance row fields;
   - `fetchCandidates` wrapping **company-scoped** repository batches;
   - `ListQueryRequest` from the query payload.
4. Return the resulting `Page<T>` unchanged (authorized `totalCount`).

**Must not** reimplement paging math, Policy row loops, or total aggregation.

**Must not** modify RC7.1 foundation sources unless a genuine defect is discovered and separately approved.

---

## 10. Expected packages / files

| Location | Likely change |
|---|---|
| `packages/finance-application/src/constants.ts` | Add `ListFinancialAccount` / `ListInvoice` / `ListPayment` / `ListLedger` |
| `packages/finance-application/src/queries/` | List payloads (`ListQueryRequest`) |
| `packages/finance-application/src/handlers/list-handlers.ts` (+ support) | Four handlers |
| `packages/finance-application/src/validators/` | List payload validation + allow-lists |
| `packages/finance-application/src/composition/` | `registerQuery` × 4 |
| `packages/finance-application` tests + `test` script | Required List* matrix + regression |
| `packages/finance` `PaymentRepository` / `LedgerRepository` | **Likely:** add `listByCompany` (§5a) |
| `packages/persistence-sql` finance payment + ledger adapters | **Likely:** implement `listByCompany` only — **no migration** |
| `packages/api` | **No new routes** |
| `packages/web` | **Untouched** |
| `docs/release/RC7.2d-*` | Reports after implementation (RC7.2a/2b/2c structure) |
| `docs/rc7/README.md` | Status row at commit |

**Explicitly untouched:** other `*-application` packages; Workflow/Approval/Policy engines; UI; RC7.1 foundation sources; Search / Reporting modules; Credit/Tax List*; ledger-entry List*.

### Proposed sort/filter allow-lists (planning defaults — refine at implementation if needed)

| Entity | Sort (proposed) | Filter (proposed) | Application `q` fields (not Search module) |
|---|---|---|---|
| FinancialAccount | `updatedAt`, `createdAt`, `name`, `code`, `status`, `accountType` | `status`, `code`, `name`, `accountType`, `currencyCode`, `parentAccountId` | `name`, `code` |
| Invoice | `updatedAt`, `createdAt`, `number`, `status`, `issuedAt`, `dueAt` | `status`, `number`, `customerId`, `organizationId`, `currencyCode` | `number` |
| Payment | `updatedAt`, `createdAt`, `recordedAt`, `status` | `status`, `invoiceId`, `payerCustomerId`, `payerOrganizationId`, `externalRef` | `externalRef`, `invoiceId` (bounded text/id match) |
| FinancialLedger | `updatedAt`, `createdAt`, `name`, `code`, `kind` | `kind`, `code`, `name`, `currencyCode` | `name`, `code` |

Unknown sort (and filter) fields → **validation failure**, never silent fallback.

---

## 11. Required tests

For **each** Finance List* handler, include tests for:

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
| Existing Create/Update/Record/Append (account, invoice, payment, ledger) handlers remain registered / green | Same — composition must not break write/lifecycle paths |

---

## 12. Acceptance criteria

| # | Criterion |
|---|---|
| F1 | `ListFinancialAccount`, `ListInvoice`, `ListPayment`, `ListLedger` registered and dispatchable via existing query transport |
| F2 | Each uses `buildAuthorizedListPage` (no custom totals) |
| F3 | `totalCount` reflects authorized rows only (tested) |
| F4 | Out-of-scope rows omitted; fail-closed on missing principal / Policy errors |
| F5 | Sort/filter fields restricted to Finance allow-lists; unknown sort fields fail validation |
| F6 | Existing Get handlers behave identically; Create/Update/Record/Append tests remain green |
| F7 | **Zero** UI changes; **zero** other-module List handlers; **zero** unjustified RC7.1 foundation edits; domain ownership unchanged |
| F8 | Company-scoped repository candidates **before** Policy; scan remains bounded (never unbounded) |
| F9 | Payment and Ledger candidates come from company-scoped `listByCompany` (after §5a fills) — not unbounded invoice/ledger walks |
| F10 | Invoice/Payment List* do not bypass Get* field-security projection |
| F11 | Build, typecheck, lint, finance-application tests, runtime verify/harden/accept PASS |
| F12 | V1 freeze unchanged (no Credit/Tax/entry List* unless amended); RC7.2a-structured closeout docs complete |

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Repo `Page.totalCount` accidentally returned | Always return helper output; tests assert ≠ raw repo total when scopes filter |
| Accounts/Ledgers lack owner/org/branch → empty lists for `own`-scoped principals | Fail-closed per D46; align `toScope` with Get*; document residual for RC7.4 |
| Invoice/Payment org-scoped Policy mismatch vs Get* | Reuse Get* `toScope` field mapping exactly |
| `PaymentRepository` / `LedgerRepository` missing `listByCompany` | §5a contract fills; no alternate total strategy; no unbounded `listByInvoice` walks |
| ListLedger confused with ledger **entries** | Explicit: headers only; entries remain GetLedger |
| Field-security bypass via ListInvoice/ListPayment | Apply same projection as Get* after Policy |
| Filter/`q` semantics underspecified | Allow-listed fields + bounded application `q` only; Search → RC7.12 |
| Accidental UI wiring | OUT list + review gate (RC7.3 only) |
| Scope creep to Credit/Tax/entries / statutory GL | Freeze List* names only |
| Copying Inventory list-support into Finance | Mirror pattern in `@afh/finance-application` only; do not couple packages |
| Unbounded candidate scan | Enforce RC7.1 ceiling; never widen into unbounded repo walk |
| Registration side effects on Get/lifecycle | Explicit regression assertions |
| Accidental SQL migration | Default none; document adapter-only change |
| Accidental RC7.1 modification | Diff gate + acceptance F7 |
| Reporting/Search ownership creep | Explicit OUT; read models only |

---

## 14. Verification plan

| Gate | When |
|---|---|
| Proposal approval | **Before code** |
| Explicit implementation approval | **Before code** |
| Handler unit tests + Get/lifecycle regression | During implementation |
| `npm run build` / `typecheck` / `lint` | Before commit |
| Finance-application (+ shared-kernel/application regression) tests | Before commit |
| Confirm `git diff` has no web/api-routes/other-modules List* / no unjustified RC7.1 edits | Before commit |
| Runtime verify / harden / accept | Before commit |
| RC7.2d verification + audit (RC7.2a/2b/2c doc structure) | Before commit approval |
| Stop before commit; present verification results for review | After implementation gates |

---

## 15. Stop rule

- This document is **planning only**.
- **Do not implement RC7.2d** until this proposal is explicitly approved **and** implementation is separately approved.
- **Do not start RC7.2e**, UI de-fixturing (RC7.3), Search (RC7.12), or any other module List work from this proposal.
- **Do not commit** this planning file until/unless the user requests a docs commit.
- **No engineering** in this phase — working tree must remain free of RC7.2d code changes.

---

## Suggested future commit message (implementation — not now)

```
feat(rc7.2d): add Finance List* queries using shared authorized list foundation

Implement ListFinancialAccount, ListInvoice, ListPayment, and ListLedger using
principalListScope and buildAuthorizedListPage from RC7.1.
Complete PaymentRepository and LedgerRepository listByCompany contracts required
by the shared authorized-list abstraction (no schema or behavior change).
No UI, APIs, SQL migrations, or other module changes.
```
