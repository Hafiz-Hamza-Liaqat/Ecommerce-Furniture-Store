# RC6.7 — Workflow & Approval Restart / Retry / Idempotency / Concurrency Acceptance

- **Date:** 2026-07-18
- **Approved scope:** Acceptance scenarios for restart, retry, logical
  idempotency, and concurrency using existing engines + RC6.4 SQL stores.
- **Decision record:** `docs/architecture/decision-records/ADR-D55-workflow-approval-recovery-acceptance.md`

## What was delivered

1. **SQL restart acceptance** (`sql-platform-recovery.test.ts`)
   - Reopen workflow instance → continue `qualify` transition
   - Reopen approval request → continue `decide`
2. **Retry / idempotency / concurrency acceptance** (`recovery-acceptance.test.ts`)
   - Duplicate transition → `workflow_illegal_transition`
   - Transition after complete → `workflow_not_running`
   - Duplicate decide → `approval_already_decided`
   - Failed retry does not append history
   - Sequential conflict fail-closed; parallel race ends in a legal stage
3. **Docs** — ADR D55, release reports, `docs/rc6/README.md`

## Production code changes

**None** beyond test script wiring (`package.json` test globs).

Justification: all acceptance scenarios pass against existing
`WorkflowEngine` / `ApprovalEngine` guards and RC6.4 SQL store injection.
No new idempotency framework or distributed lock was required.

## What was not changed

- Notification delivery, Rules SQL, UI/CQRS/authz redesign
- Engine ownership; distributed locking; saga redesign; RC7
- Command-result caching for API `idempotency-key`
- Workflow instance optimistic version column

## Files changed (summary)

| Area | Files |
|---|---|
| SQL acceptance | `packages/persistence-sql/src/platform/sql-platform-recovery.test.ts` |
| Engine acceptance | `packages/platform/src/recovery-acceptance.test.ts` |
| Test scripts | `packages/platform/package.json`, `packages/persistence-sql/package.json` |
| Docs | ADR D55, ADR-INDEX, RC6 README, release reports |

## Residual risks

| Risk | Severity | Notes |
|---|---|---|
| Parallel transitions may last-write-wins | Info | OUT: distributed lock; final stage still legal |
| No cached success on idempotency-key replay | Info | Replay re-executes then fail-closes via guards |
| Domain hardcoded status bypasses | Info | Pre-existing residual from RC6.6 |
