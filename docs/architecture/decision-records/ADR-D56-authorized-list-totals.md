# ADR-D56 — Authorized List* totals via bounded Policy scan (RC7.1)

- **Status:** Accepted
- **Date:** 2026-07-18
- **Slice:** RC7.1 — Shared List Foundation
- **Depends on:** D43, D45, D46, D47, RC7.0 V1 freeze

## Context

RC7 delivers ERP `List*` queries. ADR D46 already requires Policy row filtering and
notes that when true `List*` endpoints ship, **totals must be computed after
filtering**. Leaving total-count strategy per module would create inconsistent
leakage and UX. RC7.1 freezes one shared rule and one implementation strategy
before any module handlers exist.

## Decision

1. **Authorized total rule.** Every `List*` response `Page.totalCount` is the
   number of records **visible after Policy row filtering**. Repository
   `COUNT(*)` / pre-filter totals must **never** be exposed on `List*` pages.
2. **Single strategy: bounded authorized scan.** Module handlers supply a
   company-scoped candidate batch fetcher. `@afh/application`
   `buildAuthorizedListPage`:
   - loads candidates in bounded batches;
   - filters each batch with existing `filterAuthorizedRecords` (Policy sole
     authorizer);
   - accumulates authorized rows;
   - sets `totalCount` to the authorized population;
   - slices `items` from the authorized sequence for the requested page/cursor;
   - fails closed if a safety scan ceiling would produce a partial total.
3. **Package ownership.**
   - `@afh/shared-kernel` owns List* **contracts** (extends existing paging /
     `QueryCriteria` — no parallel paging stack).
   - `@afh/application` owns Policy **integration** for lists.
   - Module packages own **repositories** / candidate fetchers.
   - No other package owns List* semantics.
4. **No module alternatives.** RC7.2a–g and later must call the shared helper;
   over-fetch window totals, raw repo totals, and SQL authz counts are rejected.
5. **No ownership changes.** Policy / Workflow / Approval engines unchanged.

## Consequences

- RC7.2+ handlers share identical total semantics.
- Large candidate sets may scan up to the documented ceiling; exceeding it
  fails closed rather than returning a silent under-count.
- Cursor pagination, when used, continues the **authorized** sequence via an
  opaque offset cursor helper in shared-kernel.
- Audit volume may increase with per-row Policy denies during scans (same as
  D46 disposition).

## Rejected alternatives

- Window-only or single over-fetch totals that understate authorized population.
- Copying repository totals onto `Page.totalCount`.
- Per-module custom total strategies.
- SQL RLS / second authorization authority (rejected by D46).
