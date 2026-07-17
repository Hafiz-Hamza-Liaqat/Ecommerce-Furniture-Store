# RC6.1 — Workflow Definition Foundation

- **Date:** 2026-07-18
- **Approved scope:** Register and persist default workflow definitions
  required by existing engines; register default approval definitions;
  ensure existing workflow start references resolve. Reuse Workflow/Approval
  engines. No UI, operator CQRS, notifications, SLA/escalation, recovery,
  concurrency changes, or new projections. Policy Engine unchanged.
- **Decision record:** `docs/architecture/decision-records/ADR-D49-workflow-definition-foundation.md`
- **Catalog version:** `rc6.1.platform-definitions.v1`

## What was delivered

1. **Workflow catalog (19 definitions)** in
   `packages/platform/src/catalog/workflow-catalog.ts`
   - All codes declared by `*-application` constants, including
     `inventory_stock_transfer_v1` (no handler start today).
   - Global (`companyId: null`), `version: 1`.
   - Initial stages aligned with domain status mappers
     (`new`, `open`, `planned`, `scheduled`, `captured`, or `draft`).
   - Default transitions for known handler fallbacks without Rules guards
     or approval requirements on edges.
2. **Approval catalog (16 types)** in
   `packages/platform/src/catalog/approval-catalog.ts`
3. **Idempotent seed** `seedPlatformDefinitions` with checksum, conflict
   soft-skip, and optional `platform.definitions_seeded` audit.
4. **Host wiring** — `ApiHost.start()` awaits seed before HTTP listen;
   seed failure aborts startup (fail closed).
5. **Tests** — `packages/platform/src/catalog/seed.test.ts` covers catalog
   shape, idempotency, start resolution for all 19 codes, default
   transitions, and audit emission.

## Behavioral change

- After host start, `WorkflowEngine.start` for the 19 catalog codes resolves
  instead of returning `workflow_definition_not_found`.
- Handler business logic is unchanged; engines remain lifecycle owners.

## What was not changed

- Policy Engine / authorization model / RBAC.
- Workflow/Approval engine ownership or public APIs beyond using
  `registerDefinition`.
- Business handler behavior (no command/query changes).
- UI pages, operator CQRS, notifications, SLA/escalation, recovery,
  concurrency, SQL definition stores, Rules catalog seed.

## Files changed (summary)

| Area | Files |
|---|---|
| Platform catalog | `catalog/workflow-catalog.ts`, `approval-catalog.ts`, `seed.ts`, `index.ts`, `seed.test.ts` |
| Platform exports | `index.ts`, `package.json` (test script) |
| API host | `host/api-host.ts` seed-before-listen |
| Docs | ADR D49, ADR-INDEX, RC6 slice note, release reports |

## Operator notes

1. Definitions live in the in-memory engine stores and are re-seeded on every
   process start via `ApiHost.start()`.
2. Catalog checksum is in the `platform.definitions_seeded` audit details.
3. To exercise creates in tests that do not call `ApiHost.start()`, call
   `seedPlatformDefinitions({ workflow, approval })` explicitly.
4. Next approved slice (RC6.2+) may add operator CQRS, durable stores, or UI
   — not started here.

## Residual risks

| Risk | Severity | Notes |
|---|---|---|
| In-memory only | Medium | Definitions vanish without boot seed; SQL persistence is later RC6 |
| Minimal stage graphs | Low | Enough for start + known defaults; richer graphs later |
| Approval submit ignores definitions | Low | Catalog seeded for consistency; engine behavior unchanged |
