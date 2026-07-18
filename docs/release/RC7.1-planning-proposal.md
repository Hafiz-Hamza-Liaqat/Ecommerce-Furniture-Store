# RC7.1 Planning Proposal — Shared List Foundation

- **Version:** 1.1
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Status:** APPROVED WITH PRE-IMPLEMENTATION REFINEMENTS — A1 frozen; awaiting implementation approval
- **Depends on:** RC7.0 committed (`9762047`); RC5 (D45–D47); RC6 (ownership freeze)
- **Canonical slice definition:** `docs/rc7/05-Slice-Roadmap.md` §RC7.1
- **V1 freeze:** `docs/rc7/03-V1-Scope-Freeze.md` (subordinate — RC7.1 adds no Included entities)

---

## 1. Title

**RC7.1 — Shared List Foundation**

Shared `List*` contracts and infrastructure only. **No module-specific / entity handlers.**

---

## 2. Objectives

1. Define reusable request/response contracts for ERP `List*` queries (page/cursor, sort, filter, search).
2. Codify **total-count semantics after Policy row filtering** (ADR D46 obligation) so RC7.2a–g cannot diverge.
3. Provide shared utilities that **reuse** existing RC5 helpers (`principalListScope`, `filterAuthorizedRecords`) without changing Policy, Workflow, or Approval ownership.
4. Prove by design that RC7.2a–g can add module handlers by **importing RC7.1 public exports only** — not by forking authz or inventing per-module pagination math.
5. Deliver unit tests for foundation behavior only; leave all module wiring to later slices.

## Non-goals

RC7.1 does **not**:

- register module handlers (Sales, Procurement, Inventory, Finance, CRM, Projects, Service, or others)
- add HTTP APIs or routes
- modify UI / ModuleApp / de-fixturing
- add SQL, migrations, or seeds
- modify Workflow Engine
- modify Approval Engine
- modify Policy Engine algorithm or introduce a second authorization authority
- expand the V1 freeze Included set
- introduce a duplicate paging, filtering, or authorization framework

---

## 3. Exact IN scope

| Item | Notes |
|---|---|
| Shared `List*` request contract | Compose existing `QueryCriteria` / `PageRequest` / `SortField` / `FilterCriterion` + optional `q` + `companyId` |
| Shared `List*` response contract | Reuse `Page<T>`; **frozen** rule: `totalCount` = authorized total only |
| Pagination semantics | Bounds, defaults, max page size; reject invalid page/cursor |
| Sorting contract | Existing `SortField` + allow-list validation helper |
| Filtering contract | Existing `FilterCriterion` / operators — shape validation only in RC7.1 |
| Search contract | Optional `q` text on list envelope |
| Policy row-filter integration points | Helpers reusing `filterAuthorizedRecords` / `principalListScope` |
| **Frozen authorized-total strategy (A1)** | Bounded authorized scan — see §9 |
| Shared list pipeline utility | For future handlers — **no** handler registrations |
| Unit tests | Contracts + authorized totals + fail-closed + single-strategy enforcement |
| Docs | This proposal; **recommended ADR** (authorized totals + scan strategy) |

---

## 4. Exact OUT scope

| Forbidden in RC7.1 | Deferred to |
|---|---|
| Sales / Procurement / Inventory / Finance / CRM / Projects / Service `List*` handlers | RC7.2a–g |
| Any module-specific CQRS query type registration | RC7.2a–g |
| UI changes / ModuleApp wiring / de-fixturing | RC7.3 |
| New HTTP APIs or routes | Never for List* — reuse existing `POST /queries` (RC6.2 pattern) when handlers exist |
| Migrations / SQL schema / seeds | RC7.2+ / later as needed |
| Production / Demo profile wiring | RC7.3 |
| DAM, attachments, import/export, Manufacturing/HR/CMS/… | RC7.5+ |
| Changing Policy Engine algorithm | Forbidden |
| SQL RLS / second authz layer | Forbidden (D46 rejected) |
| Workflow/Approval ownership or handlers | Forbidden / already RC6 |
| Expanding V1 freeze Included entities | Requires freeze amendment |
| Alternate per-module total-count strategies | **Forbidden forever** — single frozen strategy only |

---

## 5. Architecture constraints

| Constraint | Source |
|---|---|
| Policy Engine sole authorization authority | D43, RC5 |
| Collection gate uses `principalListScope` (action-aware per D47) | D46, D47 |
| Row decisions via `filterAuthorizedRecords` → `PolicyEngine.evaluate` | D46 |
| Totals/page membership after Policy row filtering | D46 / **§9 frozen rule** |
| No SQL scope predicates as authz | D46 rejected alternatives |
| Fail-closed: missing principal / policy error → whole query fails | D46 |
| Workflow = lifecycle SSoT; Approval = approval owner | D04, RC6 |
| Reporting/Search = read models only; never business owners | RC7.0 |
| Generic CQRS dispatch only (`POST /queries`) when handlers appear later | D50 pattern |
| No Included-scope expansion | V1 freeze Authority section |

### Package ownership (List* semantics)

