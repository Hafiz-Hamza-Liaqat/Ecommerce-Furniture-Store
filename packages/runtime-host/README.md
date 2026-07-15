# @afh/runtime-host

Enterprise **Production Readiness Foundation** (Phase 9A).

Wires SQL persistence, durable messaging, identity security providers, and the API host into a single production composition — without business logic or architecture changes.

## Start

```bash
# Required in staging/production (JWT ≥ 32 chars)
export AFH_SECRET_JWT_SIGNING_KEY="..."
export AFH_SECRET_DATABASE_URL="sqlite:./data/afh.sqlite"
export AFH_SECRET_BROKER_CREDENTIAL="local"
export AFH_SECRET_API_SECRET="..."

export AFH_PROFILE=production
npm run build -w @afh/runtime-host
npm run start -w @afh/runtime-host
```

Development may omit secrets (ephemeral JWT is generated).

## Composition

`createProductionHost()`:

1. Load typed config + secrets
2. SQL persistence foundation + repositories
3. Messaging broker + Event Bus
4. API host with `security.enabled`
5. Register health probes (DB, migrations, transactions, Event Bus, config, messaging, outbox, inbox, secrets, security)
6. Startup / release validation
7. Graceful shutdown (SIGTERM/SIGINT)

## Environment variables

| Variable | Purpose |
|----------|---------|
| `AFH_PROFILE` | `development` \| `testing` \| `staging` \| `production` |
| `AFH_HOST` / `AFH_PORT` | Listen address |
| `AFH_DATABASE_PATH` | SQLite path |
| `AFH_BROKER_DATABASE_PATH` | Broker SQLite path |
| `AFH_SECRET_JWT_SIGNING_KEY` | JWT signing material |
| `AFH_SECRET_JWT_SIGNING_KEY_PREVIOUS` | Rotation |
| `AFH_SECRET_DATABASE_URL` | DB credential ref |
| `AFH_SECRET_BROKER_CREDENTIAL` | Broker credential ref |
| `AFH_SECRET_API_SECRET` | API secret ref |

## Out of scope

Business modules, UI, cloud deploy targets, vendor APM/monitoring SDKs.
