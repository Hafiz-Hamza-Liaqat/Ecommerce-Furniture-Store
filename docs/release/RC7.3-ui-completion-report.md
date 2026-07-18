# RC7.3 UI Completion Report

- **Date:** 2026-07-18
- **Slice:** Production UI de-fixturing
- **Verdict:** Included List* surfaces complete for Production cutover

## Completed in this slice

### List experience (Included entities)

| Capability | Status |
|---|---|
| Live CQRS List* wiring | Done (26 entity bindings) |
| Search (`q`) via ListQueryRequest | Done (bounded application search) |
| Filters (allow-listed fields) | Done |
| Pagination (page size 25, server totals) | Done |
| Loading skeleton | Done |
| Empty state | Done |
| Error state (incl. Policy deny) | Done |
| Production fail-closed (no fixture swap) | Done |
| Demo fixture fallback with warning | Done |

### Already present (unchanged / reused)

Create/Edit forms, detail/Get, lifecycle actions, module nav, Workflow/Approvals live pages, pins/watches, collaboration chrome — retained from prior phases.

## Not claimed as “complete product” in RC7.3

| Surface | Status |
|---|---|
| Global Search **module** | Deferred (RC7.12) |
| Reporting engine / new report builders | Deferred (RC7.8+) |
| Settings suite redesign | Existing pages only; not RC7.3 charter |
| Admin tenants / deep admin | Existing pages only |
| Non-Included fixture entities | Intentionally fixture until freeze expands |
| Full enterprise UX redesign (shortcuts/a11y audit program) | Incremental; not a separate engine |

## Production cutover note

Set `VITE_UI_PROFILE=production` (or ship a Vite production build) so Included lists never fall back to fixtures.
