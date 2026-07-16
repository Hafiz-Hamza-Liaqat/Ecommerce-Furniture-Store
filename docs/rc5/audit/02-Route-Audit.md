# RC5 Route Audit

## 1. Guard truth

`packages/web/src/App.tsx` implements two guards:

- `RequireAuth`: checks only `tokens.sessionId`, then renders an outlet.
- `RequireAuthElement`: performs the same check around portal/admin route trees.

There is no role, permission, company, branch, organization, ownership, or feature-flag decision in either guard. Every protected child route therefore has the same current access: **any client holding a locally persisted session ID**. Backend calls still authenticate independently.

## 2. Top-level protected routes

The complete top-level matrix is in `01-RC5-Traceability-Matrix.md`. All RC5-documented protected route families exist. None is obsolete. The only duplicate destination is `/app/platform` in two sidebar groups, not a duplicate React route.

## 3. Generic module route expansion

`ModuleApp.tsx` registers the following children for each module base.

| Child pattern | Component | Current guard | Required RC5 gate | Existence |
|---|---|---|---|---|
| index | `ModuleDashboard` | Session | `{module}.dashboard.read` | Exists |
| `pipeline` | `KanbanPage` | Session | `{module}.dashboard.read` or `{module}.boards.read` | Exists for every module, even where semantically weak |
| `gantt` | `GanttPage` | Session | `{module}.dashboard.read` | Exists for every module |
| `calendar` | `CalendarPage` | Session | `{module}.dashboard.read` | Exists for every module |
| `:entityKey` | `EntityListPage` | Session | `{module}.{resources}.read` | Exists for defined entity keys; unknown keys render module behavior, not a 404 permission boundary |
| `:entityKey/new` | `EntityFormPage` | Session | `{module}.{resources}.create` | Exists |
| `:entityKey/:recordId` | `EntityDetailPage` | Session | `{module}.{resources}.read` + record scope | Exists |
| `:entityKey/:recordId/edit` | `EntityFormPage` | Session | `{module}.{resources}.update` + field scope | Exists |
| `*` | Redirect | Session | Same as module open | Exists |

This expansion applies to 14 bases: `/app/sales`, `/app/procurement`, `/app/inventory`, `/app/finance`, `/app/projects`, `/app/crm`, `/app/service`, `/app/hr`, `/app/manufacturing`, `/app/cms`, `/app/dam`, `/app/notifications`, `/app/search`, and `/app/reporting`.

**Mismatch:** RC5 describes semantic route permissions, but the generic router exposes board/gantt/calendar templates uniformly and has no entity-key permission lookup. Authorization must be derived from validated module/entity definitions, not raw URL segments.

## 4. Analytics and reports

| Route | Component | Current | Expected | Result |
|---|---|---|---|---|
| `/app/analytics` | `AnalyticsHome` | Session | `analytics.dashboards.read` | Gate missing |
| `/app/analytics/builder` | `DashboardBuilderPage` | Session | `analytics.dashboards.configure` | Gate missing |
| `/app/analytics/kpis/:moduleId` | `ModuleKpiPage` | Session | analytics + module dashboard view | Gate missing |
| `/app/reports` | `ReportsHome` | Session | `reporting.reports.read` | Gate missing |
| `/app/reports/:domain` | `ReportDetail` | Session | `reporting.reports.read` + domain read | Gate missing |

Both route components redirect unmatched children to their index. No duplicate route declaration was found.

## 5. AI

| Child under `/app/ai` | Component | Expected permission | Result |
|---|---|---|---|
| index | `AiChatWithQueryPrompt` | `ai.assistant.use` | Exists; missing gate |
| `workspace` | `AiWorkspacePage` | `ai.assistant.use` | Exists; missing gate |
| `writing` | `WritingStudioPage` | `ai.assistant.use` | Exists; missing gate |
| `documents` | `DocumentIntelligencePage` | `ai.assistant.use` | Exists; missing gate |
| `knowledge` | `KnowledgePage` | `ai.assistant.use` | Exists; missing gate |
| `prompts` | `PromptLibraryPage` | `ai.assistant.use` | Exists; missing gate |
| `search` | `SmartSearchPage` | `ai.assistant.use` | Exists; missing gate |
| `modules` | `ModuleCopilotsPage` | `ai.assistant.use` + module read | Exists; missing gates |
| `usage` | `AiUsagePage` | `ai.usage.read` | Exists; missing gate |

`/app/settings/ai` is outside this child router and also session-only. The `ai_assistant` flag appears only in architecture/RC5 prose; no runtime UI gate was found.

## 6. Integrations

All 15 concrete child destinations exist under `/app/integrations`: index marketplace, `configure/:providerId`, `health`, `webhooks`, `api-keys`, `sync`, `audit`, `email`, `messaging`, `storage`, `maps`, `calendar`, `payments`, `shipping`, and `sso`.

| Route class | Expected permission | Current result |
|---|---|---|
| Marketplace/category/health | integration view | Session only |
| Configure/sync | integration manage | Session only |
| Webhooks | webhook manage | Session only |
| API keys | secret/API-key manage | Session only; especially high risk |
| Audit | integration audit view | Session only |

Provider content and settings are client-side simulations/local storage; a route gate is still required because UI presentation can expose entered secrets.

## 7. Platform, portal, and SaaS admin

| Route | Concrete children | Current | Expected | Result |
|---|---|---|---|---|
| `/app/platform/*` | index, subscription, billing, licenses, success, deployment, monitoring, backups, audit, releases, demo | Session | `platform.operations.read` plus billing/audit/admin actions | All exist; gates missing |
| `/portal/*` | index only; wildcard redirects | Session | `portal.customer_portal.read` + own/org | Exists; role and ownership missing |
| `/admin/platform/*` | index only; wildcard redirects | Session | `platform.administration.read` + global role | Exists; high-risk gate missing |

RC5 route prose can imply multiple portal/admin pages; the implementation contains one index surface for each and redirects every child. Such implied child pages are **documentation-only**, not missing route regressions.

## 8. Public/auth boundary observations

- `/login`, `/register`, `/password-reset`, public marketing routes, and `/onboarding/*` are intentionally not permission-protected.
- Onboarding is public at the React-router layer; any future privileged tenant mutation must be protected by its backend operation.
- No route is obsolete in the current RC5 matrix.
- Wildcard redirects make mistyped paths look valid at the shell level; authorization design must not use redirect behavior as evidence that a resource exists.

## 9. Route audit verdict

**Authentication coverage:** implemented for protected families.  
**Authorization coverage:** 0 protected frontend routes consume permissions.  
**RC5 mismatch:** expected permissions are target-state codes, not current controls.
