# RC7.4 Implementation Report

- **Date:** 2026-07-18
- **Slice:** RC7.4 — Validation, Concurrency, Audit, Scope completion (+ shared collaboration auth foundation)
- **Baseline:** RC7.3 committed (`3b349f2`)
- **Verdict:** Implementation complete — **awaiting human review (not committed)**
- **Next:** Do **not** start RC7.5 until approved

## Summary

Hardened V1 write paths for optimistic concurrency, dual-branch stock transfer authorization, stock quantity validation, load-before-authorize gaps, and ListStock branch scope. Added shared notes/attachment-link infrastructure (Policy against parent entity; assetId references only; no DAM binary storage).

## Delivered

### Optimistic concurrency (fail-closed)

| Change | Detail |
|---|---|
| `SqlDocumentRepository.save` | Accepts `expectedVersion`; UPDATE fails when `changes === 0` |
| `SqlAggregateDocumentStore.save` | Same `changes === 0` fail-closed |
| `SqliteDatabaseClient.run` | Returns `{ changes }` |
| `UpdateInventoryItem` / `UpdateFinancialAccount` | Optional `expectedVersion`; Get* returns `version` |
| Repos | `findByIdWithVersion` + versioned `save` on InventoryItem / FinancialAccount |

### Dual-branch transfer (freeze residual)

`TransferStock` evaluates Policy for **destination** branch in `handle()` (source still via authorize). Fail closed if either warehouse missing or destination Policy denies.

### Validation / D45

| Path | Fix |
|---|---|
| Reserve / Transfer stock | `insufficient_stock` when available &lt; quantity |
| UpdateInventoryItem | `loadRecordForAuthorization` before Policy |
| UpdateFinancialAccount | `loadRecordForAuthorization` before Policy |
| ListStock `toScope` | Resolves warehouse `branchId` for branch-scoped principals |

### Collaboration foundation (roadmap-adjacent; not RC7.5 binary DAM)

| Surface | Behavior |
|---|---|
| `collaboration.CreateEntityNote` / Delete / List | Parent-entity Policy (read/update actions) |
| `collaboration.AttachEntityAsset` / Detach / List | Stores **assetId** link only via `aggregate_documents` |
| Persistence | `createSqlEntityNoteRepository` / `createSqlEntityAttachmentLinkRepository` — **no new migrations** |
| Wiring | Inventory composition registers handlers for `inventory.item` |

## Explicitly deferred

| Item | Owner |
|---|---|
| DAM binary / CreateAsset / MIME enforcement | **RC7.5** |
| Full multi-module notes/attachments/comments/activity UX | **RC7.6** (foundation started; inventory binding only) |
| Import/export/bulk OCC | **RC7.7** |
| Rolling `expectedVersion` across every remaining Update* handler | Incremental follow-on (pattern established on inventory item + financial account) |

## Architecture

- RC7.1 / `buildAuthorizedListPage` / `principalListScope` / ADR D56 — **unchanged**
- Policy sole authorizer; Workflow / Approval ownership — **unchanged**
- No alternate paging or total-count math
- No UI redesign
