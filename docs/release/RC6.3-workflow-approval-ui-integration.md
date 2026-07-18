# RC6.3 — Workflow & Approval UI Integration

- **Date:** 2026-07-18
- **Approved scope:** Connect existing Workflow and Approval pages to RC6.2
  operator CQRS; replace fixture/mock data with live backend data; display
  definitions, instances, transitions, tasks, and approval requests; loading /
  empty / error / unauthorized states; Policy-respecting presentation; preserve
  shell, navigation, and routing.
- **Decision record:** `docs/architecture/decision-records/ADR-D51-workflow-approval-ui-operator-cqrs.md`

## What was delivered

1. **`WorkflowPage`** (`packages/web/src/pages/platform.tsx`)
   - Loads `workflow.ListDefinitions` and `workflow.ListInstances`
   - Tabs: Active (running), Definitions, All, History (completed/cancelled)
   - Selecting an instance loads `workflow.ListAvailableTransitions` and
     `workflow.ListTasks` (display-only; no transition commands)
   - Loading skeleton, empty states, partial-load warnings, Policy forbidden
2. **`ApprovalsPage`**
   - Loads `approval.ListRequests`
   - Claim → `approval.ClaimRequest`; Approve/Reject → `approval.DecideRequest`
   - No local status mutation; toast reflects engine outcome or Policy denial
3. **Tests** — `packages/web/src/pages/platform.test.tsx` (6 cases)

## What was not changed

- Workflow / Approval engines
- CQRS contracts / handlers
- SQL durability, notifications, SLA, escalation, retry, concurrency, projections
- Route permission catalog, App routes, shell navigation entries
- Dashboard preview fixtures (`APPROVALS_PREVIEW` / `ACTIVITY` on dashboard only)
- Business module lifecycle ownership

## Files changed (summary)

| Area | Files |
|---|---|
| Web operator pages | `packages/web/src/pages/platform.tsx` |
| Web tests | `packages/web/src/pages/platform.test.tsx` |
| Docs | ADR D51, ADR-INDEX, RC6 README, release reports |

## Residual risks

| Risk | Severity | Notes |
|---|---|---|
| Empty operator queues | Low | In-memory engines; instances/requests appear when modules start them |
| Route `.read` ≠ operator CQRS permissions | Info | In-page Policy message is correct; operators need RC6.2 grants |
| Dashboard still shows approval/activity fixtures | Low | Outside RC6.3 page scope; defer to a later dashboard slice |
| In-page tab label `Draft` → `Definitions` | Info | Routes/nav unchanged; tab aligns with live definition list |