| Package | Owns |
|---|---|
| **`@afh/shared-kernel`** | `List*` **contracts** (paging, sort, filter, page shape, validation helpers) |
| **`@afh/application`** | **Policy integration** for lists (`filterAuthorizedRecords`, `principalListScope`, authorized-scan / page builder) |
| **Module `*-application` + domain repos** | **Repositories** and entity-specific query wiring (RC7.2+) |
| **No other package** | May own `List*` semantics, paging frameworks, or total-count rules |

### Reuse rule (mandatory)

RC7.1 **must not** duplicate paging, filtering, authorization, or repository abstractions already present in `shared-kernel` or `application` packages.

- Reuse `PageRequest`, `SortField`, `FilterCriterion`, `QueryCriteria`, `Page<T>`.
- Reuse `filterAuthorizedRecords` and `principalListScope`.
- Extend or wrap; **do not** introduce a parallel paging stack or second Policy path.

### Reuse proof for RC7.2a–g

Each module handler will:

1. Authorize once (collection gate + `principalListScope(action)`).
2. Supply a **bounded company-scoped candidate fetcher** from its existing repository (batch API).
3. Call the **single** RC7.1 authorized-list helper (frozen A1 strategy).
4. Return `Page<T>` with authorized `totalCount`.
5. Register only its own `*.List*` query type + AuthorizationSpec.

No ownership moves; no new authz framework; no module-specific total math.

---

## 6. Dependencies

| Dependency | Status |
|---|---|
| RC7.0 planning pack committed | Done (`9762047`) |
| Human approval of this RC7.1 proposal (incl. frozen A1) | Required before code |
| `@afh/shared-kernel` paging (`PageRequest`, `Page<T>`, filters/sort) | Exists — extend, don’t duplicate |
| `@afh/application` `filterAuthorizedRecords`, `principalListScope` | Exists (RC5.7/5.8) — integrate, don’t rewrite Policy |
| RC5 AuthorizationSpec / handler patterns | Exists |
| RC6 CQRS dispatcher / `POST /queries` | Exists — **not wired in RC7.1** |
| Recommended ADR for authorized totals | To author during/with implementation |

---

## 7. Deliverables

1. **Shared list contracts** (types + validation helpers) in shared-kernel.
2. **Authorized list page builder** implementing the **frozen A1 strategy** in application.
3. **Documented integration recipe** for RC7.2 handlers (comments or short `docs/rc7/` note).
4. **Unit tests** for foundation only (including authorized totals + strategy).
5. **Recommended ADR** (e.g. D56) — authorized `totalCount` rule + bounded authorized scan; **no module alternatives**.
6. **RC7.1 verification + audit reports** at implementation close.

---

## 8. Expected packages / files (proposal)

**Existing foundation to reuse (do not reinvent):**

`packages/shared-kernel/src/paging/paging.ts` already provides:

- `PageRequest` (offset + cursor)
- `SortField` / `SortDirection`
- `FilterOperator` / `FilterCriterion` / `QueryCriteria`
- `Page<T>` (`items`, `totalCount`, `page`, `pageSize`, `nextCursor`, `hasMore`)

| Location | Likely change | Purpose |
|---|---|---|
| `packages/shared-kernel/src/paging/` | List envelope (`companyId`, `q`, criteria), defaults/max pageSize, allow-list validators | Contracts |
| `packages/shared-kernel` tests | New | Validation helpers |
| `packages/application/src/security/` | Authorized-scan / `buildAuthorizedListPage` reusing `filterAuthorizedRecords` | Frozen A1 |
| `packages/application/src/security/index.ts` | Re-export public List* Policy integration | Public surface |
| `packages/application` tests | New | Fail-closed + authorized totals + strategy |
| `docs/architecture/decision-records/` | **Recommended ADR** (authorized totals) | Architectural rule |
| `docs/rc7/README.md` | Status row at implementation commit | Index |
| `docs/release/RC7.1-*` | After implementation | Reports |

**Explicitly untouched in RC7.1:** all `*-application` packages; `packages/api` routes; `packages/web`; `packages/persistence-sql` migrations; `packages/platform` engines.

---

## 9. Frozen architectural rule — authorized totals (A1)

### Rule (normative)

**Every `List*` query must return the total number of records visible after Policy row filtering. Repository totals must never be exposed.**

- `Page.totalCount` for `List*` = count of **Policy-allowed** rows for the query.
- Raw repository `COUNT(*)`, pre-filter page totals, or “window-only” counts that leak unauthorized population size are **forbidden**.
- **Every module must use the same implementation strategy. No exceptions.**

### Implementation strategy (frozen): Bounded authorized scan

1. The module supplies a **bounded fetcher** that yields company-scoped **candidate** batches from its existing repository (batch size ≤ shared max, aligned with existing ≤500 convention unless review lowers it).
2. Each batch is passed through existing `filterAuthorizedRecords` (Policy Engine sole authorizer).
3. Authorized rows are accumulated in order.
4. Scanning continues batch-by-batch until candidates for the query are exhausted (or a documented safety ceiling is hit — fail closed / explicit error if ceiling would under-count; do not silently return a partial total).
5. `totalCount` = number of authorized rows accumulated.
6. Response `items` = the requested offset/pageSize (or cursor window) over that **authorized** sequence.
7. Handlers **must** call the shared application helper; they **must not** implement alternate total strategies (over-fetch-only window totals, raw repo totals, SQL authz counts, etc.).

