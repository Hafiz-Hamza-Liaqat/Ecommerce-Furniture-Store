# RC2 — API Coverage Report

## Transport surface reused

- `POST /api/v1/commands` · `POST /api/v1/queries`
- `POST /api/v1/uploads`
- Auth: register, sign-in/out, session, password reset, email verify, MFA, **refresh**
- Health: live / ready / startup / version

## New transport only (existing Identity capability)

| Endpoint | Wraps |
|----------|--------|
| `POST /api/v1/auth/refresh` | `SessionService.refreshSession` |

No CQRS redesign. No new business modules.

## Frontend ApiClient

Added `refreshSession`. Existing `dispatchCommand` / `dispatchQuery` / `upload` / health helpers unchanged.

## Deduplication

`packages/web/src/api/dedupe.ts` collapses in-flight identical summary/get requests.
