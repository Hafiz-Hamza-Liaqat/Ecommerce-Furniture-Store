# ADR D50 — Workflow & Approval operator CQRS foundation (RC6.2)

- **Status:** Accepted
- **Date:** 2026-07-18
- **Phase:** RC6.2 — Workflow & Approval Operator CQRS Foundation
- **Depends on:** D04, D39, D43, D49

## Context

RC6.1 registered default workflow and approval definitions into the existing
engines. Operators still had no authorized CQRS contracts to inspect
definitions/instances/tasks/approvals or to drive transitions and decisions
outside domain business commands. Domain handlers remain the primary creators
of workflow instances; RC6.2 adds an operator surface only.

## Decision

1. **New application package** `@afh/workflow-application` with thin
   command/query handlers that authorize via Policy and delegate to
   `WorkflowEngine` / `ApprovalEngine`.
2. **Engine read surface** — expose minimal in-memory list/get helpers on the
   existing engines/stores (definitions, instances, available transitions,
   assignments, approval requests). No SQL stores.
3. **Platform operator permissions** — add 14 `platform.*` CQRS codes in
   `PLATFORM_PERMISSION_DEFINITIONS` (distinct from route-only
   `platform.workflows.read` / `platform.approvals.read`). Grant to
   `admin` / `super_admin` / `approver` (full operator set) and include
   platform `.read` codes in auditor/read_only/executive read packs.
4. **Generic dispatch only** — register handlers into the shared
   `HandlerRegistry`; reuse existing `POST /commands` and `POST /queries`.
5. **Ownership unchanged** — Workflow Engine remains lifecycle SSoT; Approval
   Engine remains approval owner; Policy remains sole authorizer; business
   module handlers are not rewritten.

## Consequences

- Operators with the new permissions can query/transition/assign/decide via
  CQRS without UI.
- RC5.1 module catalog remains 105 entries; platform operator permissions are
  an additive seed bucket.
- Later RC6 slices may add UI, SQL durability, SLA, notifications.

## Rejected alternatives

- Handlers inside `@afh/platform` or `@afh/application` (violates package
  boundaries).
- Reusing route permission codes as CQRS actions (validation uniqueness /
  semantic conflation).
- SQL definition/instance stores or UI dashboards in this slice.
