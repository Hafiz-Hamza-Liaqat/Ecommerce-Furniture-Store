# RC9.4 — Persistence & Collaboration Report

**Date:** 2026-07-20  
**Status:** Implemented — awaiting approval (no commit)

## Objective

Transform AFH from a session-based planning tool into a persistent customer project platform. Every customer can save furnishing plans, resume later, edit across rooms, collaborate, and continue AI consultations without losing state.

## What shipped

### Shared project model (`packages/web/src/marketing/cx/projects/`)

| Module | Responsibility |
|---|---|
| `types.ts` | `FurnishingProject`, rooms, versions, quotes, notes, collaborators, share links, statuses |
| `store.ts` | `localStorage` index + per-project records, share-token index, guest→account merge |
| `service.ts` | CRUD, versions, rooms, notes, quotes, sharing, collaboration, CRM meta, AI welcome-back |
| `planner-bridge.ts` | Restore planner UI from saved room (no engine duplication) |

### Customer surfaces

- **`/my-projects`** — `CustomerProjectsPage.tsx` dashboard with search, sort, filter, share-link copy, planner/consultant resume links
- **Budget Planner** — `?projectId=` / `?roomId=` restore, multi-room tabs (add/duplicate/switch), Save project, quotation + CRM enrichment
- **AI Consultant** — `?projectId=` resume with welcome-back message; debounced `syncConsultantState` when bound to a project

### Persistence keys

| Key | Purpose |
|---|---|
| `afh.cx.projects.index` | Lightweight dashboard rows (lazy list) |
| `afh.cx.project.{uuid}` | Full project payload |
| `afh.cx.projects.owner` | Local owner id (guest or account) |
| `afh.cx.projects.share` | Share token → project id map |

### Status workflow

`draft` → `planning` → `quoted` → `pending_approval` → `approved` → `production` → `completed` → `archived`

Status changes do not alter recommendation engine logic.

## Architecture principles

- **Single model** for AI Consultant and Budget Planner
- **No RC9.1–9.3 engine changes** — persistence wraps existing planner/consultant outputs
- **Client-side persistence** for RC9.4 (server API deferred)
- **Lazy dashboard** — index loads first; full records load on open
- **Security** — UUID validation, owner/collaborator permission checks, no sensitive data in share URLs (opaque token only)

## Integrations preserved

| Flow | RC9.4 behaviour |
|---|---|
| Quote generation | `recordQuote` attaches quotation versions to project |
| CRM handoff | `buildCrmProjectMeta` adds project id, version, rooms, AI/planner summaries |
| PDF export | Unchanged |
| Product recommendations | Restored from saved room lines |
| Planner → AI handoff | Still uses `sessionStorage`; project id appended when saved |

## Known limitations

- **No server sync** — projects are browser-local until a backend API lands
- **Version UI** — compare/restore APIs exist; dedicated version panel UI is minimal (history visible via service/tests)
- **Email invites** — collaborator model + stub invite; no outbound email delivery
- **Rename/reorder/delete room** — service APIs implemented; planner UI exposes add/duplicate/switch only in RC9.4

## Files touched

- `packages/web/src/marketing/cx/projects/*`
- `packages/web/src/marketing/pages/CustomerProjectsPage.tsx`
- `packages/web/src/marketing/pages/BudgetPlannerPage.tsx`
- `packages/web/src/marketing/pages/ConsultantPage.tsx`
- `packages/web/src/routes/lazy.tsx`, `App.tsx`
- `packages/web/src/marketing/MarketingShell.tsx`
- `packages/web/src/styles/marketing.css`
- `packages/web/src/marketing/cx/rc94-projects.test.ts`
