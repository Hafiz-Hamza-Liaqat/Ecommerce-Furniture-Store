# RC9.5 — Test Summary

**Status:** Gates green — awaiting review  
**Date:** 2026-07-20

## Automated

| Package | Result | Notes |
|---------|--------|-------|
| `@afh/identity` | 85 pass | + SessionService RC9.5 (5) |
| `@afh/api` | 75 pass | + auth route hardening (3) |
| `@afh/web` | 153 pass | RequirePermission timeout adjusted for GET retry |
| `@afh/runtime-host` verify | ok | configuration, secrets, migrations |
| `npm audit --omit=dev` | 0 vulns | |

## New / extended coverage

- Refresh TTL rejection
- Idle TTL rejection + evaluateSessionExpiry
- Concurrent session revoke isolation
- Session fixation (new id each create)
- Register ignores `companyId`
- Challenge payload sanitize
- Password-reset sealed vs reveal modes

## Manual remaining

- Zoom 200/300/400%
- Multi-tab wishlist sync
- Safari smoke
- Auth flood → 429
