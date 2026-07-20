# RC9.5 — Monitoring Report

**Status:** Documented — awaiting review  
**Date:** 2026-07-20

## Logging

`ConsoleLogger` (`packages/infrastructure/src/logging/logging.ts`):

| Level | Order | Notes |
|-------|------:|-------|
| TRACE | — | Not implemented; reserve for future |
| DEBUG | 10 | Dev verbose |
| INFO | 20 | Default ops |
| WARN | 30 | |
| ERROR | 40 | |
| FATAL | 50 | |

Redaction keys: `password`, `secret`, `token`, `apiKey`, `authorization`, `credential` → `[REDACTED]`.

## Health

- `/health/live`, `/health/ready`, `/health/startup`, `/health/version`
- Runtime-host `verify` gate: `{"ok":true,"checked":["configuration","secrets","migrations"]}`

## Correlation

- `x-correlation-id` on API requests/responses
- Surfaced on EnterpriseError as support reference
