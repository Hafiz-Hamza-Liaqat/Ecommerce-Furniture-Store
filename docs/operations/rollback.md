# Rollback

1. Stop the current process (see [Shutdown](./shutdown.md)).
2. Restore the previous build artifact (CI artifact or known-good commit build).
3. Restore matching configuration and secret versions used with that artifact.
4. If schema migrations advanced and cannot roll back safely, restore the database snapshot taken before the failed release **before** starting the old binary.
5. Start with the previous artifact ([Startup](./startup.md)).
6. Confirm health probes are up.

Outbox / Inbox tables must remain consistent with the restored app version. Prefer forward-fix releases over schema downgrades.
