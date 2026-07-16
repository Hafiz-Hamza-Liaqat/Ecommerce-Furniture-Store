# Backup & Restore Validation

Local SQLite file backup/restore verification. No cloud providers.

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

1. Stop runtime ([Shutdown](./shutdown.md))
2. Replace `AFH_DATABASE_PATH` file with verified backup
3. Optionally restore broker DB (`AFH_BROKER_DATABASE_PATH`) from its own backup
4. Start ([Startup](./startup.md))
5. Confirm health probes and migration compatibility

## Integrity

Production host registers `sql_integrity` probe and may require integrity at startup (`AFH_SQL_INTEGRITY_ON_STARTUP=true`).
