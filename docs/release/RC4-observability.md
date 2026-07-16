# RC4 — Observability Validation

## Logging

| Capability | Status | Location |
|------------|--------|----------|
| Structured JSON logs | ✅ Pass | `infrastructure/logging/logging.ts` |
| Log levels by profile | ✅ Pass | runtime-config |
| Sensitive key redaction | ✅ Pass | password, secret, token, apiKey, authorization |
| Correlation IDs | ✅ Pass | `x-correlation-id` header end-to-end |
| Transport 500 correlation | ✅ **Fixed RC4** | `node-http.ts` |

## Tracing

- `InMemoryTracer` — spans on command/query transport (`withTransportSpan`)
- Not exported to external APM (by design — Phase 0F)

## Metrics

| Metric family | Status |
|---------------|--------|
| Runtime startup/shutdown/ready | ✅ |
| Transport request duration/status | ✅ |
| Security (login/MFA) | ✅ |
| Messaging (outbox/DLQ/consumer) | ✅ |

In-memory only — lost on restart. RC5 may add Prometheus scrape endpoint.

## Health endpoints

- `GET /health/live` — process alive
- `GET /health/ready` — 17 dependency probes, 503 when down
- `GET /health/startup` — API host started flag
- `GET /health/version` — service version

## Audit events

- Auth: register, sign-in/out, MFA challenge, password reset
- Policy deny events
- Domain handler audits (CRM, finance, etc.)

## Error handling

- `PlatformError` → HTTP status mapping
- `retryable` flag on error DTOs
- Unified web error UI (`EnterpriseError` from RC3)

## Verdict

**Pass** — structured logs, correlation IDs, metrics, health, and audit pipeline validated for single-process deployment.
