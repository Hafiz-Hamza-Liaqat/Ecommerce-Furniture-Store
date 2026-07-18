# RC6.4 Verification Report

- **Date:** 2026-07-18
- **Slice:** Workflow & Approval SQL Durability
- **Verdict:** PASS

## Gates

| Gate | Result |
|---|---|
| Build (`npm run build`) | PASS |
| Typecheck (`npm run typecheck`) | PASS |
| Lint (`npm run lint`) | PASS |
| Identity tests | PASS (79/79) |
| API tests | PASS (68/68) |
| Web tests | PASS (54/54) |
| Persistence-SQL tests (RC6.4) | PASS (5/5) |
| Runtime verify | PASS |
| Runtime harden | PASS |
| Runtime accept | PASS |

## Functional coverage

- Migration v2 applied; `MIGRATION_VERSION = 2`
- Workflow definitions/instances/history/assignments survive DB reopen
- Approval definitions/requests/actions survive DB reopen
- RC6.1 seed idempotent on SQL stores (second run creates 0)
- In-memory default path unchanged when stores are not injected
- Production host injects SQL stores into platform composition

## Out of scope (correctly not verified as delivered)

SLA, escalation, notifications, rules expansion, projections, recovery
product work, CQRS redesign, UI redesign, RC6.5+.
