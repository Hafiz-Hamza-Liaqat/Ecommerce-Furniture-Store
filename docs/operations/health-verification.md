# Health verification

Production host registers Phase 0F-aligned probes, including:

| Probe area | Source |
|------------|--------|
| Database | Infrastructure |
| Event Bus | Infrastructure |
| Configuration | Infrastructure |
| Migrations / transactions | SQL persistence |
| Broker / publish / consumer / DLQ | Messaging broker |
| Outbox / Inbox / Secrets / Outbox dispatcher | Runtime host |
| Identity / signing / session | Identity security providers (when enabled) |

## Checks

```bash
# Liveness / readiness / startup HTTP surfaces
curl -sS "http://127.0.0.1:8080/health/live"
curl -sS "http://127.0.0.1:8080/health/ready"
curl -sS "http://127.0.0.1:8080/health/startup"
```

Expect readiness not `not_ready` after startup. Startup validation already fails if the registry reports `down` before listen (when `AFH_VALIDATE_ON_STARTUP=true`).