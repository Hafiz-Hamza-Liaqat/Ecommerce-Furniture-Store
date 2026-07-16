# RC5.2 — Route Protection Implementation Report

**Date:** 2026-07-17  
**Scope:** Frontend route protection only, per the frozen Route Protection Matrix (`docs/rc5/04-Route-Protection-Matrix.md`)  
**Status:** Complete; stopped before RC5.3

## Summary

RC5.2 adds presentation-only permission gating to the routes documented in the
frozen matrix. Guards consume the canonical `permissionCodes` already exposed
by `GET /api/v1/auth/session` (RC5.2 prerequisite) and the declarative
route-permission catalog frozen at `rc5.route-permissions.v1`. The backend
Policy Engine remains the sole authoritative authorizer: a crafted deep link
that bypasses the UI guard still cannot read data because every API call is
Policy-checked.

No Policy Engine, CQRS handler, HTTP endpoint, session/JWT format, navigation,
sidebar, or dashboard behavior changed.

## What was implemented

### 1. Declarative route metadata — `packages/web/src/routes/route-permissions.ts`

- `ROUTE_ACCESS_CATALOG`: an exact presentation mirror of the identity
  route-access catalog (`packages/identity/src/rbac/catalog/route-permission-catalog.ts`,
  version `rc5.route-permissions.v1`), following the established
  presentation-mirror convention (`packages/web/src/api/types.ts`). A sync
  test asserts entry-for-entry equality with the identity catalog, so drift
  fails CI.
- `findRouteAccess(pathname)` / `requiredPermissionsFor(pathname)`: first-match
  resolution with exact/prefix semantics; specific children
  (`/app/analytics/builder`, `/app/ai/usage`, `/app/platform/deployment`)
  precede broader prefixes. Empty `requiredPermissions` = authentication-only.
- `hasRequiredPermissions(required, granted)`: AND semantics, consistent with
  backend Policy (each permission is required on its own operation).
- `isRoutePermissionGuardEnabled()`: rollout feature flag (below).

### 2. Session permission state — `packages/web/src/state/session.tsx`

`SessionProvider` now resolves `permissionCodes: readonly string[] | null`
from the existing `GET /api/v1/auth/session` endpoint whenever a session
exists (re-resolved on session change, cleared on sign-out). `null` means
"unresolved" — the guard renders a loading state rather than issuing a false
denial. No new endpoint, token field, or storage format was introduced;
permission codes are held in memory only, never persisted.

### 3. Reusable guards — `packages/web/src/auth/RequirePermission.tsx`

- `RequirePermission({ required, children })` — reusable gate:
  - flag disabled → children (pre-RC5.2 session-only behavior);
  - `required` empty → children (authentication-only route);
  - codes unresolved → `RouteFallback` loading skeleton;
  - codes resolved and incomplete → `ForbiddenRoute`;
  - otherwise → children.
- `RequireRoutePermission` — layout-route guard that resolves the current
  `location.pathname` against the catalog, so nested wildcard children and
  direct URL entry get identical checks.
- `RequireRoutePermissionElement` — element-wrapper variant for `/portal/*`
  and `/admin/platform/*`, which mount outside the `/app` layout tree.
- `ForbiddenRoute` — reuses the existing `EnterpriseError kind="forbidden"`
  (403 "Access denied") experience for authenticated users lacking a required
  permission; home action targets `/app/me` (authentication-only workspace).

### 4. Route wiring — `packages/web/src/App.tsx`

- A single `RequireRoutePermission` layout route was inserted **inside**
  `RequireAuth` → `AppShell`, covering every `/app` surface. The Forbidden
  experience renders in the shell content area; the sidebar and navigation are
  untouched (not filtered, not hidden).
- `/portal/*` and `/admin/platform/*` wrap their existing `RequireAuthElement`
  content with `RequireRoutePermissionElement`.
- `RequireAuth` / `RequireAuthElement` are unchanged: unauthenticated users
  are still redirected to `/login` before any permission logic runs.

### 5. Feature flag (rollout safety)

Permission-aware routing is enabled by default and can be disabled without a
deploy or with one:

| Mechanism | Value | Effect |
|---|---|---|
| `localStorage["afh.web.routeGuard"]` | `"0"` | Disable at runtime (per browser) |
| `localStorage["afh.web.routeGuard"]` | `"1"` | Force-enable, overriding the build flag |
| `VITE_ROUTE_PERMISSION_GUARD` env | `"0"` / `"false"` | Disable at build time |

Disabled = exact pre-RC5.2 behavior (session-presence-only guards). This
implements the `ui_route_perms`-style rollback documented in
`docs/rc5/09-Implementation-Plan.md`.

## Protected routes (from the frozen matrix)

All 35 catalog entries are enforced by the guards; permission-bearing examples:

