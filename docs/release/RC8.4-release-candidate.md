# RC8.4 — Release Candidate

- **Date:** 2026-07-19
- **Candidate name:** **AFH RC8.4**
- **Git commit for this package:** _pending approval_ (will include RC8.3 + RC8.4 docs + quality implementation)

## Scope included

1. RC8.1 Customer Experience (already on `main`)
2. RC8.2 Enterprise Workspace (already on `main`)
3. RC8.3 Production Quality implementation (this change set)
4. RC8.4 readiness / security / UX / performance reviews (this change set)

## Exit criteria

| Criterion | Met? |
|---|---|
| `npm run build` | Yes |
| `npm run typecheck` | Yes |
| `npm run lint` | Yes |
| Web tests | Yes (76/76) |
| Runtime verify / harden / accept | Yes |
| Architecture freeze honored | Yes |
| Reports published under `docs/release/` | Yes |
| `docs/rc8/README.md` updated | Yes |

## Post-RC (explicitly out of scope)

- Production domain replacement for SEO host
- Playwright + axe CI
- CDN/AVIF image pipeline
- Merging dual EmptyState primitives
- Admin Identity ListUser wiring (needs CQRS surface)

## Declaration

Pending human approval of the RC8.3/RC8.4 commit, this package is declared a **Release Candidate** for Artisan Furnish Hub under the frozen architecture.
