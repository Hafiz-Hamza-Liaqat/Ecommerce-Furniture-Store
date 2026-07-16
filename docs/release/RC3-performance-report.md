# RC3 — Performance Optimization Report

## Before (RC1 baseline)

- Single main JS chunk ~730 KB (~199 KB gzip)
- All routes eagerly imported in `App.tsx`

## After (RC3)

| Asset | Size (gzip) |
|-------|-------------|
| `index-*.js` (shell + shared routes) | ~42 KB |
| `react-*.js` | ~59 KB |
| `router-*.js` | ~14 KB |
| `DamPage-*.js` (lazy ERP) | ~40 KB |
| `IntegrationsRoutes-*.js` | ~9 KB |
| `AiRoutes-*.js` | ~5 KB |
| `HomePage-*.js` | ~4 KB |
| CSS | ~15 KB |

**Initial load (login/home):** ~42 KB app + react + router (~115 KB gzip). Heavy modules (DAM, integrations, AI) load on navigation only.

## Techniques

1. **Route-level code splitting** — `React.lazy` + `Suspense` via `routes/lazy.tsx` and `RouteSuspense`
2. **Vendor chunks** — `react`, `react-router`, `vendor` via Vite `manualChunks` (node_modules only)
3. **No duplicate fetch** — existing `dedupe.ts` retained (RC2)
4. **Lazy marketing company pages** — shared chunk per `CompanyPages.tsx` module

## Build

- `npm run typecheck` — pass
- `npm run lint` — pass
- `npm run build` — pass, no circular chunk warning after manual chunk fix

## Verdict

**Pass** — significant initial bundle reduction; heavy modules load on demand.
