# Shutdown

## Graceful shutdown

Send `SIGTERM` or `SIGINT` to the `afh-runtime` process.

The host:

1. Drains one Outbox dispatch pass (best effort)
2. Stops the HTTP listener
3. Disposes messaging broker resources

Do not use `SIGKILL` unless the process is hung after a timeout (recommend ≥ 30s).

## Manual stop (local)

```bash
# If started in foreground — Ctrl+C
# If known PID:
kill -TERM <pid>
```
