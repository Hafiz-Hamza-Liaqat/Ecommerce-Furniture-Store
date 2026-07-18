# ADR-D53 — Workflow & Approval engine completion

- **Status:** Accepted
- **Date:** 2026-07-18
- **Slice:** RC6.5
- **Depends on:** D04, D39, D49, D50, D51, D52

## Context

RC6.1–RC6.4 delivered definitions, operator CQRS, UI, and SQL durability, but
Workflow/Approval engines still left Rules guards unset, approval assignment
manual-only, SLA/escalation scanners unwired to events, and projection/event
sinks unused. Roadmap item 4 required completing those foundations without
delivery workers or engine ownership changes.

## Decision

1. **Rules-backed workflow guards** — seed
   `platform.workflow.guard.default`; attach it to catalog v2 transitions.
   Deny only when `guardContext.denyTransition === true` (backward compatible).
2. **Approval assignment resolution** — inject
   `createRulesApprovalAssignmentResolver` into `ApprovalEngine.submit` /
   escalation; prefer `preferredReviewerUserId` from payload; default
   `escalateAfterHours = 48`.
3. **SLA calculation foundation** — pure helpers + catalog stage
   `slaHours` (72h non-terminal) + `WorkflowEngine.reportSlaBreaches` event
   emission. No scheduler/worker.
4. **Escalation foundation** — `escalateDueRequests` emits
   `approval.escalated` and may reassign via Rules; no delivery.
5. **Notification event production** — outbox sinks for workflow/approval/rules
   engine events when an Outbox is available; no email/SMS/push.
6. **Status projections** — default `StatusProjectionUpdater` writes an
   in-memory projection store and emits `workflow.status_projected`. Workflow
   remains lifecycle SSoT; domain handlers may still mirror status locally.
7. **Catalog version** — workflow definitions version **2**; seed versions
   `rc6.5.platform-definitions.v1` / `rc6.5.platform-rules.v1`. Idempotent seed
   registers rules alongside workflows/approvals.

## Consequences

- Existing domain transitions continue without `denyTransition`.
- `requiresApprovalType` remains unset (handlers do not pass
  `approvalSatisfied`).
- Recovery suites, notification delivery, Rules SQL durability, and roadmap
  item 5 (prove entity status is projection-only) remain later RC6.
