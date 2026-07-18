# RC7.0 — Overview

- **Version:** 1.0
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Slice:** RC7.0 (documentation only)
- **Sources:** productization roadmap §RC7; RC5/RC6 packs; ADRs D04, D39, D43, D45–D55; architecture freeze Phases 0A–0F

## Purpose

Make the frozen Workflow/Approval/Policy platform **operationally useful** by completing the ERP **backend and operational data** gate: listable, scoped, auditable, durable data for Version 1.0 claims — without redesigning engines or inventing parallel ownership.

## Relationship to RC5 and RC6

| Release | What it closed | What RC7 inherits |
|---|---|---|
| **RC5** | Authorization: Policy sole authority, route/session projection, record/field/list filter foundations, scope binding, observability | Every new `List*` / command **must** use AuthorizationSpec, load-before-authorize (D45), Policy row filtering (D46), permission-to-scope (D47), audit (D48) |
| **RC6** | Workflow/Approval definitions, operator CQRS, UI, SQL durability, engine foundations, status projection proof, recovery acceptance | Workflow remains lifecycle SSoT; Approval remains approval owner; entity status remains projection; no ownership moves |

RC5 explicitly deferred **ERP `List*` APIs and fixture retirement** to RC7.  
RC6 closed roadmap items 1–6 for workflow/approval; RC7 must **not** reopen engine ownership.

## Architecture ownership

| Concern | Owner | RC7 implication |
|---|---|---|
| Lifecycle / business status | Workflow Engine | Domains start/transition workflows; do not invent status machines |
| Approvals | Approval Engine | Gate decisions stay on Approval; Policy authorizes who may claim/decide |
| Authorization | Policy Engine only | No frontend authz as security; no SQL RLS as second authorizer |
| Files | DAM | Attachments store refs to DAM assets |
| Reporting presentation | Reporting Framework | Read models / exports — not domain write ownership |
| Search | Search | Indexed **read model only; never a business owner** / reindex — not source of truth for writes |
| Stock | Inventory | Manufacturing/HR must not own stock ledgers |
| Notifications dispatch | Event Bus → Notifications | Domains emit events; do not call channels directly |

## Goals

1. Freeze Version 1.0 module/entity claims before engineering (V1 freeze: `03-V1-Scope-Freeze.md`).
2. Deliver authoritative `List*` for currently API-bound entities in the seven wired ERP applications.
3. De-fixture **Production profile** operational views for claimed surfaces.
4. Complete validation, optimistic concurrency (fail closed — never silent overwrite), audit, and company/branch scope on V1 paths.
5. Deliver V1 DAM binary foundation and collaboration/import/export **only where claimed**.
6. Deliver V1 subsets of Manufacturing, HR, CMS, Notifications, Reporting, Search without absorbing RC8–RC15.
7. Prove migration, seed, reconciliation, and data quality.

## Non-goals

- Professional portals / partner verification (RC8)
- Real AI providers (RC9)
- Industry calculators (RC10)
- Full furniture commerce / storefront truth (RC11)
- Full digital manufacturing MES — BOM execution, routing execution, capacity, shop floor, MRP, cost rollup, machine maintenance (RC12 / later)
- End-to-end CX journeys (RC13)
- Analytics 2.0 / forecasting (RC14)
- Commercial launch certification (RC15)
- New authorization framework or Policy Engine redesign
- Workflow/Approval/Rules ownership changes
- Notification **delivery workers** as RC7 charter (RC6 residual — separate decision)
- Rules SQL durability as RC7 charter
- Distributed locking / instance CAS frameworks
- Wiring all ~201 UI entities without freeze approval
- Treating Kanban/Gantt/calendar presentation toys as V1 backend requirements unless freeze says so

## Planning posture

RC7.0 produces documentation only. **No** application code, handlers, APIs, migrations, UI, or tests in this slice.
