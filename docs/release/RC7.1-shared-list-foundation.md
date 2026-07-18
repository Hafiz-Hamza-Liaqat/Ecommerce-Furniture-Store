# RC7.1 — Shared List Foundation

- **Date:** 2026-07-18
- **Decision record:** `docs/architecture/decision-records/ADR-D56-authorized-list-totals.md`
- **Planning:** `docs/release/RC7.1-planning-proposal.md` (v1.1 approved)

## What was delivered

1. **`@afh/shared-kernel` List* contracts** (`paging/list-query.ts`)
   - `ListQueryRequest`, page normalization, cursor encode/decode
   - Sort/filter allow-list validators, `companyId` required helper
   - Reuses existing `PageRequest` / `QueryCriteria` / `Page<T>` (no parallel stack)
2. **`@afh/application` bounded authorized scan** (`security/authorized-list.ts`)
   - `buildAuthorizedListPage` — Policy row filter via existing `filterAuthorizedRecords`
   - `totalCount` = authorized population only; repository totals never exposed
   - Scan ceiling fail-closed (`list_scan_ceiling`)
3. **ADR D56** + ADR-INDEX entry
4. **Unit tests** (shared-kernel 6, application 4) including public-export reuse sketch

## Production / module impact

**None.** No module handlers, UI, APIs, migrations, repository changes, Workflow/Approval/Policy ownership changes.

## Package ownership (as frozen)

| Package | Owns |
|---|---|
| shared-kernel | List* contracts |
| application | Policy integration (`buildAuthorizedListPage`) |
| modules | Repositories (unused in RC7.1) |

## Out of scope (confirmed untouched)

Module `List*` handlers, UI, HTTP routes, SQL migrations, RC7.2+.
