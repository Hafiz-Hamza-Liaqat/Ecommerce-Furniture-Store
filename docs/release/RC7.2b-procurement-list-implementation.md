# RC7.2b — Procurement List Implementation Report

- **Date:** 2026-07-18
- **Slice:** Procurement List Implementation (`ListSupplier`, `ListPurchaseRequisition`, `ListPurchaseOrder`)
- **Planning:** `docs/release/RC7.2b-planning-proposal.md` (v1.1 approved)
- **Depends on:** RC7.2a (`2e811cf`), RC7.1 (`1fb1a26`), ADR D56
- **Status:** Implementation complete — **awaiting review; not committed**

---

## What was delivered

1. **Query types** in `@afh/procurement-application`
   - `procurement.ListSupplier`
   - `procurement.ListPurchaseRequisition`
   - `procurement.ListPurchaseOrder`
2. **Handlers** (`list-handlers.ts`) each:
   - Define `AuthorizationSpec` with `principalListScope(readAction)`
   - Load **company-scoped** candidates via existing `listByCompany` (bounded batches)
   - Apply Procurement allow-listed domain filter / sort / application `q` in candidate prep only
   - Return `Page<T>` from **unmodified** `buildAuthorizedListPage` (RC7.1 / D56)
3. **Validators** — companyId required; unknown sort/filter fields fail (no silent fallback)
4. **Composition** — registered in `createProcurementApplication`
5. **Tests** — 47 cases (15×3 List* + 2 Get/lifecycle regression)
6. **Docs** — this report + verification + audit + test summary

## Architecture compliance

| Constraint | How satisfied |
|---|---|
| Workflow = lifecycle owner | Untouched |
| Approval = approval owner | Untouched |
| Policy = sole authorizer | Collection gate + `filterAuthorizedRecords` inside `buildAuthorizedListPage` |
| Procurement owns aggregates/repos | Domain/repos untouched; List* handlers only |
| Reuse RC7.1 helper | `buildAuthorizedListPage` imported; not forked |
| Company before Policy | `listByCompany(companyId, …)` then helper Policy filter |
| Bounded scan | `LIST_MAX_CANDIDATE_SCAN` ceiling; never unbounded |
| `q` ≠ Search module | Application-bounded text match only |
| Repo totals never exposed | Response is helper `Page` only |

## Package / file map

| Path | Role |
|---|---|
| `packages/procurement-application/src/constants.ts` | Query type strings |
| `packages/procurement-application/src/list-fields.ts` | Sort/filter allow-lists |
| `packages/procurement-application/src/queries/queries.ts` | `List*Payload` = `ListQueryRequest` |
| `packages/procurement-application/src/handlers/list-support.ts` | Candidate fetcher + domain criteria |
| `packages/procurement-application/src/handlers/list-handlers.ts` | Three List* handlers |
| `packages/procurement-application/src/handlers/list-handlers.test.ts` | Required matrix + regression |
| `packages/procurement-application/src/validators/validators.ts` | List validators |
| `packages/procurement-application/src/composition/composition-root.ts` | `registerQuery` × 3 |

## Explicitly untouched

UI / web, APIs (new routes), SQL migrations, Sales / Inventory / Finance / CRM / Projects / Service List*, RC7.2c+, RC7.3, Workflow / Approval / Policy engines, RC7.1 foundation, V1 freeze, Search module, Reporting.

## Suggested commit message (do not commit until approved)

```
feat(rc7.2b): add Procurement List* queries using shared authorized list foundation

Implement ListSupplier, ListPurchaseRequisition, and ListPurchaseOrder using
principalListScope and buildAuthorizedListPage from RC7.1.
No UI, APIs, SQL, migrations, or other module changes.
```
