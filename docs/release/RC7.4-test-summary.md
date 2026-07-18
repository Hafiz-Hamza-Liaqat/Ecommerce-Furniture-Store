# RC7.4 Test Summary

- **Date:** 2026-07-18
- **Result:** All affected package tests **PASS**

## Totals

| Package | Pass |
|---|---|
| `@afh/application` | 10 |
| `@afh/persistence-sql` | 8 |
| `@afh/inventory-application` | 51 |
| `@afh/finance-application` | 62 |
| `@afh/shared-kernel` | 6 |
| **Combined (listed)** | **137** |

## New coverage

| Suite | Cases |
|---|---|
| `collaboration/collaboration.test.ts` | Create reject wrong entityType; list notes; attach assetId; parent Policy resource; audit hook |
| `mapping/document-repository.test.ts` | Stale `expectedVersion` fails closed |
| `handlers/rc74-hardening.test.ts` | Dual-branch deny; insufficient_stock; stale Update OCC; ListStock branchId |

## Regression

RC7.1 authorized-list + ListQuery contracts; RC7.2c/d List* matrices; RC6 SQL platform stores — all green.
