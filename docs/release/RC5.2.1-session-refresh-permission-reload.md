# RC5.2.1 — Silent Session Refresh Permission Reload (Fix Report)

**Date:** 2026-07-17  
**Scope:** Single defect fix from the RC5.2 route protection verification audit  
**Status:** Complete; stopped before RC5.3; not committed

## Defect

After a silent token refresh, `SessionProvider.setSession` cleared
`permissionCodes` to `null`, but the permission reload effect was keyed only
on `tokens.sessionId`. The backend `SessionService.refreshSession` keeps
`sessionId` stable across refreshes (only `refreshToken`/`expiresAt` rotate),
so the effect never re-ran. `permissionCodes` stayed `null` indefinitely and
`RequirePermission` rendered the loading fallback for every permission-bearing
route until a full page reload or re-login.

Impact was presentation-layer only — the backend Policy Engine authorized
every API call throughout — but protected routes were unusable after the
first silent refresh, and permission revocations were not picked up in-app.

## Fix (`packages/web/src/state/session.tsx` only)

1. **Reload keyed on token rotation.** The permission fetch effect now
   depends on the `tokens` object instead of `tokens.sessionId`. The tokens
   object is replaced on login, page reload (initial load of the stored
   session), and every silent or manual refresh, so effective permission
   codes are re-resolved from `GET /api/v1/auth/session` after each rotation.
   Revocations and grants therefore take effect at the next refresh without a
   reload. Stale in-flight responses are discarded via the existing
   `cancelled` flag.

2. **No false invalidation on same-session refresh.** `setSession` now clears
   `permissionCodes` only when the session identity (`userId:sessionId`)
   actually changes, tracked in a ref initialized from the stored session.
   A silent refresh (same user, same session) keeps the current codes on
   screen while the re-fetch is in flight — no loading flash, no transient
   denial — and the fresh response overwrites them. A login as a different
   user or a new session still invalidates codes immediately, so permissions
   never leak across identities. `clearSession` (logout) resets both the
   codes and the identity ref.

3. **Exactly one fetch per rotation.** The effect runs once per tokens-object
   replacement; the `api` client memo is keyed on `sessionId`/`companyId` and
   stays stable across refreshes, so no duplicate fetches are introduced.
   Verified by fetch-count assertions in the new tests.

Nothing else changed: no Policy Engine, CQRS, authorization decision, route
catalog, route metadata, `RequirePermission` semantics, or feature flag
modifications. No backend file was touched.

## Lifecycle behavior after the fix

| Event | permissionCodes |
|---|---|
| Login | `null` → fetched once for the new identity |
| Page reload | fetched once from the stored session |
| Silent refresh | previous codes retained, then replaced by one re-fetch |
| Manual refresh | same as silent refresh |
| Revocation + refresh | removed codes disappear at re-fetch; guard denies |
| Repeated refreshes | one fetch each; never stuck on loading |
| Logout | `null`, storage cleared |

## Tests added (`packages/web/src/state/session.test.tsx`, 7 tests)

The backend stub mirrors real refresh semantics (stable `sessionId`, rotating
`refreshToken`/`expiresAt`) and exposes mutable permissions plus fetch
counters:

1. login → permissions loaded (single fetch);
2. page reload (stored session) → permissions loaded once;
3. silent refresh → permissions refreshed, newly granted code appears, exactly
   one extra fetch, guarded content never regresses to loading;
4. permission revocation after refresh → guard flips to "Access denied";
5. logout → codes cleared and storage removed;
6. three consecutive refreshes → one fetch per rotation, codes resolved, no
   deadlock on the loading state;
7. guard loading state exits once the (gated) permission fetch resolves.

All 36 pre-existing RC5.2 web tests pass unchanged.

## Verification results

| Gate | Command | Result |
|---|---|---|
| Build | `npm run build` (all 34 workspaces) | PASS |
| Typecheck | `npm run typecheck` (all workspaces) | PASS |
| Lint | `npm run lint` (`--max-warnings 0`) | PASS |
| Identity tests | `npm test -w @afh/identity` | PASS (54/54) |
| API tests | `npm test -w @afh/api` | PASS (4/4) |
| Web tests | `npm test -w @afh/web` | PASS (43/43) |

## Files changed

| File | Change |
|---|---|
| `packages/web/src/state/session.tsx` | Fix — permission reload keyed on token rotation; identity-aware invalidation |
| `packages/web/src/state/session.test.tsx` | New — 7 session permission lifecycle tests |
| `docs/release/RC5.2-route-protection.md` | Pointer to this fix report |

**Stop point:** RC5.2.1 complete. RC5.3 not started. No commits made.
