# Startup

## Prerequisites

- Node.js ≥ 20
- Built packages (`npm run build`)
- Required secrets for staging/production (see [secret rotation](./secret-rotation.md))

## Steps

1. Set profile: `export AFH_PROFILE=production` (or `staging` / `development` / `testing`).
2. Set an explicit production CORS allowlist:
   - `AFH_CORS_ORIGIN=https://app.example.com` (comma-separated when multiple)
   - Production rejects `*` and fails closed.
3. Set secrets:
   - `AFH_SECRET_JWT_SIGNING_KEY` (≥ 32 characters)
   - `AFH_SECRET_DATABASE_URL`
   - `AFH_SECRET_BROKER_CREDENTIAL`
   - `AFH_SECRET_API_SECRET`
4. Mount persistent storage and set absolute production paths where possible:
   - `AFH_DATABASE_PATH=/app/data/afh.sqlite`
   - `AFH_BROKER_DATABASE_PATH=/app/data/broker.sqlite`
   - The same directory also contains `cx-sync/` and `dam-objects/`.
5. Optional network/edge settings: `AFH_HOST`, `AFH_PORT`; set
   `AFH_TRUST_PROXY=true` only behind a trusted reverse proxy.
6. Start: `npm run start -w @afh/runtime-host`
7. Confirm logs show `Startup validation passed` and `api.host.started`.
8. Verify health: see [Health verification](./health-verification.md).

Startup fails closed if configuration, secrets, migrations, broker, or health registry report `down`.
