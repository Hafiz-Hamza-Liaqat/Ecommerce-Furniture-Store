# RC5 Dashboard Audit

**Access truth:** every dashboard below is currently session-only. “Required” permissions are RC5 target-state values and do not exist as seeded records.

## 1. Requested dashboard matrix

| Dashboard | Route / component | Expected role / permission | Data truth | Trace result |
|---|---|---|---|---|
| Executive | `/app` / `DashboardPage` | executive/admin/owner; `executive.dashboard.read` | Six real CQRS summary queries; remaining KPIs/charts/tasks/cards are fixtures; layout/preferences local storage | Mixed real/presentation; no gate |
| Sales | `/app/sales` / `ModuleApp` | sales manager/rep; `sales.dashboard.read` target | No module summary query; entity operations can use 6 commands + 4 queries; local-storage records and fixture KPIs remain | Mixed; no gate |
| Procurement | `/app/procurement` / `ModuleApp` | procurement manager; `procurement.dashboard.read` | Real `GetProcurementSummary`, 7 commands + 4 queries; fixture KPIs/local records | Mixed; no gate |
| Inventory | `/app/inventory` / `ModuleApp` | warehouse manager/staff; `inventory.dashboard.read` | Real `GetInventorySummary`, 9 commands + 8 queries; fixture KPIs/local records | Mixed; no gate |
| Finance | `/app/finance` / `ModuleApp` | finance manager; `finance.dashboard.read` | Real `GetFinancialSummary`, 8 commands + 6 queries; fixture KPIs/local records | Mixed; no gate or field security |
| CRM | `/app/crm` / `ModuleApp` | sales/customer support; `crm.dashboard.read` | Real `GetCrmSummary`, 12 commands + 7 queries; fixture KPIs/local records | Mixed; no gate |
| Projects | `/app/projects` / `ModuleApp` | project-assigned staff/managers; `projects.dashboard.read` | Real `GetProjectSummary`, 12 commands + 8 queries; fixture KPIs/local records | Mixed; no project scope |
| Service | `/app/service` / `ModuleApp` | service manager/support/assigned tech; `service.dashboard.read` | Real `GetServiceSummary`, 10 commands + 6 queries; fixture KPIs/local records | Mixed; no assignment scope |
| HR | `/app/hr` / `ModuleApp` | HR manager; `hr.dashboard.read` | Static module definitions and browser local storage; no registered CQRS contracts/API | Presentation/local only; no PII gate |
| Manufacturing | `/app/manufacturing` / `ModuleApp` | manufacturing manager/staff; `manufacturing.dashboard.read` | Static definitions and local storage; no registered CQRS contracts/API | Presentation/local only |
| CMS | `/app/cms` / `ModuleApp` | editor/moderator/admin; `cms.dashboard.read` | Static definitions and local storage; domain/persistence code is not exposed through registered CQRS | Presentation/local only |
| DAM | `/app/dam` / `ModuleApp` | content/asset users; `dam.dashboard.read` | Static definitions/local storage; generic upload API exists but module records do not use a DAM CQRS application | Presentation/local plus ungoverned upload seam |
| Reporting | `/app/reporting` / `ModuleApp` and `/app/reports` / `ReportsCenter` | managers/auditor; `reporting.reports.read` | Module fixtures/local storage; reports center uses client definitions and available summary-query adapters | Presentation/mixed; duplicated concepts, not duplicate routes |
| Analytics | `/app/analytics/*` / `AnalyticsCenter` | executive/managers; `analytics.dashboards.read` / `analytics.dashboards.configure` | Static analytics packs; module summary CQRS where configured; layouts/saved state local | Mixed; builder ungated |
| AI | `/app/ai/*` / `AiRoutes` | flagged users; `ai.assistant.use` | Simulated provider responses and local state; no external model API | Presentation-only; no flag/permission gate |
| Integrations | `/app/integrations/*` / `IntegrationsRoutes` | admin/integration operator | Catalog fixtures and local storage simulations; no provider backend | Presentation-only; secrets screens ungated |
| Platform | `/app/platform/*` / `PlatformRoutes` | company/platform admins; `platform.operations.read` | Real public `/health/*` probes on deployment; other billing/monitoring/backup/release/demo data is fixture/local storage | Mixed; sensitive control-plane shell ungated |
| Portal | `/portal` / `PortalHome` | customer/corporate buyer; `portal.customer_portal.read` | Fixture customer/orders/invoices/projects/service content | Presentation-only; no customer/org ownership gate |

## 2. Real backend summary coverage

The executive dashboard calls six implemented query contracts:

`procurement.GetProcurementSummary`, `inventory.GetInventorySummary`, `finance.GetFinancialSummary`, `crm.GetCrmSummary`, `projects.GetProjectSummary`, and `service.GetServiceSummary`.

The corresponding six module dashboards also declare these summary query types. Sales has only `GetCustomerSalesSummary`, which needs a customer identifier and is not a company-wide dashboard summary.

All real calls pass through authenticated `/api/v1/queries` and handler Policy. Because no role/permission data is seeded, a normal user cannot currently receive an allowed Policy decision without out-of-band RBAC setup.

## 3. Dashboard actions

| Capability | Current implementation | RC5 gap |
|---|---|---|
| Open | Session guard | Dashboard permission absent |
| Export | Client presentation on report/analytics surfaces | Export permission/audit absent |
| Approve | Links/local approvals UI | Approval permission and live approval definitions absent |
| Configure widgets | Browser-local layout/state | Configure permission absent |
| View analytics | Session-only routes | Analytics and underlying module permissions absent |
| Sensitive KPI fields | Rendered to any authenticated route user when present | Field-level projection/redaction absent |

## 4. Documentation discrepancies

1. `docs/rc5/08-Dashboard-Access.md` is a **target access matrix**, not current access.
2. “23 conservative dashboards” is a productization inventory convention, not 23 independent authorization boundaries; route surfaces overlap (for example reporting module versus reports center).
3. AI usage, integration health, platform monitoring, admin, and portal surfaces are mostly presentation/fixture views.
4. Live summary availability does not make the surrounding KPI cards live.
5. A role-gated fixture screen still needs a gate, but it does not establish server-side data authorization.

## 5. Dashboard verdict

**Route existence:** 18/18 requested dashboard surfaces represented.  
**Permission-gated access:** 0/18.  
**Fully real authoritative data:** 0/18; seven surfaces have at least one real query/probe path.
