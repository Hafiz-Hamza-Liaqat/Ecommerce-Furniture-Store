# RC6.5 — Workflow & Approval Engine Completion

- **Date:** 2026-07-18
- **Approved scope:** Complete workflow guards (Rules), approval assignment
  resolution, SLA/escalation foundations, notification event production
  (not delivery), and projection updates required for workflow progression.
- **Decision record:** `docs/architecture/decision-records/ADR-D53-workflow-approval-engine-completion.md`

## What was delivered

1. **Rules catalog + seed** — `platform.workflow.guard.default` and
   `platform.approval.assignment.default`; `seedPlatformDefinitions` registers
   rules when `rules` is provided (ApiHost.start wires it).
2. **Workflow catalog v2** — non-terminal `slaHours = 72`; transitions use the
   default guard; `requiresApprovalType` still unset for compatibility.
3. **Assignment resolution** — Rules resolver on `ApprovalEngine.submit` /
   escalation; optional preferred reviewer; default escalate-after 48h.
4. **SLA foundation** — `computeStageSlaDeadline` / `isStageSlaBreached` /
   `remainingSlaHours`; `reportSlaBreaches` emits `workflow.sla_breached`.
5. **Escalation foundation** — `approval.escalated` sink + optional Rules
   reassignment; no workers.
6. **Outbox event sinks** — `createEngineOutboxSinks` for workflow/approval/rules
   events when Outbox is available.
7. **Status projections** — `InMemoryStatusProjectionStore` + default updater
   emitting `workflow.status_projected`.
8. **Tests** — platform seed + engine-completion suites; SQL/operator seeds
   pass `rules`.

## What was not changed

- Engine ownership (Workflow / Approval / Policy)
- Notification delivery, email/SMS/push workers
- CQRS contracts / UI redesign
- Domain business handler rewrites
- Recovery / concurrency acceptance suites (later RC6)
- Rules SQL durability

## Files changed (summary)

| Area | Files |
|---|---|
| Platform engines | `workflow-engine.ts`, `approval-engine.ts`, `sla.ts`, `assignment-resolver.ts`, `status-projection.ts` |
| Events | `engine-events.ts`, `outbox-event-sink.ts` |
| Catalog / seed | `workflow-catalog.ts`, `rules-catalog.ts`, `seed.ts` |
| Composition | `composition-root.ts`; ApiHost seed includes rules |
| Tests | `engine-completion.test.ts`, seed / SQL / operator updates |
| Docs | ADR D53, ADR-INDEX, RC6 README, release reports |

## Residual risks

| Risk | Severity | Notes |
|---|---|---|
| Rules store remains in-memory | Medium | Re-seeded on every host start; SQL Rules later |
| Existing SQL DBs keep v1 defs + add v2 | Low | `getDefinitionByCode` picks latest version |
| Domain handlers still mirror status inline | Info | Projection store is foundation; roadmap item 5 later |
| No SLA/escalation scheduler | Info | Foundation APIs only — intentional OUT |
