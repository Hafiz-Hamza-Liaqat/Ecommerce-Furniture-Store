# RC8.4 — UX Consistency Review

- **Date:** 2026-07-19

## Shared language verified

| Pattern | Marketing | Workspace |
|---|---|---|
| Skip link | Yes | Yes |
| Focus-visible | Yes | Yes |
| Dialog focus trap | Yes (RC8.3) | Yes (shared hook) |
| Page skeletons | Yes | Yes (route + ModuleApp) |
| Empty / error | Site empty + EnterpriseError | EmptyState / ErrorState / EnterpriseError |
| Shortcuts | `/`, ⌘K, Esc | `/`, ⌘K, Esc, ? overlay |
| Dark theme | `data-site-theme` | `data-theme` (session synced) |
| Breadcrumbs | CX breadcrumbs | ModuleApp / PageHeader |

## Dual EmptyState note

`components/ui` and `workspace/widgets` both export EmptyState — accepted residual; not merged to avoid broad refactor risk in RC freeze.

## Verdict

**PASS WITH NOTES** — consistent enough for release candidate; dual primitives documented, not redesigned.
