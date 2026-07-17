# RC5.5.1 — UI Regression Fixes (Post-RC5.5 Stabilization)

Date: 2026-07-17
Scope: frontend-only stabilization after RC5.5. No Policy Engine, RBAC catalog,
CQRS authorization, route permission, or API behavior changes.

---

## 1. Root-cause analysis

### 1.1 Executive Dashboard stuck on loading skeletons

**Cause: dev API process lifetime, surfaced by a frontend liveness gap — not
session logic, route protection, or React state.**

- The `runtime-host` API process serving `http://127.0.0.1:8080` terminated
  when the terminal session that spawned it ended. The Vite dev-server log
  shows `connect ECONNREFUSED 127.0.0.1:8080` for `/api/v1/auth/session`
  beginning 23:15 local time.
- With the API unreachable, the `SessionProvider` permission fetch
  (`GET /api/v1/auth/session`) rejected, leaving `permissionCodes = null`.
- `RequirePermission` treats `null` codes as "still resolving" and renders the
  loading fallback. Because nothing ever re-triggered the fetch, the skeleton
  state persisted indefinitely — a blank-looking dashboard.
- The RC5.2 design was deliberate fail-closed ("never a false deny while
  loading"), but it had no terminal state for *fetch failure*, so an API
  outage looked identical to loading forever.

**Fixes**

1. Backend restarted as a detached process (survives terminal cleanup).
2. `SessionProvider` now tracks `permissionsError` and exposes
   `reloadPermissions()`. A failed permission fetch flips the error flag
   instead of silently staying `null`.
3. `RequirePermission` renders a retriable "Could not load your permissions"
   error (with a Retry button) when the load fails. Access remains
   fail-closed: no route content is ever rendered without resolved codes, and
   the backend Policy Engine remains the sole authorizer.

### 1.2 Sidebar fixed at a too-small width

**Cause: the sidebar width was a hardcoded token (`--afh-sidebar: 280px`)
with no user control; collapse was the only degree of freedom.**

**Fix (implemented as part of this phase, verified here)**

- `sidebarWidth` is a persisted workspace preference
  (default 280px, clamped 220–460px in `prefs.ts`).
- `AppShell` publishes the width via the existing `--afh-sidebar` CSS
  variable, so the entire layout follows it with no grid redesign.
- A drag handle (`.ws-sidebar__resizer`) on the sidebar edge supports pointer
  drag and Arrow-key resize; it is hidden while collapsed and on mobile
  (`max-width: 960px`), where the drawer behavior is unchanged.
- Collapse/expand behavior (top-bar button, `Ctrl+B`) is preserved.

### 1.3 Theme regressions

Three token-level defects, all pre-existing but exposed by dark-mode use:

1. **Marketing theme toggle unreadable in dark mode** — `.site-theme-toggle`
   never set `color`, and buttons do not inherit text color, so the label
   stayed UA-default black on the dark header. Fixed with `color: inherit`
   (follows `--site-ink` in both themes).
2. **Marketing "Top" button unreadable in dark mode** — `.site-top` used
   `background: var(--site-ink)` with hardcoded `#f4f7f5` text. `--site-ink`
   flips to near-white in dark mode, producing white-on-white. The label now
   uses `var(--site-paper)`, which flips with the theme.
3. **Native controls ignored dark theme** — `:root` pins `color-scheme:
   light` and `[data-theme="dark"]` never overrode it, so selects, inputs,
   and scrollbars kept light-scheme UA rendering in dark mode. Added
   `color-scheme: dark` to the dark token block.
4. **Theme toggle did not survive entering /app** — `WorkspaceUiProvider`
   re-applied the stored user-prefs theme (default light) on every mount,
   overriding a toggle made from the marketing header or the top-bar user
   menu. The provider now honors the last explicit `afh.web.theme` choice.

No one-off colors were introduced; every change uses existing tokens.

---

## 2. Files changed (RC5.5.1)

| File | Change |
| --- | --- |
| `packages/web/src/state/session.tsx` | `permissionsError` state + `reloadPermissions()`; permission fetch failure now flagged instead of silently null |
| `packages/web/src/auth/RequirePermission.tsx` | Retriable fail-closed error UI when the permission load fails |
| `packages/web/src/auth/RequirePermission.test.tsx` | New test: fetch failure → retriable error, never access |
| `packages/web/src/workspace/prefs.ts` | `sidebarWidth` preference, clamp constants (220/280/460) |
| `packages/web/src/workspace/context.tsx` | `sidebarWidth`/`setSidebarWidth` in workspace UI context; honor last explicit theme toggle on mount |
| `packages/web/src/shell/AppShell.tsx` | Publishes `--afh-sidebar` from the persisted width |
| `packages/web/src/shell/Sidebar.tsx` | Drag/keyboard resize handle |
| `packages/web/src/styles/workspace.css` | Resizer styles, resize-state styles, mobile hide |
| `packages/web/src/styles/tokens.css` | `color-scheme: dark` for dark theme |
| `packages/web/src/styles/marketing.css` | Theme toggle `color: inherit`; `.site-top` label uses paper token |

Out-of-scope items untouched: Policy Engine, RBAC catalogs, CQRS
authorization, route permission catalog, API routes/behavior.

---

## 3. Verification

| Check | Result |
| --- | --- |
| Full workspace build | PASS |
| Full workspace typecheck | PASS |
| Full workspace lint (`--max-warnings 0`) | PASS |
| Identity tests | PASS (56) |
| API tests | PASS (41) |
| Web tests | PASS (44, incl. 1 new) |

Manual verification (Chromium, desktop viewport 1440×810):

- `/app` renders the Executive Dashboard fully (KPI strip, live module
  summaries, widgets) after authentication; skeletons resolve normally.
- Sidebar: default 280px, drag-resize persists across reloads, collapse and
  expand from the top bar work, resizer hidden when collapsed and on mobile.
- Dark mode: top-bar controls, user menu, selects, and marketing theme
  toggle/"Top" button all follow tokens; light theme unchanged; the chosen
  theme survives navigation between the marketing site and `/app`.
- Authorization: no guard, catalog, or Policy change; permission-gated routes
  still deny without required codes (existing 36 route tests unchanged).

Known pre-existing, out-of-scope observation: the dashboard's Projects and
Service live summaries report `validation_failed` because
`GetProjectSummary`/`GetServiceSummary` require a record id the dashboard does
not send. The widget already degrades gracefully; changing the API contract or
the dashboard query set is outside RC5.5.1.

---

## 4. Stop condition

RC5.5.1 complete. Not committed. RC5.6 not started.
