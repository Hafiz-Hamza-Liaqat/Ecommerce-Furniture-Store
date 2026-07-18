# RC7.3 Test Summary

- **Date:** 2026-07-18
- **Primary package:** `@afh/web`
- **Command:** `npm test -w @afh/web`
- **Result:** **66/66 PASS**

## New / extended coverage

| Suite | Cases | Focus |
|---|---|---|
| `ui-profile.test.ts` | 5 | production/demo resolution; fixture fallback gate |
| `list-query.test.ts` | 3 | ListQueryRequest payload; status normalize; readListPage |
| `ModuleApp.list.test.tsx` | 3 | live List*; Production 403 no fixtures; empty page |
| `list-bindings.test.ts` | 1 | 26 Included entity → listQueryType + mapEntity inventory |

## Regression (web)

| Suite | Result |
|---|---|
| Prior `@afh/web` suites (platform, types, etc.) | PASS (included in 66) |

## Runtime gates

| Gate | Result |
|---|---|
| `npm run verify -w @afh/runtime-host` | PASS |
| `npm run harden -w @afh/runtime-host` | PASS |
| `npm run accept -w @afh/runtime-host` | PASS |

## Monorepo quality

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `@afh/web` build (tsc + vite) | PASS |