**Rejected alternatives (do not use):**

| Rejected | Why |
|---|---|
| (a) Over-fetch once, filter, trim — expose only window length as total | Understates authorized population; inconsistent UX |
| (c) Window-only total | Same — not “total visible after Policy” |
| Copy repository `totalCount` | Violates ADR D46 / leaks unauthorized existence |
| Per-module custom strategies | Breaks cross-module consistency |

### Contract sketch (non-normative names)

```ts
// Already in @afh/shared-kernel: PageRequest, SortField, FilterCriterion, QueryCriteria, Page<T>

type ListQueryRequest = {
  readonly companyId: string;
  readonly q?: string;
  readonly criteria?: QueryCriteria;
};

/** Same shape as Page<T>; totalCount semantics enforced by application helper + ADR */
type AuthorizedListPage<T> = Page<T>;
```

### Remaining non-blocking preferences (not open architecture)

| ID | Topic | Decision |
|---|---|---|
| A2 | Cursor vs offset | Keep both in `PageRequest`; RC7.2 ERP grids prefer **offset-first**; cursors continue the **authorized** sequence when used |
| A3 | Filter DSL | **Reuse** existing `FilterCriterion` / `QueryCriteria`; RC7.1 validates shape only |
| A4 | Package split | shared-kernel = contracts; application = Policy integration; modules = repositories |
| A5 | ADR | **Recommended** — record §9 rule + bounded authorized scan |

---

## 10. Acceptance criteria (RC7.1)

| # | Criterion |
|---|---|
| C1 | Shared `List*` request/response contracts exist and are exported |
| C2 | Pagination, sort, filter, search fields are represented on the shared request |
| C3 | Helpers enforce **Policy row filtering** via existing `filterAuthorizedRecords` (no new authz engine) |
| C4 | `totalCount` is defined/tested as **authorized total after Policy row filtering**; repository totals never exposed |
| C5 | Unit tests cover validation + fail-closed principal/policy paths + frozen scan strategy |
| C6 | **Zero** module `List*` handlers registered; zero UI/API/migration changes |
| C7 | Build, typecheck, lint, and touched-package tests pass |
| C8 | Recommended ADR + docs state reuse path for RC7.2a–g without ownership change |
| C9 | V1 freeze unchanged (no new Included entities) |
| C10 | **No duplicate paging implementation or parallel `List*` infrastructure exists after RC7.1** |

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Accidental module handler creep | Non-goals + OUT list + review gate |
| Divergent totals in RC7.2 | §9 frozen; ADR; shared helper only; tests |
| Scan cost / audit volume on large sets | Bounded batches; document ceiling behavior; D46 in-process eval |
| Duplicating paging | C10 + reuse rule; extend shared-kernel only |
| Filter DSL creep | Reuse existing operators only |
| Safety ceiling under-count | Fail closed / explicit error — never silent partial total |

---

## 12. Verification plan

| Gate | When |
|---|---|
| Proposal review approval (this doc, A1 frozen) | Before any code |
| Unit tests (shared-kernel + application helpers) | During implementation |
| `npm run build` / `typecheck` / `lint` | Before RC7.1 commit |
| Confirm `git diff` touches only allowed packages/files | Before commit |
| Confirm **no** second paging/`List*` stack (C10) | Before commit |
| Confirm a future module handler can **typecheck/compile using only RC7.1 public exports** (compile-only sketch or test import) | Before commit |
| Runtime verify/harden/accept | Before commit (regression) |
| RC7.1 verification + audit + recommended ADR | After implementation, before commit approval |

---

## 13. Reuse guarantee (RC7.2a–g)

RC7.1 is successful only if a future Sales `ListOpportunity` handler can be written as:

1. `AuthorizationSpec` + collection gate with `principalListScope(readAction)`.
2. Repository **batch fetcher** (existing sales store).
3. Single RC7.1 public helper implementing bounded authorized scan.
4. Return `Page<Opportunity>` with authorized `totalCount`.

Compilable against **only** RC7.1 public exports from `@afh/shared-kernel` + `@afh/application` (plus the module’s own repository types).

No Policy fork, no Workflow change, no UI in RC7.1, no freeze amendment, no alternate totals.

---

## 14. Stop rule

- Documentation refinements in this file: **done**.
- **Do not start RC7.1 implementation** until explicitly approved to code.
- **Do not start RC7.2a** until RC7.1 is implemented and committed.
- No application code and no commits in this planning refinement step unless separately requested.

---

## Suggested future commit message (implementation — not now)

```
feat(rc7.1): add shared List* foundation with authorized totals

Reuse shared-kernel paging and application Policy row filtering.
Freeze bounded authorized scan for List* totalCount (ADR).
No module List handlers, UI, APIs, or migrations.
```
