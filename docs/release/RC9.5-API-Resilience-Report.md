# RC9.5 — API Resilience Report

**Status:** Implemented — awaiting review  
**Date:** 2026-07-20

## Web client (`packages/web/src/api/client.ts`)

| Feature | Behavior |
|---------|----------|
| Timeout | AbortSignal, default 30s |
| Correlation ID | Always sent / retained on errors |
| Error sanitization | Drops stack/sql/password/token detail keys |
| Unauthorized | Clears session on idle/absolute/refresh expiry codes |

## Retry Matrix

| Method | Auto-retry |
|--------|------------|
| GET | Yes — up to 2 retries, backoff 250ms→1s, on network/timeout/429/5xx |
| POST | No |
| PUT | No (conditional only if caller opts in — not default) |
| PATCH | No |
| DELETE | No |

## Backend

- Existing error envelopes omit stacks in production mapping (unchanged; audited)
- Rate limit returns 429 with retry-after via production hook
