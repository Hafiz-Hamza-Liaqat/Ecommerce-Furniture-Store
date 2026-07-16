# RC4 — Data Integrity Validation

## Schema & migrations

| Check | Status | Detail |
|-------|--------|--------|
| Migration version | ✅ v1 | `persistence-sql/src/migrations/migrations.ts` |
| Auto-apply on startup | ✅ Pass | `composition-root.ts` |
| Compatibility assert | ✅ Pass | `assertMigrationCompatibility()` |
| Forward-only policy | ✅ Documented | `docs/operations/rollback.md` |

## Constraints & indexes

- Foreign keys enforced via SQLite schema in migration SQL
- Health probes: `sql_integrity`, `sql_migrations`, `sql_transactions`
- Startup integrity check when `AFH_SQL_INTEGRITY_ON_STARTUP=true`

## Transaction safety

- Unit-of-work via SQL client transactions
- Outbox flush within command pipeline (`OutboxFlushBehavior`)
- Busy timeout prevents indefinite lock waits

## Optimistic concurrency

- Command handlers use expected-version patterns where defined in domain
- Idempotency key supported on command dispatch (`idempotency-key` header)

## Outbox / Inbox integrity

| Pattern | Status |
|---------|--------|
| Outbox store (SQL) | ✅ Pass |
| Inbox dedupe (SQL) | ✅ Pass |
| Sole publish path (outbox dispatcher) | ✅ Pass |
| Consumer claim lease | ✅ Pass |
| DLQ on poison | ✅ Pass |
| Consumer worker running | ✅ **Fixed RC4** |

## Backup / restore

- Programmatic verify: `verifySqliteBackupRestore()` — file copy + `PRAGMA quick_check`
- CI gate: `npm run harden -w @afh/runtime-host`
- Operational script: `scripts/backup-sqlite.sh`
- Runbook: `docs/operations/backup-restore.md`

## Duplicate prevention

- Inbox runtime deduplicates by event id
- Idempotency keys on command transport

## Verdict

**Pass** — schema, outbox/inbox, and backup verification validated; consumer loop integrity fix applied.