| Route | Match | Required permissions |
|---|---|---|
| `/app` | exact | `executive.dashboard.read` |
| `/app/calendar` | exact | `calendar.events.read` |
| `/app/analytics/*` | prefix | `analytics.dashboards.read` |
| `/app/analytics/builder` | exact | `analytics.dashboards.read` + `analytics.dashboards.configure` |
| `/app/reports/*` | prefix | `reporting.reports.read` |
| `/app/insights` | exact | `analytics.insights.read` |
| `/app/ai/*` | prefix | `ai.assistant.use` |
| `/app/ai/usage` | exact | `ai.assistant.use` + `ai.usage.read` |
| `/app/settings/ai` | exact | `ai.settings.manage` |
| `/app/integrations/*` | prefix | `integrations.catalog.read` |
| `/app/platform/*` | prefix | `platform.operations.read` |
| `/app/platform/deployment` | exact | `platform.operations.read` + `platform.health.read` |
| `/app/workflow` | exact | `platform.workflows.read` |
| `/app/approvals` | exact | `platform.approvals.read` |
| 14 ERP module mounts `/app/{module}/*` | prefix | `{module}.dashboard.read` |
| `/portal/*` | prefix | `portal.customer_portal.read` |
| `/admin/platform/*` | prefix | `platform.administration.read` |

Authentication-only (no permission requirement, unchanged): `/app/me`,
`/app/preferences`, `/app/account/email-verification`, `/app/account/mfa`,
`/app/account/security`. Public marketing, auth, and onboarding routes are
untouched.

Module CRUD-level route permissions (`{base}/:entity/new` →
`{module}.{resources}.create`, etc., matrix section E) are **not** implemented
— module CRUD permissions are explicitly out of RC5.2 scope; those deep links
resolve to the module prefix guard (`{module}.dashboard.read`), and the API
Policy Engine continues to deny unauthorized data operations.

## Files changed

| File | Change |
|---|---|
| `packages/web/src/routes/route-permissions.ts` | New — declarative route metadata mirror, matching, flag |
| `packages/web/src/auth/RequirePermission.tsx` | New — `RequirePermission`, `RequireRoutePermission`, `RequireRoutePermissionElement`, `ForbiddenRoute` |
| `packages/web/src/state/session.tsx` | Extended — resolves `permissionCodes` from the existing session endpoint |
| `packages/web/src/App.tsx` | Wired guards into `/app`, `/portal/*`, `/admin/platform/*` |
| `packages/web/src/routes/route-permissions.test.ts` | New — catalog sync + matching + flag tests |
| `packages/web/src/auth/RequirePermission.test.tsx` | New — component permission/forbidden/loading/flag tests |
| `packages/web/src/App.test.tsx` | New — integration tests over the real route tree |
| `packages/web/vitest.config.ts` | New — vitest jsdom configuration |
| `packages/web/package.json` | Added `test` script and test devDependencies (vitest, jsdom, testing-library) |
| `docs/rc5/09-Implementation-Plan.md` | RC5.2 implementation evidence pointer |

No backend package was modified.

## Tests

`npm test -w @afh/web` — 36 tests, 3 files, all passing:

- **Catalog** (13): version + entry-for-entry sync with the frozen identity
  catalog; exact/prefix matching; child-over-prefix specificity; auth-only
  routes; unknown routes; trailing-slash normalization; sibling-prefix
  non-match; AND semantics; flag default/disable/force-enable.
- **RequirePermission component** (6): permitted render; forbidden when
  missing; AND semantics; loading state while resolving (never a false deny);
  auth-only immediate render; flag bypass.
- **Route protection integration** (17, real `AppRoutes` tree with mocked
  pages): preserved `RequireAuth` redirects for unauthenticated direct URLs;
  unauthorized (authenticated, missing permission) 403 experiences for module,
  workspace, portal, and admin routes with the shell still visible;
  authorized renders; **direct URL authorization** for deep module links and
  the analytics builder (both-permission) case; flag rollback to session-only
  behavior.

## Verification results

| Gate | Command | Result |
|---|---|---|
| Build | `npm run build` (all 34 workspaces) | PASS |
| Typecheck | `npm run typecheck` (all workspaces) | PASS |
| Lint | `npm run lint` (`--max-warnings 0`) | PASS |
| Identity tests | `npm test -w @afh/identity` | PASS (54/54) |
| API tests | `npm test -w @afh/api` | PASS (4/4) |
| Web route protection tests | `npm test -w @afh/web` | PASS (36/36) |

## Scope compliance

Not modified: Policy Engine, CQRS handlers, authorization decisions, HTTP
endpoints, JWT/session format (beyond the approved prerequisite), sidebar
menus, navigation, dashboards, record-level security, field-level security,
module CRUD permissions, workflow behavior, runtime architecture. No new
authorization framework was introduced; guards are thin presentation
components over existing session state and the frozen catalog.

**Stop point:** RC5.2 complete. RC5.3 (dashboard authorization) not started.
Changes are uncommitted, awaiting review.

> **Post-audit fix (2026-07-17):** the RC5.2 verification audit found that
> permission codes were not re-resolved after silent token refresh; fixed in
> RC5.2.1 — see `docs/release/RC5.2.1-session-refresh-permission-reload.md`.
