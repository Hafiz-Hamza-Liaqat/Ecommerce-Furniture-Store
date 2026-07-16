# RC5 Gap Validation — Master Traceability Matrix

**Audit date:** 2026-07-17  
**Scope:** `docs/rc5/` against tracked source under `packages/`  
**Classification:** Implemented = executable control/data; Partial = model or enforcement point exists but expected scope is incomplete; Referenced = code expects the value but no catalog record exists; Documentation-only = RC5 target with no runtime implementation; Obsolete = no longer matches source.

## 1. Executive traceability

| Artifact | Documented baseline | Actual implementation | Classification | Detailed evidence |
|---|---:|---|---|---|
| HTTP routes | 18 | 18 registered routes | Implemented; upload has no Policy action | `05-API-Traceability.md` |
| CQRS contracts | 107 | 64 commands + 43 queries; every handler has `authorize()` | Implemented enforcement points; catalog absent | `06-CQRS-Audit.md` |
| Policy actions | Handler action constants | 105 unique action strings across 107 handlers | Referenced; zero permission seeds found | `09-Permission-Audit.md` |
| Roles | 37 catalog entries including guest/aliases | Role model/service/store exist; zero role definitions or seeds found | Documentation-only; `super_admin` is only a hard-coded scope bypass code | `08-Role-Audit.md` |
| Protected route families | `/app/*`, `/portal/*`, `/admin/platform/*` | Session-ID guards only | Partial: authentication, no permission guard | `02-Route-Audit.md` |
| Primary sidebar entries | 39 entries | All destinations resolve; `/app/platform` duplicated | Implemented navigation; no permission filtering | `03-Navigation-Audit.md` |
| Command entries | 39 static navigation/help/create entries plus 10 generated quick-create entries | Destinations/actions resolve | Implemented navigation; no permission filtering | `03-Navigation-Audit.md` |
| Dashboards requested by this audit | 18 named surfaces | All route surfaces exist; most KPI/administration content is fixture or local storage | Presentation/data mixed; session-only access | `04-Dashboard-Audit.md` |
| Record scopes | 10 named concepts | Company enforced; branch/org/own fields exist but application handlers populate them as `null`; workspace/department are not Policy scopes | Partial | `10-Record-Security-Audit.md` |
| Field security | 8 sensitive field families | No permission-aware DTO projection, redaction, masking, or field-write policy found | Documentation-only | `11-Field-Security-Audit.md` |

## 2. Protected route traceability

All rows below exist. `RequireAuth` guards `/app/*`; `RequireAuthElement` guards portal and SaaS admin. Neither reads roles or permissions.

| Route/family | Actual file / component | Current guard | RC5 expected authorization | Result |
|---|---|---|---|---|
| `/app` | `App.tsx` → `DashboardPage` | Session ID | `executive.dashboard.read` | Exists; permission missing |
| `/app/me` | `App.tsx` → `MyWorkspace` | Session ID | authenticated self | Exists |
| `/app/notifications` | `App.tsx` → `NotificationsCenter` | Session ID | `notifications.dashboard.read` | Exists; permission missing |
| `/app/search` | `App.tsx` → `EnterpriseSearch` | Session ID | `search.catalog.use` | Exists; permission missing |
| `/app/reporting` | `App.tsx` → `ReportingPage` | Session ID | `reporting.reports.read` | Exists; permission missing |
| `/app/workflow` | `App.tsx` → `WorkflowPage` | Session ID | `platform.workflows.read` | Exists; permission missing |
| `/app/approvals` | `App.tsx` → `ApprovalsPage` | Session ID | `platform.approvals.read` | Exists; permission missing |
| `/app/calendar` | `App.tsx` → `EnterpriseCalendar` | Session ID | authenticated staff | Exists |
| `/app/preferences` | `App.tsx` → `PreferencesCenter` | Session ID | authenticated self | Exists |
| `/app/analytics/*` | `AnalyticsCenter.tsx` | Session ID | `analytics.dashboards.read`; builder uses `analytics.dashboards.configure` | Exists; permission missing |
| `/app/reports/*` | `ReportsCenter.tsx` | Session ID | `reporting.reports.read` | Exists; permission missing |
| `/app/insights` | `App.tsx` → `InsightCenter` | Session ID | `analytics.insights.read` | Exists; permission missing |
| `/app/ai/*` | `AiRoutes.tsx` | Session ID | `ai.assistant.use`; settings separated | Exists; permission/flag missing |
| `/app/settings/ai` | `App.tsx` → `AiSettingsPage` | Session ID | `ai.settings.manage` | Exists; permission missing |
| `/app/integrations/*` | `IntegrationsRoutes.tsx` | Session ID | integration view/manage/secret permissions | Exists; permission missing |
| `/app/platform/*` | `PlatformRoutes.tsx` | Session ID | `platform.operations.read` and action-specific gates | Exists; permission missing |
| `/app/account/security` | `App.tsx` → `SecurityPage` | Session ID | authenticated self | Exists |
| `/app/account/mfa` | `App.tsx` → `MfaPage` | Session ID | authenticated self | Exists |
| `/app/account/email-verification` | `App.tsx` → `EmailVerificationPage` | Session ID | authenticated self | Exists |
| `/app/{module}/*` | `ModuleApp.tsx` for 14 registered definitions | Session ID | module dashboard/entity permissions | Exists; permission missing |
| `/portal/*` | `PortalRoutes.tsx` | Session ID | `portal.customer_portal.read` + own/org | Exists; role/scope missing |
| `/admin/platform/*` | `AdminRoutes.tsx` | Session ID | `platform.administration.read` + global role | Exists; permission missing |

Module definitions covered by `{module}` are sales, procurement, inventory, finance, projects, CRM, service, HR, manufacturing, CMS, DAM, reporting, notifications, and search. Child route templates are audited in `02-Route-Audit.md`.

## 3. API/CQRS traceability

| Transport | Handler set | Authentication | Policy | Scope result |
|---|---|---|---|---|
| `/api/v1/commands` | 64 command handlers | Required | Handler action evaluated | Company populated; owner/org/branch absent |
| `/api/v1/queries` | 43 query handlers | Required | Handler action evaluated | Company populated; owner/org/branch absent |
| `/api/v1/uploads` | Upload route | Required | **No Policy evaluation** | Explicit company match only |
| Auth routes | 10 routes | Mixed by operation | No RBAC Policy; credential/self gates | Identity/session ownership |
| Health/version/OpenAPI | 5 routes | Public | None | N/A |

The 107 contract names and action mappings are enumerated in `06-CQRS-Audit.md`; the 18 HTTP rows are enumerated in `05-API-Traceability.md`.

## 4. Traceability verdict

- No protected route, dashboard, menu, command-palette item, quick action, or breadcrumb currently consumes a role or permission.
- Backend authorization is fail-closed, but there is no role/permission catalog data to produce an allowed decision.
- The current action vocabulary must be seeded exactly before any optional normalization; changing action strings first would deny all calls.
- RC5 documents describe a valid target direction, but several statements incorrectly implied that flags, role gates, upload Policy, and field/record scope controls already existed. Corrections are recorded in `12-Documentation-Consistency.md`.
