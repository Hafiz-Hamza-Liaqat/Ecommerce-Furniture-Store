# RC7.2d Test Summary

- **Date:** 2026-07-18
- **Package:** `@afh/finance-application`
- **Result:** **62/62 PASS**

## Per List* handler (×4)

Happy path, pagination, sorting, filtering, search (`q`), authorized totalCount, empty authorized, Policy deny, missing principal, Policy failure, company isolation, IDOR, invalid sort, invalid filter, AuthorizationSpec gate — all **PASS**.

## Regression

| Case | Status |
|---|---|
| Get handlers identical after List registration | PASS |
| Create/Update/Record/Append commands remain registered | PASS |

## Foundation regression

| Suite | Result |
|---|---|
| shared-kernel list-query | 6/6 PASS |
| application authorized-list | 4/4 PASS |
