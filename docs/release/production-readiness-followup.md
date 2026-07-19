# Production readiness follow-up

Date: 2026-07-19  
Scope: Gaps called out before declaring the product truly production-ready.

## 1. Permission gaps (`hr.ListEmployee`, `jobs.ListBackgroundJobs`)

**Cause:** Dev SQLite was seeded once with an older RBAC catalog. `seedRbacCatalog` is idempotent and backfills missing permissions onto system roles (including `admin`), but it was only invoked from tests — not API host startup.

**Fix:** `createApiHost().start()` now runs `seedRbacCatalog` before serving. Restarting the runtime host re-links `hr.employees.*` and `jobs.jobs.*` (and any other newly catalogued codes) onto the admin role.

**Expected denials:** Non-admin / least-privilege roles that lack those permissions still receive Policy `permission_missing`. That is correct authorization behavior, not a seed bug.

**Verify:** After restart, smoke admin sign-in → `hr.ListEmployee` and `jobs.ListBackgroundJobs` should succeed for users with the `admin` role.

## 2. Login redirect React error

**Symptoms:** Intermittent `Cannot read properties of null (reading 'useState')` on login → `/app`, recovered by reload.

**Mitigations shipped:**
- Vite-dev CSP relaxation so React Refresh inline preamble is not blocked by `script-src 'self'`
- Login navigates inside `startTransition` with `replace: true`
- `RouteAwareErrorBoundary` clears on route change
- Vite `resolve.dedupe` for React + safer `manualChunks` matching

## 3. Playwright E2E

Package: `@afh/web`

```bash
npm install
npm run test:e2e:install -w @afh/web
# with API on :8080 and Vite on :5173
npm run test:e2e -w @afh/web
```

Coverage: homepage → category → product → wishlist → compare; planner; consultant; login form; 404; authenticated dashboard / notifications / reports / search / CRM (uses `AFH_E2E_EMAIL` / `AFH_E2E_PASSWORD`, defaulting to the smoke admin).

CI: optional follow-on — suite is ready; wire a dedicated job when stable credentials exist in CI secrets.

## 4. Real device QA

See [device-qa-checklist.md](./device-qa-checklist.md). Emulator/Playwright mobile project covers Pixel-class Chrome; physical iPhone Safari / Android / iPad still require manual sign-off.

## 5. Lighthouse

```bash
npm run build -w @afh/web
npx serve -s packages/web/dist -l 4173
# other terminal:
$env:AFH_LIGHTHOUSE_BASE_URL='http://localhost:4173'; node scripts/lighthouse-audit.mjs
```

Targets: Performance ≥ 90, Accessibility / Best Practices / SEO ≥ 95 on Home, Category, Product. Login is audited for a11y/perf/best-practices; **SEO is skipped** because `robots.txt` Disallows `/login` intentionally.

Results: `docs/release/lighthouse/SUMMARY.md`.

## 6. Production deployment validation

See [production-deployment-validation.md](./production-deployment-validation.md).
