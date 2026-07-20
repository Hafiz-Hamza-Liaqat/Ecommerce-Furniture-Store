# RC9.5 — Authentication Audit

**Status:** Implemented — awaiting review  
**Date:** 2026-07-20

## Model

Opaque `sessionId` Bearer + hashed refresh token. JWT provider remains composed/health-checked but **not** on the live auth path (**Accepted** residual).

## Fixes

1. **Idle TTL on every API auth** — `evaluateSessionExpiry` + revoke before `touchSession` in `authenticateRequest`
2. **Refresh expiry** — `refreshSession` rejects when `expiresAt` elapsed (`session_refresh_expired`)
3. **Challenge/reset tokens** — stripped from API JSON unless `revealChallengeTokens`
4. **Sign-in IP/UA** — from transport headers / socket; not client body
5. **Register companyId** — ignored

## Session fixation

- Every `createSession` issues a new `sess_*` id and new `sfam_*` family
- Sign-in always creates a fresh session (no anonymous→authenticated promotion of an existing id)
- Privilege elevation does not mutate session id; permissions re-resolved via Policy on each request (**documented expected behavior**)

## Concurrent sessions

- Multiple browser sessions for one user are **independent** (distinct session + family ids)
- `sign-out` revokes **current** session only
- `revokeAllForUser` used on password reset / suspend
- Refresh reuse still revokes the **family** of the reused refresh token

## Tests

`packages/identity/src/session/session-service.test.ts` — refresh expiry, idle, concurrent revoke isolation, new session ids  
`packages/api/src/routes/auth-routes.test.ts` — register companyId ignore, challenge sanitize

## Residual

- Tokens in `localStorage` (XSS) — Accepted / deferred cookie migration
- In-memory rate limit — Accepted for single-node
