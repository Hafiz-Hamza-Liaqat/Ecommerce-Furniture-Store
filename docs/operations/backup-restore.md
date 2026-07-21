# Backup & Restore Validation

Local runtime-data backup/restore verification. No cloud providers.

The launch backup set is one consistency unit:

- `AFH_DATABASE_PATH` (application SQLite)
- `AFH_BROKER_DATABASE_PATH` (durable broker SQLite)
- `{dirname(AFH_DATABASE_PATH)}/cx-sync/` (RC10.5+ workspace snapshots)
- `{dirname(AFH_DATABASE_PATH)}/dam-objects/` (asset objects)

Use `scripts/backup-sqlite.sh`. It uses `sqlite3 .backup` when available and
copies the two filesystem directories. If `sqlite3` is unavailable, stop the
runtime first; plain file copies are not safe while WAL writes are active.

## Backup verification

```bash
# Programmatic (CI / ops tooling)
npm run harden -w @afh/runtime-host
```

`verifySqliteBackupRestore()`:

1. Copies source DB (or seeds a temp file when source is `:memory:`)
2. Opens the backup with SQL persistence foundation
3. Runs `PRAGMA quick_check`
4. Asserts migration compatibility

## Restore verification

1. Stop runtime ([Shutdown](./shutdown.md)).
2. Preserve the failed data directory for incident analysis.
3. Replace `AFH_DATABASE_PATH` with the verified application backup.
4. Restore `AFH_BROKER_DATABASE_PATH` from the matching backup.
5. Restore the matching `cx-sync/` and `dam-objects/` directories beside the
   application database.
6. Verify ownership/permissions and that no live values are committed to Git.
7. Start ([Startup](./startup.md)).
8. Confirm health probes, migration compatibility, a CX sync download, and an
   asset read.

## Integrity

Production host registers `sql_integrity` probe and may require integrity at startup (`AFH_SQL_INTEGRITY_ON_STARTUP=true`).
