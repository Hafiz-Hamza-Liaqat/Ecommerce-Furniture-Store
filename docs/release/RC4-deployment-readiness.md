# RC4 — Deployment Readiness

## Artifacts validated / added (RC4)

| Artifact | Status | Path |
|----------|--------|------|
| Dockerfile | ✅ Added | `deploy/Dockerfile` |
| docker-compose | ✅ Added | `deploy/docker-compose.yml` |
| nginx reverse proxy | ✅ Added | `deploy/nginx.conf` |
| env template | ✅ Added | `docs/operations/env.example` |
| backup script | ✅ Added | `scripts/backup-sqlite.sh` |
| CI build artifact | ✅ Existing | `.github/workflows/ci.yml` → `afh-runtime-host.tgz` |
| Startup entry | ✅ Existing | `npm run start -w @afh/runtime-host` |
| Health probes | ✅ Existing | `/health/live`, `/health/ready`, `/health/startup` |
| Migrations | ✅ Auto on startup | `persistence-sql/migrations` v1 |
| Rollback runbook | ✅ Existing | `docs/operations/rollback.md` |

## Docker image

- Node 20 Alpine multi-stage build
- `HEALTHCHECK` → `/health/live`
- Persistent volume mount at `/app/data`
- **Not deployed** — template only per RC4 charter

## nginx template

- TLS + HSTS headers (cert paths commented)
- `/api/` and `/health/` proxied to runtime host
- SPA static from `packages/web/dist`
- `X-Forwarded-For` preserved for rate limiting

## SSL readiness

- HSTS in nginx template
- API security headers in Node transport
- Production requires explicit `AFH_CORS_ORIGIN` matching SPA origin

## Pre-deploy checklist

1. Set all `AFH_SECRET_*` via secret manager
2. Set `AFH_CORS_ORIGIN` to production SPA URL
3. Mount persistent volume for SQLite paths
4. Build web: `npm run build -w @afh/web`
5. Run gates: `verify`, `harden`, `accept` on runtime-host
6. Configure nginx TLS certificates

## Verdict

**Pass** — deployment templates added; existing CI/runbooks validated; no cloud deploy performed.
