# RC4 — Operational Resilience Report

## Validated capabilities

| Capability | Status | Location |
|------------|--------|----------|
| Graceful shutdown (SIGTERM/SIGINT) | ✅ Pass | `runtime-host/src/lifecycle/deployment.ts` |
| Shutdown timeout (30s default) | ✅ Pass | `withTimeout` in resilience.ts |
| Outbox drain on shutdown | ✅ Pass | `create-production-host.ts` |
| Outbox periodic dispatch | ✅ **Fixed RC4** | 5s interval worker |
| Consumer poll loop | ✅ **Fixed RC4** | 2s interval `pollOnce()` |
| Outbox retry + DLQ | ✅ Pass | `infrastructure/outbox/outbox-dispatcher.ts` |
| Consumer retry + poison | ✅ Pass | `messaging-broker/consumer/consumer-runtime.ts` |
| SQL busy timeout | ✅ Pass | `PRAGMA busy_timeout` |
| Health: live / ready / startup / version | ✅ Pass | `packages/api/src/routes/routes.ts` |
| 17 production health probes | ✅ Pass | harden gate output |
| Backup/restore verification | ✅ Pass | `hardening/backup-restore.ts` |
| DR readiness checks | ✅ Pass | `hardening/disaster-recovery.ts` |
| Resilience scenario suite | ✅ Pass | `npm run harden -w @afh/runtime-host` |

## RC4 fixes

1. **Background consumer worker** — async inbox/event processing now runs in production host
2. **Background outbox dispatcher** — periodic publish between command flushes
3. **Worker cleanup on dispose** — intervals cleared before shutdown
4. **HTTP server timeouts** — slowloris / hung request mitigation
5. **Backup script** — `scripts/backup-sqlite.sh`

## Gaps (documented)

| Gap | Severity | Action |
|-----|----------|--------|
| `withRetry` at startup not wired | Medium | RC5: wrap SQL/broker open |
| Single outbox batch on shutdown | Low | Loop until empty within timeout |
| Embedded SQLite broker (no network reconnect) | Low | By design — document |
| No automated restore script | Medium | `scripts/backup-sqlite.sh` + manual restore runbook |

## Resilience test results

```
harden gate: invalid_secrets, configuration_failures, shutdown_during_processing,
startup_success_baseline, database_unavailable — all passed
```

## Verdict

**Pass** — critical consumer/outbox wiring defect fixed; graceful shutdown and health probes validated.
