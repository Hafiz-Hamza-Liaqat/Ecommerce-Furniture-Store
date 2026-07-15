# Incident response

## First five minutes

1. Check process liveness (PID / container status).
2. Hit health endpoints (see [Health verification](./health-verification.md)).
3. Capture recent structured logs (JSON lines) — correlation IDs are preserved on request/event paths.
4. If health is `down` on database or broker: treat as infrastructure priority; do not change business configuration.
5. If secrets probe fails: verify env vars / rotation state; do not embed keys in tickets.
6. If Outbox depth grows: confirm Outbox dispatcher and Event Bus / broker connectivity; Outbox remains the sole publish path — do not bypass.

## Escalation

- Configuration / secrets / health registry failures → platform on-call
- Domain errors with healthy infrastructure → application / domain owners (out of scope for this runbook)

## Stabilize

Prefer restart after fixing config/secrets over hot-patching. Use [Rollback](./rollback.md) if a release caused the incident.
