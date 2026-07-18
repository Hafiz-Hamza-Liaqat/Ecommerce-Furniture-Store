# RC6.2 — Workflow & Approval Operator CQRS Foundation

- **Date:** 2026-07-18
- **Approved scope:** Authorized CQRS contracts for workflow definitions,
  instances, transitions, tasks, and approvals; thin handlers delegating to
  existing engines; Policy Engine authorization; minimum runtime/API dispatch
  wiring. No UI, SQL stores, notifications, SLA, escalation, recovery,
  concurrency, rules expansion, or projections.
- **Decision record:** `docs/architecture/decision-records/ADR-D50-workflow-approval-operator-cqrs.md`

## What was delivered

1. **Engine read helpers** (`@afh/platform`)
   - Workflow: `getDefinition`, `listDefinitions`, `listInstances`,
     `listAvailableTransitions`, `listAssignments`, `listHistory`, `listStages`
   - Approval: `getRequest`, `listRequests`, `getDefinitionByType`,
     `listDefinitions`
2. **`@afh/workflow-application`** — 8 commands + 11 queries registered into
   the shared `HandlerRegistry` and wired from `createEnterpriseComposition`.
3. **14 platform operator permissions** (`PLATFORM_PERMISSION_DEFINITIONS`)
   seeded alongside the frozen 105-module catalog; granted to admin /
   super_admin / approver; platform `.read` included in read-only packs.
4. **Tests** — identity catalog/seed updates; operator handler smoke test.

## Command / query surface

| Area | Types |
|---|---|
| Workflow definitions | `RegisterDefinition`, `GetDefinition`, `ListDefinitions` |
| Workflow instances | `GetInstance`, `ListInstances`, `TransitionInstance`, `ListAvailableTransitions` |
| Workflow tasks | `AssignTask`, `ListTasks` |
| Approvals | `RegisterDefinition`, `SubmitRequest`, `ClaimRequest`, `DecideRequest`, `DelegateRequest`, `GetDefinition`, `ListDefinitions`, `GetRequest`, `ListRequests`, `ListHistory` |

## What was not changed

- Business module handlers / lifecycle ownership
- Policy evaluation model
- UI / React
- SQL durability, SLA, escalation, notifications, recovery, concurrency

## Files changed (summary)

| Area | Files |
|---|---|
| Platform engines/stores | workflow-engine/store, approval-engine/store |
| New package | `packages/workflow-application/**` |
| Identity catalog/seed/roles | `PLATFORM_PERMISSION_DEFINITIONS`, seed report field, role grants |
| API composition | `createWorkflowApplication` wiring; dependency |
| Root scripts | build/typecheck/lint include `@afh/workflow-application` |
| Docs | ADR D50, ADR-INDEX, RC6 README, release reports |

## Residual risks

| Risk | Severity | Notes |
|---|---|---|
| In-memory only | Medium | Operator reads reset with process; SQL later |
| No dedicated HTTP routes | Low | Generic `/commands` `/queries` sufficient |
| Approver gets full operator write set | Low | Intentional for RC6.2; refine later if needed |
| `escalateAfterHours` passthrough on submit | Low | Engine field only; no SLA worker in this slice |
| Operator transition omits `approvalSatisfied` | Info | Approval-required edges stay engine-enforced |
