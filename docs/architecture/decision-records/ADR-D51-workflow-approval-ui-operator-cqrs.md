# ADR-D51 — Workflow & Approval UI over operator CQRS

- **Status:** Accepted
- **Date:** 2026-07-18
- **Slice:** RC6.3
- **Depends on:** D04, D39, D43, D49, D50

## Context

RC6.2 delivered Policy-authorized operator CQRS for Workflow and Approval engines.
The existing `/app/workflow` and `/app/approvals` pages still rendered fixture data and
local stub decisions, which violated presentation-only frontend rules and hid Policy
denials behind fake queues.

## Decision

1. **Live operator surfaces only** — `WorkflowPage` and `ApprovalsPage` load via
   `api.dispatchQuery` / `api.dispatchCommand` against RC6.2 types
   (`workflow.ListDefinitions`, `workflow.ListInstances`,
   `workflow.ListAvailableTransitions`, `workflow.ListTasks`,
   `approval.ListRequests`, `approval.ClaimRequest`, `approval.DecideRequest`).
2. **No frontend authz or lifecycle** — Policy Engine remains the sole authorization
   authority; engines remain lifecycle/approval owners. The UI surfaces loading,
   empty, error, and Policy-forbidden states without inventing client-side rules.
3. **Read-only workflow transitions** — available transitions and tasks are displayed;
   `workflow.TransitionInstance` is not invoked from the browser (engine boundary retained).
4. **Routes and shell preserved** — `/app/workflow` and `/app/approvals` route permission
   gates (`platform.workflows.read` / `platform.approvals.read`) and navigation entries
   are unchanged.

## Consequences

- Operators with route `.read` but without operator CQRS permissions see in-page
  Policy forbidden messages (correct fail-closed behavior).
- Empty lists are expected until modules create instances/requests (in-memory engines).
- Dashboard preview fixtures remain presentation placeholders outside this slice.
