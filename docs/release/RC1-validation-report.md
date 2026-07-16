# AFH Release Candidate 1 — End-to-End Validation Report

**Date:** 2026-07-16  
**Scope:** Feature-complete platform validation + defect stabilization  
**Mode:** Implementation + Validation + Bug Fixes (no feature expansion)

## Executive verdict

**RC1 PASS (with RC2 deferred items noted).**

All routes are reachable, critical stub/broken-link defects were fixed, typecheck/lint/build pass, architecture packs unchanged, and no new ERP modules or platform layers were introduced.

## Quality gates

| Gate | Result |
|------|--------|
| All routes reachable | Pass |
| No broken primary navigation | Pass |
| Workflow / Approvals operational (UI) | Pass |
| Register + auth surfaces present | Pass |
| Admin / portal auth gated | Pass |
| Analytics deep-links corrected | Pass |
| TypeScript | Pass (`@afh/web`, `@afh/api`) |
| Lint | Pass (`@afh/web`) |
| Build | Pass (`@afh/web`) |
| Architecture unchanged | Pass |
| No new ERP modules / APIs beyond Identity register transport | Pass |

## Defects fixed in RC1

| Severity | Defect | Fix |
|----------|--------|-----|
| Blocker | Workflow & Approvals empty stubs | Operator queues with status/history/approve-reject UI |
| Blocker | No register route / client | `/register` + `ApiClient.register` + thin `POST /api/v1/auth/register` wrapping existing Identity |
| Major | Ungated `/admin/platform`, `/portal` | Wrapped in session auth gate |
| Major | Broken analytics entity deep-links | Corrected to real entity keys |
| Major | Dead booklet hotspots | Hotspots update material selectors + spotlight |
| Major | AI prompt Share without clipboard | Writes share URL to clipboard |
| Major | Dead `.local` success docs links | Point to in-app Success / Releases / FAQ |
| Major | No active devices UI | `/app/account/security` devices + session probe |
| Minor | `/#booklet` scroll | Hash-aware scroll in MarketingShell |
| Minor | Newsletter `alert()` | Inline status + localStorage |
| Minor | Placeholder KPI copy | OEE / CLV show snapshot values |
| Minor | Product tours toast-only | Navigate into module tours |

## Deferred to RC2 (Real Backend Integration)

These are expected presentation-layer boundaries, not RC1 blockers:

- Live Approval/Workflow command submission against production queues
- Live Observability security log ingestion (audit UI uses durable local trail + session probe)
- Vendor AI SDK execution beyond provider abstractions
- Regional payment gateways
- True multi-device revoke via Identity session store listing API
- Production domain replacement for `artisanfurnish.example` sitemap/canonical hosts

## Architecture confirmation

Not modified: Architecture Pack 0A–0F, CQRS, Runtime, SQL schema, Workflow/Policy/Rules/Approval engines, Event Bus, Messaging, Identity core, Security model.

Only transport completion: auth register endpoint calling existing `AuthenticationService.register`.
