# RC6.4 — Workflow & Approval SQL Durability

- **Date:** 2026-07-18
- **Approved scope:** SQL-backed persistence for Workflow and Approval stores
  via existing store interfaces; composition injection; in-memory default
  preserved; RC6.1 seed idempotent on SQL; RC6.2/RC6.3 unchanged contracts.
- **Decision record:** `docs/architecture/decision-records/ADR-D52-workflow-approval-sql-durability.md`

## What was delivered

1. **Migration v2** (`@afh/persistence-sql`) — Phase 0B-aligned tables for
   workflow definitions/stages/transitions/instances/events/assignments and
   approval definitions/requests/actions.
2. **`SqlWorkflowStore` / `SqlApprovalStore`** — implement existing
   `WorkflowStore` / `ApprovalStore` without interface changes.
3. **Composition**
   - `createPlatformEngines({ workflowStore?, approvalStore? })` — optional
     injection; defaults remain in-memory.
   - `createSqlPersistenceFoundation` exposes `workflowStore` / `approvalStore`.
   - Production host injects SQL stores into API/platform composition.
4. **Tests** — migration, restart durability, seed idempotency, in-memory default.

## What was not changed

- Workflow / Approval engine ownership or algorithms
- Store interface shapes (except optional injection at composition)
- CQRS contracts / UI / Policy / RBAC
- SLA, escalation, notifications, projections, recovery product work

## Files changed (summary)

| Area | Files |
|---|---|
| Platform composition | `packages/platform/src/composition/composition-root.ts` |
| SQL migrations + adapters | `packages/persistence-sql/src/migrations`, `src/platform/**` |
| SQL foundation | `composition-root.ts`, `index.ts`, `package.json` |
| Runtime host | `create-production-host.ts` platform store injection |
| Docs | ADR D52, ADR-INDEX, RC6 README, release reports |

## Residual risks

| Risk | Severity | Notes |
|---|---|---|
| Existing v1 SQLite DBs need restart to apply v2 | Low | `runMigrations` applies v2 on next open |
| SQLite UNIQUE + NULL company_id | Low | Mitigated with `IFNULL(company_id, '')` unique indexes |
| No multi-process write contention suite | Info | Out of scope beyond adapter correctness |
