# Operational Runbooks — Artisan Furnish Hub

Production operations documentation for Phase 9A. No business procedures.

| Runbook | Purpose |
|---------|---------|
| [Startup](./startup.md) | Start the production runtime |
| [Shutdown](./shutdown.md) | Graceful stop |
| [Deployment](./deployment.md) | Build, package, start a release |
| [Rollback](./rollback.md) | Revert to a previous artifact |
| [Secret rotation](./secret-rotation.md) | Rotate JWT and credential secrets |
| [Incident response](./incident-response.md) | First response when health fails |
| [Health verification](./health-verification.md) | Probe checklist |
| [Backup & restore](./backup-restore.md) | SQLite backup/restore validation |
| [Disaster recovery](./disaster-recovery.md) | Local DR readiness procedures |

Package: `@afh/runtime-host` (`afh-runtime` / `npm run start -w @afh/runtime-host`)

Hardening gates: `npm run harden -w @afh/runtime-host` · `npm run accept -w @afh/runtime-host`
