# RC7.2a — Sales List Implementation Report

- **Date:** 2026-07-18
- **Slice:** Sales List Implementation (`ListOpportunity`, `ListQuote`, `ListSalesOrder`)
- **Planning:** `docs/release/RC7.2a-planning-proposal.md` (approved with minor refinements)
- **Depends on:** RC7.1 (`1fb1a26`), ADR D56
- **Status:** Implementation complete — **awaiting review; not committed**

---

## What was delivered

1. **Query types** in `@afh/sales-application`
   - `sales.ListOpportunity`
   - `sales.ListQuote`
   - `sales.ListSalesOrder`
2. **Handlers** (`list-handlers.ts`) each:
   - Define `AuthorizationSpec` with `principalListScope(readAction)`
   - Load company-scoped candidates via existing `listByCompany`
   - Apply Sales allow-listed domain filter / sort / `q` in candidate prep only
   - Return `Page<T>` from **unmodified** `buildAuthorizedListPage` (RC7.1 / D56)
3. **Validators** — companyId required; sort/filter allow-lists via RC7.1 helpers
4. **Composition** — registered in `createSalesApplication`
5. **Tests** — 45 cases (15 per handler) covering the approved matrix
6. **Docs** — this report + verification + audit + test summary

## Architecture compliance

| Constraint | How satisfied |
|---|---|
| Workflow = lifecycle owner | Untouched |
| Approval = approval owner | Untouched |
| Policy = sole authorizer | Collection gate + `filterAuthorizedRecords` inside `buildAuthorizedListPage` |
| Reuse RC7.1 helper | `buildAuthorizedListPage` imported; not forked |
| No duplicate paging/Policy | Handlers do not compute totals or Policy loops |
| Repo totals never exposed | Response is helper `Page` only |
| `totalCount` = authorized population | Asserted in tests; D56 |

## Package / file map

| Path | Role |
|---|---|
| `packages/sales-application/src/constants.ts` | Query type strings |
| `packages/sales-application/src/list-fields.ts` | Sort/filter allow-lists |
| `packages/sales-application/src/queries/queries.ts` | `List*Payload` = `ListQueryRequest` |
| `packages/sales-application/src/handlers/list-support.ts` | Candidate fetcher + domain criteria |
| `packages/sales-application/src/handlers/list-handlers.ts` | Three List* handlers |
| `packages/sales-application/src/handlers/list-handlers.test.ts` | Required test matrix |
| `packages/sales-application/src/validators/validators.ts` | List validators |
| `packages/sales-application/src/composition/composition-root.ts` | `registerQuery` × 3 |

## Explicitly untouched

UI / web, APIs (new routes), SQL migrations, Procurement / Inventory / Finance / CRM / Projects / Service List*, RC7.2b+, RC7.3, Workflow / Approval / Policy engines, V1 freeze Included set.

## Suggested commit message (do not commit until approved)

```
feat(rc7.2a): add Sales List* queries via authorized list foundation

Register ListOpportunity, ListQuote, and ListSalesOrder using
buildAuthorizedListPage (ADR D56). No UI de-fixturing or other modules.
```
