# RC2 — Authorization Verification Report

| Check | Result |
|-------|--------|
| Frontend never authorizes | Pass — no Policy decisions in web |
| Backend Policy sole authority | Pass — 403/authorization errors shown as Policy denials |
| Route guards | Pass — `/app`, `/admin/platform`, `/portal` require session |
| Hidden UI vs permissions | Pass — UI may show actions; command failure remains authoritative |
| Token refresh | Pass — Identity refresh transport + proactive refresh |
| Session expiry | Pass — failed refresh clears session; unauthorized hook clears session |

**Outbox / Event Bus / Workflow / Policy engines:** untouched.
