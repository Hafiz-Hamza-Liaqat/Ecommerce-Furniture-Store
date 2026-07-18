# RC7.2c — Inventory List Implementation Report

- **Date:** 2026-07-18
- **Slice:** Inventory List Implementation (`ListInventoryItem`, `ListWarehouse`, `ListStock`)
- **Planning:** `docs/release/RC7.2c-planning-proposal.md` (v1.1 approved)
- **Depends on:** RC7.2b (`d01c880`), RC7.1 (`1fb1a26`), ADR D56
- **Status:** Implementation complete — **awaiting review; not committed**

---

## What was delivered

1. **Query types** in `@afh/inventory-application`
   - `inventory.ListInventoryItem`
   - `inventory.ListWarehouse`
   - `inventory.ListStock`
2. **Handlers** each use `principalListScope` + unmodified `buildAuthorizedListPage`
3. **`StockRepository.listByCompany`** — minimal RC7.1 contract completion (not a new business capability / schema / freeze expansion); SQL adapter wires existing `docs.listByCompany` — **no migration**
4. **Validators** — unknown sort/filter fail closed
5. **Composition** registration + **47** tests (15×3 + Get/lifecycle regression)
6. Closeout docs (this + verification + audit + test summary)

## Architecture compliance

| Constraint | Result |
|---|---|
| Inventory owns aggregates/repos | PASS — List* handlers only; stock engine untouched |
| `buildAuthorizedListPage` unmodified | PASS |
| Company → candidates → Policy → page | PASS |
| Bounded scan | PASS |
| No UI/API/other modules/RC7.2d | PASS |

## Suggested commit message (do not commit until approved)

```
feat(rc7.2c): add Inventory List* queries using shared authorized list foundation

Implement ListInventoryItem, ListWarehouse, and ListStock using
principalListScope and buildAuthorizedListPage from RC7.1.
No UI, APIs, migrations, or other module changes.
```
