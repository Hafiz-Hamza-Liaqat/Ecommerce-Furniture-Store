# Disaster Recovery Foundation

Local DR readiness — not multi-region.

## Recovery procedure

1. Declare incident ([Incident response](./incident-response.md))
2. Stop runtime gracefully
3. Restore verified SQL backup ([Backup & restore](./backup-restore.md))
4. Restore broker DB if messaging store was lost
5. Start runtime with the same secrets/profile used at backup time
6. Run health verification
7. Inspect DLQ; validate replay safety before any operator replay
8. Confirm Outbox pending sample and Inbox reachability

## Message replay validation

- Use `inspectDeadLetterQueue` / `validateReplaySafety` (runtime-host hardening)
- Replay only via `messaging.dlq.replay(id)` — never bypass Outbox for business publish

## Outbox / Inbox consistency

After restore, startup validation and DR checks confirm:

- Outbox store listPending reachable
- Inbox hasProcessed reachable
- Broker healthCheck healthy

## Startup after restore

Same as normal startup. Fail closed if migrations/integrity/secrets invalid.
