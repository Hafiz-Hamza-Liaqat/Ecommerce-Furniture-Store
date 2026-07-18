# RC7.2b Test Summary

- **Date:** 2026-07-18
- **Package:** `@afh/procurement-application`
- **Command:** `npm run test -w @afh/procurement-application`
- **Result:** **47/47 PASS**

## Coverage matrix (per List* handler)

Each of `ListSupplier`, `ListPurchaseRequisition`, `ListPurchaseOrder` includes:

| Case | Status |
|---|---|
| Happy path | PASS |
| Pagination | PASS |
| Sorting | PASS |
| Filtering | PASS |
| Search (`q`, application-bounded) | PASS |
| Authorized totalCount | PASS |
| Empty authorized result | PASS |
| Policy deny | PASS |
| Missing principal (fail closed) | PASS |
| Policy failure (fail closed) | PASS |
| Company isolation | PASS |
| IDOR negatives | PASS |
| Invalid sort field (no silent fallback) | PASS |
| Invalid filter | PASS |
| AuthorizationSpec collection gate | PASS |

## Regression

| Case | Status |
|---|---|
| Existing Get handlers behave identically after List registration | PASS |
| Existing Create/Update/Lifecycle command handlers remain registered | PASS |

## Foundation regression

| Suite | Result |
|---|---|
| `@afh/shared-kernel` list-query (RC7.1) | 6/6 PASS |
| `@afh/application` authorized-list (RC7.1) | 4/4 PASS |

## Combined count

| Suite | Tests |
|---|---|
| procurement-application | 47 |
| shared-kernel (regression) | 6 |
| application (regression) | 4 |
| **Reported procurement-application total** | **47** |
