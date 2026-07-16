# RC4 — Production Configuration Audit

## Environment separation

| Profile | Host | Secrets required | Integrity check | CORS default |
|---------|------|------------------|-----------------|--------------|
| development | 127.0.0.1 | No (ephemeral JWT) | Off | `*` |
| testing | 127.0.0.1 | Yes | On | `*` |
| staging | 0.0.0.0 | Yes | On | `*` (override via env) |
| production | 0.0.0.0 | Yes | On | **Must set `AFH_CORS_ORIGIN`** |

Configuration loader: `packages/runtime-host/src/config/runtime-config.ts`

## Secrets (no values committed)

| Variable | Purpose | Committed |
|----------|---------|-----------|
| `AFH_SECRET_JWT_SIGNING_KEY` | JWT signing (≥32 chars) | ❌ Template only |
| `AFH_SECRET_JWT_SIGNING_KEY_PREVIOUS` | Rotation | ❌ Template only |
| `AFH_SECRET_DATABASE_URL` | DB credential ref | ❌ Template only |
| `AFH_SECRET_BROKER_CREDENTIAL` | Broker credential | ❌ Template only |
| `AFH_SECRET_API_SECRET` | API secret ref | ❌ Template only |

**Template added:** `docs/operations/env.example`

## Logging

| Profile | Default level |
|---------|---------------|
| development | debug |
| testing | warn |
| staging / production | info |

Structured JSON logs via `ConsoleLogger` with key-based redaction (`password`, `token`, `secret`, etc.).

## Feature flags / toggles

- `AFH_EVENT_BUS_ENABLED` — event bus
- `AFH_SQL_INTEGRITY_ON_STARTUP` — integrity probe
- `AFH_MESSAGING_*` — consumer concurrency, retry, poison threshold

## RC4 validation

- ✅ No `.env` files in repository
- ✅ Dev SQLite artifacts untracked (`packages/runtime-host/data/`)
- ✅ Production fails if `AFH_CORS_ORIGIN=*`
- ✅ `assertProductionRuntimeConfig` validates ports, paths, messaging knobs

## Verdict

**Pass** — clear dev/prod separation; env template provided; no secrets in repo.
