# ADR-D52 — Workflow & Approval SQL durability

- **Status:** Accepted
- **Date:** 2026-07-18
- **Slice:** RC6.4
- **Depends on:** D04, D39, D49, D50, D51

## Context

RC6.1–RC6.3 made Workflow/Approval definitions, operator CQRS, and UI operational
against in-memory engine stores. Process restart wiped runtime instances and
requests. Phase 0B already defined durable workflow/approval tables; Phase 7B
SQL foundation existed without those adapters.

## Decision

1. **Interface-preserving SQL adapters** — `SqlWorkflowStore` and
   `SqlApprovalStore` implement the existing `WorkflowStore` /
   `ApprovalStore` contracts without modifying those interfaces.
2. **Migration v2** — add Phase 0B-aligned tables for definitions, stages,
   transitions, instances, history/events, assignments, approval definitions,
   requests, and actions (`MIGRATION_VERSION = 2`).
3. **Composition injection** — `createPlatformEngines` accepts optional
   `workflowStore` / `approvalStore` and defaults to in-memory adapters.
   Production host injects SQL stores from `createSqlPersistenceFoundation`.
4. **Engines unchanged** — Workflow Engine remains lifecycle SSoT; Approval
   Engine remains approval owner; RC6.1 seed remains idempotent on SQL stores;
   RC6.2 CQRS and RC6.3 UI require no contract changes.

## Consequences

- Production/runtime-host compositions retain workflow/approval state across
  restarts.
- Tests and non-SQL compositions keep in-memory defaults unchanged.
- SLA, escalation, notifications, projections, and recovery suites remain
  later RC6 slices.
