# RC7 — ERP Backend and Operational Data Completion

- **Version:** 1.0
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Status:** RC7.0–RC7.2d committed; **RC7.2e–g CRM/Projects/Service List* implemented — awaiting review (not committed). Do not start RC7.3.**
- **Depends on:** RC5 (authorization), RC6 (workflow/approval) — both release-ready (`rc6` / `v0.6.0`).
- **Canonical product scope:** `docs/productization/01-productization-roadmap.md` §RC7
- **V1 freeze:** [`03-V1-Scope-Freeze.md`](./03-V1-Scope-Freeze.md) — **single source of truth** for Included / Excluded / Deferred / Future. No RC7 engineering slice may expand Included scope without an approved amendment to that document.

---

## Overview

RC7 replaces split fixture/API behavior with **complete, listable, auditable** operational data for the ERP modules that **Version 1.0 claims**. It does **not** deliver professional portals (RC8), AI (RC9), MES (RC12), Analytics 2.0 (RC14), or commercial launch (RC15).

## Definition of Done

RC7 is complete only when:

- Every **Included** V1 entity has authoritative backend ownership.
- No **Production profile** fixture fallback exists for Included surfaces.
- Acceptance criteria in [`04-Acceptance-Criteria.md`](./04-Acceptance-Criteria.md) pass.
- Architecture ownership remains unchanged (Workflow / Approval / Policy / DAM; Reporting and Search are read models only; never business owners).
- RC8 work has not started.

## Objectives

1. Add authoritative `List*` / search / filter / sort / page contracts for API-bound ERP entities.
2. Complete application handlers and persistence for the **frozen V1 subset** of Manufacturing, HR, CMS, Notifications, Reporting, Search, and DAM.
3. Promote notes, comments, attachments, bulk, import, export, and activity to the server **where V1 claims them**.
4. Complete server validation, optimistic concurrency (version conflicts **fail closed**, never silent overwrite), audit, company/branch scope, and workflow integration on V1 surfaces.
5. Remove fixture mixing from the **Production profile**; retain fixtures only in the **Demo/Test profile**.
6. Add migration, seed, reconciliation, and data-quality acceptance tests.

## Dependencies

| Dependency | Role |
|---|---|
| RC5 complete | Policy sole authorizer; D45–D48 load-before-authorize, list filter, scope binding, observability |
| RC6 complete | Workflow/Approval engines; SQL durability; projections; recovery acceptance (D49–D55) |
| CQRS dispatcher + document repositories | Existing command/query pipeline |
| SQL migration + outbox | Persistence, audit events, async foundations |
| **V1 freeze** (`03-V1-Scope-Freeze.md`) | Hard gate before RC7.1+ engineering |

## Architecture constraints (non-negotiable)

| Concern | Owner |
|---|---|
| Business lifecycle / status | **Workflow Engine** (SSoT) |
| Human approval gates | **Approval Engine** |
| Runtime authorization | **Policy Engine only** |
| Files / media | **DAM** (attachments reference DAM) |
| Reports / dashboards / exports (presentation) | **Reporting** (read model only; never a business owner) |
| Search indexes | **Search** (read model only; never a business owner) |
| Stock | **Inventory** |
| Commercial calculations | **Rules Engine** |

**Forbidden:** new authorization framework; SQL second authz / RLS duplicating Policy; engine ownership changes; unapproved cross-module write models; presenting fixtures as production data.

**`List*` obligation (ADR D46):** pagination totals must be computed **after** Policy row filtering.

## Implementation order

1. **RC7.0** — V1 freeze & planning (this pack) — complete
2. **RC7.1** — Shared List foundation — committed
3. **RC7.2a** — Sales `List*` — committed
4. **RC7.2b** — Procurement `List*` — committed
5. **RC7.2c** — Inventory `List*` — committed
6. **RC7.2d** — Finance `List*` — committed
7. **RC7.2e** — CRM `List*` — **implementation complete; awaiting review**
8. **RC7.2f** — Projects `List*` — **implementation complete; awaiting review**
9. **RC7.2g** — Service `List*` — **implementation complete; awaiting review**
10. **RC7.3** — Production UI de-fixturing — **not started**
11. **RC7.4** — Validation, concurrency, audit, scope completion
12. **RC7.5** — DAM foundation (binary/object where V1 claims)
13. **RC7.6** — Attachments, notes, comments, activity
14. **RC7.7** — Import, export, bulk (Policy + audit + company + concurrency)
15. **RC7.8 and later** — Manufacturing, HR, CMS, Notifications, Reporting, Search (V1 subsets only; each module begins with its own planning review before implementation if the approved V1 freeze changes)
16. Final RC7 verification, audit, checklist, tag (after approval)

Detail: [`05-Slice-Roadmap.md`](./05-Slice-Roadmap.md).

## Acceptance criteria (summary)

Full criteria: [`04-Acceptance-Criteria.md`](./04-Acceptance-Criteria.md).

See **Definition of Done** above for the one-page finish line.

## Slice index

| Slice | Title | Status |
|---|---|---|
| RC7.0 | V1 Product Freeze & Planning | Committed |
| RC7.1 | Shared List Foundation | Committed (`1fb1a26`) |
| RC7.2a | Sales List | Committed (`2e811cf`) |
| RC7.2b | Procurement List | Committed (`d01c880`) |
| RC7.2c | Inventory List | Committed (`7ee1a56`) |
| RC7.2d | Finance List | Committed (`6e8f48b`) |
| RC7.2e | CRM List | Implemented — awaiting review (not committed) |
| RC7.2f | Projects List | Implemented — awaiting review (not committed) |
| RC7.2g | Service List | Implemented — awaiting review (not committed) |
| RC7.3 | Production UI de-fixturing | Not started |
| RC7.4 | Validation / concurrency / audit / scope | Not started |
| RC7.5 | DAM foundation | Not started |
| RC7.6 | Attachments / notes / comments / activity | Not started |
| RC7.7 | Import / export / bulk | Not started |
| RC7.8 and later | Manufacturing / HR / CMS / Notifications / Reporting / Search | Not started — V1 subsets only |

## Pack contents

| Doc | Purpose |
|---|---|
| [`01-Overview.md`](./01-Overview.md) | Purpose, RC5/RC6 relationship, ownership, goals/non-goals |
| [`02-Implementation-Plan.md`](./02-Implementation-Plan.md) | Strategy, risks, gates, verification |
| [`03-V1-Scope-Freeze.md`](./03-V1-Scope-Freeze.md) | **Authoritative V1 freeze** (single source of truth) |
| [`04-Acceptance-Criteria.md`](./04-Acceptance-Criteria.md) | Functional, architectural, authz, audit, test, release |
| [`05-Slice-Roadmap.md`](./05-Slice-Roadmap.md) | Slice definitions and sequencing |

## Explicit stop rule

**Do not start RC7.1+ engineering until this pack is reviewed and approved.**  
Do not push tags or begin RC8 during RC7.
