# RC7.2d — Finance List Implementation Report

- **Date:** 2026-07-18
- **Slice:** Finance List Implementation (`ListFinancialAccount`, `ListInvoice`, `ListPayment`, `ListLedger`)
- **Planning:** `docs/release/RC7.2d-planning-proposal.md` (v1.1 approved)
- **Depends on:** RC7.2c (`7ee1a56`), RC7.1 (`1fb1a26`), ADR D56
- **Status:** Implementation complete — **awaiting review; not committed**

---

## What was delivered

1. **Query types** in `@afh/finance-application`
   - `finance.ListFinancialAccount`
   - `finance.ListInvoice`
   - `finance.ListPayment`
   - `finance.ListLedger` (ledger **headers only**)
2. **Handlers** each use `principalListScope` + unmodified `buildAuthorizedListPage`
3. **`PaymentRepository.listByCompany`** / **`LedgerRepository.listByCompany`** — minimal RC7.1 contract completions (not new business capabilities / schema / freeze expansion); SQL adapters wire existing `docs.listByCompany` — **no migration**
4. Invoice/Payment List* apply the same field-security projection as Get*
5. **Validators** — unknown sort/filter fail closed
6. **Composition** registration + **62** tests (15×4 + Get/lifecycle regression)
7. Closeout docs (this + verification + audit + test summary)

## Architecture compliance

| Constraint | Result |
|---|---|
| Finance owns aggregates/repos | PASS — List* handlers only |
| `buildAuthorizedListPage` unmodified | PASS |
| Company → candidates → Policy → page | PASS |
| ListLedger = headers only | PASS |
| Bounded scan | PASS |
| No UI/API/other modules/RC7.2e | PASS |

## Suggested commit message (do not commit until approved)

```
feat(rc7.2d): add Finance List* queries using shared authorized list foundation

Implement ListFinancialAccount, ListInvoice, ListPayment, and ListLedger using
principalListScope and buildAuthorizedListPage from RC7.1.
Complete PaymentRepository and LedgerRepository listByCompany contracts required
by the shared authorized-list abstraction (no schema or behavior change).
No UI, APIs, SQL migrations, or other module changes.
```
