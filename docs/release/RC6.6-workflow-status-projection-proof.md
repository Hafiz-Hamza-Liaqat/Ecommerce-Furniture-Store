# RC6.6 — Workflow Status Projection Proof

- **Date:** 2026-07-18
- **Approved scope:** Prove entity status is a read-only projection of Workflow
  `statusProjection`; harden RC6.5 updater wiring; acceptance tests; ADR D54.
- **Decision record:** `docs/architecture/decision-records/ADR-D54-workflow-status-projection-proof.md`

## What was delivered

1. **Required projection updater** on `WorkflowEngine` — start/transition always
   call the updater (composition injects `createStatusProjectionUpdater`).
2. **Consistency helpers** — `entityStatusFromWorkflowProjection`,
   `entityStatusMatchesProjection`, `evaluateStatusProjectionConsistency`.
3. **Acceptance tests** (`status-projection-proof.test.ts`) proving:
   - instance ↔ store ↔ entity status alignment across transitions
   - rejected transitions do not advance projections
   - divergent entity status is flagged as independent lifecycle ownership
   - projection store tampering does not change Workflow SSoT
4. **Docs** — ADR D54, release reports, `docs/rc6/README.md` update.

## What was not changed

- Domain handler mass rewrites / removing entity `status` columns
- SQL `status_projections` table
- Policy / Approval / Workflow ownership
- CQRS / UI redesign
- RC6.7 recovery / idempotency / concurrency suites
- Notification delivery; Rules SQL durability

## Files changed (summary)

| Area | Files |
|---|---|
| Projection helpers + harden | `status-projection.ts`, `workflow-engine.ts`, `workflow/index.ts` |
| Acceptance tests | `status-projection-proof.test.ts`, `package.json` test script |
| Docs | ADR D54, ADR-INDEX, RC6 README, release reports |

## Residual risks

| Risk | Severity | Notes |
|---|---|---|
| Some domain creates still hardcode status | Info | Explicit OUT — no broad handler rewrite |
| Projection store remains in-memory | Info | Mirror only; instance column is durable via RC6.4 |
