# RC7.2a Test Summary

- **Date:** 2026-07-18
- **Package:** `@afh/sales-application`
- **Command:** `npm run test -w @afh/sales-application`
- **Result:** **45/45 PASS**

## Coverage matrix (per handler)

Each of `ListOpportunity`, `ListQuote`, `ListSalesOrder` includes:

| Case | Status |
|---|---|
| Happy path | PASS |
| Policy deny | PASS |
| Company isolation | PASS |
| IDOR negative (leaked foreign company row) | PASS |
| Authorized totalCount | PASS |
| Empty authorized result | PASS |
| Pagination | PASS |
| Sorting | PASS |
| Filtering | PASS |
| Search | PASS |
| Invalid sort field | PASS |
| Invalid filter | PASS |
| Missing principal (fail closed) | PASS |
| Policy evaluation failure (fail closed) | PASS |
| AuthorizationSpec collection gate | PASS |

## Regression

| Suite | Result |
|---|---|
| `@afh/shared-kernel` list-query (RC7.1) | 6/6 PASS |
| `@afh/application` authorized-list (RC7.1) | 4/4 PASS |
