# ADR-D54 — Workflow status projection proof

- **Status:** Accepted
- **Date:** 2026-07-18
- **Slice:** RC6.6
- **Depends on:** D04, D49, D50, D51, D52, D53

## Context

Architecture Law A.1 / ADR D04 require entity `status` fields to be read-only
projections of the Workflow Engine’s active stage. RC6.5 added
`StatusProjectionUpdater` and an in-memory projection store, but roadmap item 5
still needed an explicit proof that projections stay consistent and that entity
status cannot act as a competing lifecycle owner.

## Decision

1. **Workflow remains SSoT** — `WorkflowInstance.statusProjection` is canonical.
2. **Required projection updater** — `WorkflowEngine` always receives a
   `StatusProjectionUpdater` from `createPlatformEngines` (default
   `createStatusProjectionUpdater`) so start/transition always update the
   projection store.
3. **Consistency helpers** — `evaluateStatusProjectionConsistency`,
   `entityStatusFromWorkflowProjection`, and `entityStatusMatchesProjection`
   detect divergence between instance, store, and entity status.
4. **Acceptance proof** — RC6.6 tests demonstrate alignment across transitions,
   no advance on rejected transitions, detection of independent entity status
   patches, and that the store is a mirror (not a second SSoT).
5. **No broad handler rewrite** — domain `map*Status` mirrors remain; handlers
   are not mass-refactored in this slice.

## Consequences

- Operators and tests can prove projection consistency without changing Policy
  or Approval ownership.
- Known residual: some domain creates still hardcode status without workflow
  (documented; out of broad-rewrite scope).
- Restart/retry/idempotency/concurrency suites remain RC6.7.
