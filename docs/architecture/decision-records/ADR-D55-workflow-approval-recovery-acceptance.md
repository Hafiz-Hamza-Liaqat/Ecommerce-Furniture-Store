# ADR-D55 — Workflow & Approval restart / retry / idempotency / concurrency acceptance

- **Status:** Accepted
- **Date:** 2026-07-18
- **Slice:** RC6.7
- **Depends on:** D04, D49–D54

## Context

Roadmap §RC6 item 6 required restart/retry/idempotency/concurrency acceptance
scenarios after RC6.1–RC6.6 closed definitions, CQRS, UI, SQL durability,
engine completion, and projection proof. A new idempotency framework or
distributed lock was not justified if existing engine guards and SQL reopen
already provide fail-closed logical safety.

## Decision

1. **Prove existing behavior first** — no new idempotency store, CAS version
   column, or distributed lock (distributed locking remains out of scope).
2. **Restart** — extend RC6.4 SQL reopen: continue `transition` / `decide`
   after dispose + reopen against durable stores.
3. **Retry / logical idempotency** — duplicate transition/decide fail closed
   via `workflow_illegal_transition`, `workflow_not_running`, and
   `approval_already_decided`; history is not extended on failed retry.
4. **Concurrency** — sequential conflicts fail closed; parallel races assert a
   legal final stage without introducing locking infrastructure.
5. **Transport `idempotencyKey`** — remains API/CQRS metadata; RC6.7 does not
   add command-result caching because engine guards already prevent double
   lifecycle effects.

## Consequences

- RC6 roadmap items 1–6 are covered by committed/implemented RC6.1–RC6.7.
- Residuals (notification delivery, Rules SQL, domain hardcoded status,
  cached command replay, instance CAS) remain outside RC6.7.
- Any future command-result cache would be a separate, explicit decision.
