# RC8.2 — Enterprise Workspace Completion Report

- **Date:** 2026-07-19
- **Phase:** RC8.2 Enterprise Workspace Completion
- **Commit:** none (blocked pending review)
- **Scope:** Production enterprise workspace UI wiring — dashboards, CRUD, admin/settings hubs, reports, DAM, collaboration, jobs, notifications, user pages

## Summary

RC8.2 completes the remaining enterprise workspace surfaces by connecting existing `ModuleApp` / definition-driven screens to live CQRS handlers already present in the API. No backend redesign, no parallel services, and no RC7 foundation changes.

## What shipped

### 1. Live List*/CRUD bindings (newly wired)

| Module | Entity | List query | Notes |
|---|---|---|---|
| HR | `employees` | `hr.ListEmployee` | Get / Create wired |
| Manufacturing | `production-orders` | `manufacturing.ListProductionOrder` | Get / Create wired |
| CMS | `pages` | `cms.ListCmsEntry` | Get / Create / Update wired |
| DAM | `assets` | `dam.ListAsset` | Get + existing upload path |
| Notifications | `center` | `notifications.ListInAppNotifications` | Live inbox |
| Notifications | `preferences` | preference upsert command | Preferences CRUD |
| Reporting | `library` | `reporting.ListReportDefinition` | RunReport lifecycle retained |
| Search | `results` | `search.SearchQuery` | Custom payload + hit mapper |
| Jobs (new) | `queue` | `jobs.ListBackgroundJobs` | Enqueue / complete / fail / retry |

### 2. Jobs UI under Platform

- New `JOBS_MODULE` at `/app/platform/jobs` (avoids identity route-catalog sync).
- Mounted in `PlatformRoutes`, sidebar (`workspace/data.ts`), and Settings hub.

### 3. Collaboration on entity detail

- `ModuleApp` loads/creates notes via `collaboration.ListEntityNotes` / `CreateEntityNote` when `collaborationEntityType` is set.
- Bound on CRM lead/contact/account, Sales opportunity/quote/order, Inventory products, Procurement requests/orders, Projects project/task, Service work-orders (matching API V1 bindings).
- Falls back to localStorage when collaboration type is unset or API unavailable.

### 4. Settings / Reports / Personal workspace

- **PreferencesPage** expanded into a Settings destination hub (security, MFA, notifications, AI, jobs, health, audit, backup, DAM, search, reporting, org/platform, me).
- **ReportsCenter** — live report library panel via `reporting.ListReportDefinition`.
- **PersonalWorkspace** — live inbox preview via `notifications.ListInAppNotifications`.

### 5. List query adapter

- `readListPage` accepts `jobs`, `hits`, `notes`, `attachments`, and `total` shapes from existing handlers.

### 6. Regression freeze

- `packages/web/src/modules/erp/rc82-bindings.test.ts` freezes the new list bindings.

## Architecture compliance

| Constraint | Result |
|---|---|
| No RC7.1 shared foundation change | PASS |
| No Policy / Workflow / Approval ownership change | PASS |
| No CQRS redesign / duplicate APIs | PASS |
| Reuse existing handlers only | PASS |
| No RC8.3 production-quality scope started | PASS |

## Honest residuals (non-blocking for RC8.2 review)

These remain presentation/fixture or secondary because no dedicated List* CQRS surface exists (or was out of V1 binding set):

- Secondary entities (HR leave/payroll, Mfg BOM, CMS blogs, DAM collections, etc.) stay fixture/local where no list handler exists.
- Admin tenants/users/roles/billing remain presentation fixtures (no `ListUser` CQRS found to wire without inventing APIs).
- Collaboration comments still local; notes/attachments live when API returns them.
- Jobs live under `/app/platform/jobs` (not a top-level `/app/jobs` catalog entry).
- Module dashboards without `Get*Summary` (e.g. Sales, HR, Manufacturing) keep definition-driven KPI shells; modules with summary queries continue using them.

## Files touched (web)

Primary: module `definition.ts` files (HR, Manufacturing, CMS, DAM, Notifications, Reporting, Search, CRM/Sales/Inventory/Procurement/Projects/Service collab flags), `ModuleApp.tsx`, `list-query.ts`, `types.ts`, `jobs/definition.ts`, `PlatformRoutes.tsx`, `pages.tsx`, `PreferencesPage.tsx`, `ReportsCenter.tsx`, `PersonalWorkspace.tsx`, `workspace/data.ts`, `rc82-bindings.test.ts`.

## Verdict

**IMPLEMENTED — awaiting review before commit.** Do not start RC8.3 until RC8.2 is approved.
