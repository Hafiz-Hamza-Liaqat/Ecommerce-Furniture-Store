# RC8.1–RC8.5 Regression Audit

- **Date:** 2026-07-19
- **Scope:** Read-only verification of RC8.1 Customer Experience, RC8.2 Enterprise Workspace, RC8.3 Production Quality, RC8.4 Release Readiness, RC8.5 Premium Product Experience
- **Code changes during audit:** **None** (verification + this report only)

## Verdict

**PASS WITH NOTES** — no blocking regressions found across gates, routes, TypeScript, lint, build, runtime, E2E, or customer/console smoke.

| Check | Result |
|---|---|
| No regressions (gates + journeys) | **PASS** |
| No broken routes | **PASS** (68/68 smoke) |
| No TypeScript issues | **PASS** (`@afh/web`, `@afh/api`) |
| No lint issues | **PASS** (`@afh/web`, `@afh/api`, max-warnings 0) |
| No build issues | **PASS** (`@afh/web` Vite production build) |
| No accessibility regressions | **PASS WITH NOTES** (structural/keyboard; no axe CI) |
| No runtime regressions | **PASS** (verify / harden / accept) |
| No dead links | **PASS** (nav + static assets HTTP 200) |
| No duplicate routes | **PASS** (`App.tsx` top-level / marketing / `/app` children) |
| No console errors | **PASS WITH NOTES** (CSP meta noise only) |
| No obvious UX inconsistencies | **PASS WITH NOTES** (documented dual EmptyState) |

---

## Gate evidence (this run)

| Gate | Command | Result |
|---|---|---|
| Web typecheck | `npm run typecheck -w @afh/web` | **PASS** |
| Web lint | `npm run lint -w @afh/web` | **PASS** |
| Web unit tests | `npm test -w @afh/web` | **PASS 87/87** (14 files) |
| Web build | `npm run build -w @afh/web` | **PASS** (~3.3s Vite) |
| API typecheck | `npm run typecheck -w @afh/api` | **PASS** |
| API lint | `npm run lint -w @afh/api` | **PASS** |
| Runtime verify | `npm run verify -w @afh/runtime-host` | **PASS** |
| Runtime harden | `npm run harden -w @afh/runtime-host` | **PASS** |
| Runtime accept | `npm run accept -w @afh/runtime-host` | **PASS** |
| Playwright E2E | `npm run test:e2e -w @afh/web` | **PASS 16/16** |

### E2E coverage exercised

- Customer: home → category → product → wishlist → compare; planner; consultant; catalog; login form; 404
- Mobile Chrome: same customer suite
- Auth workspace: login → dashboard (no React error boundary); notifications; search; CRM list

---

## Route / link audit

### HTTP smoke (`scripts/smoke-pages.mjs`)

- **68/68 passed**, **0 failures**
- API live/ready healthy; Vite proxy `/health/live` 200
- Marketing, auth, and `/app/*` shells return SPA 200

### Content smoke (`scripts/smoke-content.mjs`)

- All probed customer pages: status 200, `#root` present, main script present
- OpenAPI 200; unauthenticated query **401** (fail-closed)
- Register endpoint 201

### Duplicate routes

Static analysis of `packages/web/src/App.tsx`:

- Top-level sibling route path duplicates: **none**
- Marketing child path duplicates: **none**
- `/app` child path duplicates: **none**

Intentional parallel surfaces (not duplicates): marketing `/projects` vs `/app/projects`; marketing `/manufacturing` vs `/app/manufacturing/*`.

### Static / media assets (Vite `localhost:5173`)

| Asset | Status |
|---|---|
| `/catalogue.pdf` | 200 |
| `/sitemap.xml` | 200 |
| `/robots.txt` | 200 |
| `/favicon.svg` | 200 |
| Meridian 360 `frame001.jpg` / `frame072.jpg` | 200 |

### Console probe (Playwright, key CX routes)

Routes: `/`, `/products/meridian-sofa`, `/furniture`, `/login`, `/compare`, `/wishlist`, `/planner`, `/quote`, `/about`

- **pageerror / React crashes:** none
- **failed network requests:** 0
- **Console messages:** repeated browser note — `frame-ancestors` ignored when CSP is delivered via `<meta>` (known non-blocking; not an app exception)

---

## Phase confirmation

| Release | Focus | Audit status |
|---|---|---|
| **RC8.1** | Customer Experience | **Confirmed intact** — journeys, marketing routes, planner/consultant/wishlist/compare green |
| **RC8.2** | Enterprise Workspace | **Confirmed intact** — auth E2E workspace + CRM; runtime gates green |
| **RC8.3** | Production Quality | **Confirmed intact** — a11y/responsive/error foundations still present; gates green |
| **RC8.4** | Release Readiness | **Confirmed intact** — verify/harden/accept + smoke packaging still green |
| **RC8.5** | Premium Product Experience | **Confirmed intact** — PDP media routes, 360 assets served, media unit tests in 87/87 |

Prior phase reports under `docs/release/RC8.*` remain consistent with this live re-run.

---

## Notes (non-blocking)

1. **CSP meta `frame-ancestors` console noise** — browser warning only; does not break routes or React.
2. **API dashboard summary warnings** — runtime logs still show occasional `validation_failed` for `projects.GetProjectSummary` / `service.GetServiceSummary` on demo company loads (pre-existing workspace note; not introduced by RC8.5 media work).
3. **Accessibility** — skip links, focus traps, keyboard gallery/360, reduced-motion auto-spin remain; automated axe CI still not in pipeline (same as RC8.3 note).
4. **UX** — dual `EmptyState` primitives (UI vs workspace widgets) remain accepted residual per RC8.4 UX review.
5. **360 demo assets** — photographic cutout sequence validates the engine; not multi-camera turntable capture (product fidelity note, not a regression).
6. **Commit status (post-audit)** — RC8.3–RC8.5 committed; RC8 marked **COMPLETE AND FROZEN** in `docs/rc8/README.md`.

---

## FAIL count

**0 FAIL.**

## Recommendation

Baseline accepted. Do not expand RC8 features except for bug fixes; start later capabilities in a new RC after approval.
