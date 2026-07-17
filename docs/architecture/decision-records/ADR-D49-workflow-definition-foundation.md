# ADR D49 — Default workflow and approval definition foundation (RC6.1)

- **Status:** Accepted
- **Date:** 2026-07-18
- **Phase:** RC6.1 — Workflow Definition Foundation
- **Depends on:** D04, D39

## Context

Application handlers across seven ERP modules already call
`WorkflowEngine.start` with stable definition codes and
`ApprovalEngine.submit` with stable approval types. Before RC6.1 no
definitions were registered, so every create path that starts a workflow
failed with `workflow_definition_not_found`. Engines, in-memory stores, and
handler wiring already existed; only the default catalog was missing.

RC6.1 closes that gap without expanding into operator CQRS, UI, SLA,
notifications, recovery, concurrency, SQL definition stores, or Policy
changes.

## Decision

1. **Versioned platform catalog.** Freeze default workflow (19 codes) and
   approval (16 types) definitions under
   `rc6.1.platform-definitions.v1` in `@afh/platform` catalog modules.
2. **Engine-owned registration.** Seed via existing
   `WorkflowEngine.registerDefinition` and
   `ApprovalEngine.registerDefinition`. Lifecycle ownership remains with the
   Workflow Engine (D04). Handlers are not modified beyond relying on
   registered definitions.
3. **Global definitions.** Seed with `companyId: null` so company-scoped
   starts resolve through the existing store lookup (company match or global).
4. **Idempotent boot seed.** `seedPlatformDefinitions` soft-skips
   `workflow_definition_exists` / `approval_type_exists` and runs from
   `ApiHost.start()` before HTTP listen so every process restart reloads
   in-memory stores.
5. **Domain-aligned stages.** Initial stage codes match domain status
   mappers. Known handler default transition codes (`qualify`, `convert`,
   `submit`, `issue`, `cancel`, `archive`, `complete`, `close`) are
   registered without guards or `requiresApprovalType` (later RC6).

## Consequences

- Create/start paths that previously failed on missing definitions succeed
  after host start.
- In-memory persistence only: definitions are process-lifetime until SQL
  stores land in a later RC6 slice.
- Approval `submit` still does not require a registered type; seeding
  establishes the catalog for consistency and later operator surfaces.
- Changing catalog codes/stages is a versioned catalog change; expanding
  into CQRS/UI/SLA remains out of RC6.1.

## Rejected alternatives

- Per-domain seed modules inside `*-application` packages (would split
  engine catalog ownership).
- SQL definition persistence in RC6.1 (no store implementation exists yet).
- Attaching Rules guards / approval requirements on default transitions
  (would block lifecycle without Rules/Approval operator wiring).
