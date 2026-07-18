# RC7.0 — Implementation Plan

- **Version:** 1.0
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Slice:** RC7.0 (documentation only)
- **Authoritative freeze:** [`03-V1-Scope-Freeze.md`](./03-V1-Scope-Freeze.md)
- **Slice sequence:** [`05-Slice-Roadmap.md`](./05-Slice-Roadmap.md)

## Implementation strategy

1. **Freeze first** — No RC7.1+ code until V1 Included/Excluded/Deferred/Future is approved.
2. **Foundation before modules** — RC7.1 ships shared `List*` contracts (page/cursor, sort, filter, search, Policy row filtering, total semantics) with **zero module-specific / entity handlers**.
3. **One module `List*` at a time** — RC7.2a–g keep reviewable blast radius; each inherits RC7.1 + D45–D47.
4. **Then UI truth** — RC7.3 removes **Production profile** fixture lists for claimed entities; the **Demo/Test profile** may keep fixtures.
5. **Then harden writes** — RC7.4 closes validation, optimistic concurrency, audit, and scope gaps on V1 paths. Version conflicts must **fail closed** and never silently overwrite state.
6. **Then files & collaboration** — RC7.5 DAM foundation; RC7.6 attachments/notes/comments/activity (attachments → DAM).
7. **Then bulk I/O** — RC7.7 import/export/bulk with Policy + audit + company isolation + optimistic concurrency mandatory.
8. **Then unfinished packages** — RC7.8 and later, V1 subsets only (Manufacturing ≠ MES). Each module begins with its own planning review before implementation if the approved V1 freeze changes.
9. **Prove data** — migration, seed, reconciliation, DQ acceptance before RC7 closeout.

Prefer **prove existing patterns** (CQRS handlers, document stores, Policy pipeline, outbox) over new frameworks.

## Dependencies

| Gate | Required before |
|---|---|
| RC5 tagged/complete | Any `List*` or new handlers |
| RC6 tagged/complete | Workflow-integrated operational paths |
| RC7.0 review approval | RC7.1 |
| RC7.1 | RC7.2a–g |
| RC7.2 for a module | RC7.3 wiring for that module’s lists |
| RC7.5 | RC7.6 attachments |
| V1 claim for import/export | RC7.7 |
| V1 claim for unfinished modules | RC7.8 and later |

## Risks

| Risk | Mitigation |
|---|---|
| UI surface >> backend (scope creep) | Enforce V1 freeze (`03-V1-Scope-Freeze.md`); reject entities not listed as Included |
| Unapproved read-model ownership | Search/Reporting remain read models only; never business owners; cross-module views need ADR |
| `List*` performance / empty pages for scoped users | Bounded pages; totals after Policy row filtering (D46); seed required scope fields (DQ) |
| Bulk import/export integrity & security | RC7.7 mandatory Policy/audit/company/concurrency; size/MIME limits |
| DAM binary gap | RC7.5 before treating attachments as production |
| Manufacturing MES creep | Freeze explicitly defers BOM/routing/capacity/shop floor/MRP/cost/maintenance |
| Fixture presented as production | RC7.3 + profile contract; Production profile fail-closed without `List*` |

## Acceptance gates (per engineering slice)

Each RC7.1+ slice must satisfy before commit approval:

1. Scope matches freeze + slice roadmap (IN/OUT checked).
2. Architecture ownership unchanged (Workflow / Approval / Policy / DAM / Reporting / Search).
3. Build, typecheck, lint, runtime verify/harden/accept pass.
4. Relevant package tests pass; AuthorizationSpec on new handlers.
5. Slice implementation + verification + audit docs (pattern from RC5/RC6).
6. No RC8+ or out-of-freeze work in the tree.

## Verification plan

| Layer | Evidence |
|---|---|
| Unit / handler | `List*` filter/sort/page; deny/allow; totals after Policy row filtering |
| Application / API | AuthorizationSpec; company binding; IDOR negatives |
| Persistence | Migration apply; seed idempotency; optimistic concurrency conflicts fail closed |
| Web | Production profile uses live `List*`; Demo/Test profile may fixture |
| Cross-module | Reconciliation + DQ acceptance (late slices) |
| Release | Final RC7 verification + audit + checklist (after RC7.8 and later) |

## Explicit non-implementation (RC7.0)

This document does **not** authorize code. Engineering begins only after human approval of RC7.0 and an explicit start of RC7.1.
