# Startup

## Prerequisites

- Node.js ≥ 20
- Built packages (`npm run build`)
- Required secrets for staging/production (see [secret rotation](./secret-rotation.md))

## Steps

1. Set profile: `export AFH_PROFILE=production` (or `staging` / `development` / `testing`).
2. Set secrets:
   - `AFH_SECRET_JWT_SIGNING_KEY` (≥ 32 characters)
   - `AFH_SECRET_DATABASE_URL`
   - `AFH_SECRET_BROKER_CREDENTIAL`
   - `AFH_SECRET_API_SECRET`
3. Optional paths: `AFH_DATABASE_PATH`, `AFH_BROKER_DATABASE_PATH`, `AFH_HOST`, `AFH_PORT`.
4. Start: `npm run start -w @afh/runtime-host`
5. Confirm logs show `Startup validation passed` and `api.host.started`.
6. Verify health: see [Health verification](./health-verification.md).

Startup fails closed if configuration, secrets, migrations, broker, or health registry report `down`.
