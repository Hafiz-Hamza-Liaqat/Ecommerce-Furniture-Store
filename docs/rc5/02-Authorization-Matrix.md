# RC5 — Module Authorization Matrix

**Rule:** Permissions are canonical `<module>.<resource>.<action>` RBAC data defined by `13-Authorization-Governance-Specification.md`. Enforcement is Policy (`principal`, `action`, `resource`, `context`).  
**UI:** May hide/disable controls; never authorize.  
**Legend:** ✔ required allow · ◐ own/assigned/org/project · △ branch/location · ✖ deny · P = presentation-only module (gate shell; live data later)

> **Compatibility note (2026-07-17):** Codes in this matrix are canonical permissions. Current noncanonical handler strings are legacy executable action keys, enumerated in `audit/06-CQRS-Audit.md`, and require the explicit RC5.1 mapping specified in `13`. Zero permission records are seeded today.

---

## Shared permission families

| Family | Codes (pattern) |
|---|---|
| Dashboard | `{module}.dashboard.read` |
| CRUD | `{module}.{resources}.read\|create\|update\|delete` |
| Lifecycle | `{module}.{resources}.transition` or the approved specific lifecycle verb |
| Approval | `{module}.{resources}.approve` plus `platform.approvals.approve` when acting on an Approval task |
| Export | `{module}.records.export` / `reporting.reports.export` |
| Report | `reporting.reports.read` / `reporting.reports.run` |
| Analytics | `analytics.dashboards.read` / `analytics.dashboards.export` / `analytics.dashboards.configure` |

---

## Executive

| Concern | Roles (primary) | Permissions |
|---|---|---|
| Required roles | `executive`, `admin`, `company_owner`, `super_admin` | |
| Dashboard | Executive open | `executive.dashboard.read` |
| CRUD | N/A (aggregates) | — |
| Approval | View pending only | `platform.approvals.read` |
| Export | Executive/Admin | `executive.dashboard.export` |
| Report | Link to reports | `reporting.reports.read` |
| Analytics | Company summaries | `analytics.dashboards.read` |

Live summaries already call six Get*Summary queries — Policy must allow those query actions for the principal’s company.

---

## Sales

| Concern | Detail |
|---|---|
| Roles | `sales_manager`, `sales_representative`, `admin`, `executive` (view) |
| Dashboard | `sales.dashboard.read` |
| CRUD | opportunity/quote/order: manager ✔; rep ◐; customer ✖ on internal ERP |
| Approval | Discount/price exceptions → Approval types; `sales.orders.approve` / `platform.approvals.approve` |
| Export | `sales.records.export` (manager+) |
| Report/Analytics | `reporting.reports.read` sales domain; `analytics.dashboards.read` ◐ for reps |

**API-bound entities today:** opportunities, quotes, orders (see productization/API audits).

---

## Procurement

| Concern | Detail |
|---|---|
| Roles | `procurement_manager`, `admin`, `warehouse_manager` (receive-related view) |
| Dashboard | `procurement.dashboard.read` |
| CRUD | supplier/PR/PO create-update; warehouse △ on receipts |
| Approval | `procurement.purchase_orders.approve`, PR submit gates |
| Export | `procurement.records.export` |
| Analytics | `analytics.dashboards.read` procurement summary |

---

## Inventory

| Concern | Detail |
|---|---|
| Roles | `warehouse_manager`, `warehouse_staff`, `admin`, `procurement_manager` (read) |
| Dashboard | `inventory.dashboard.read` |
| CRUD | items/warehouses/stock ops; adjust = △ manager |
| Approval | Large adjustments may require Approval |
| Export | `inventory.records.export` |
| Analytics | stock health KPIs |

---

## Finance

| Concern | Detail |
|---|---|
| Roles | `finance_manager`, `admin`, `auditor` (read), `executive` (summary) |
| Dashboard | `finance.dashboard.read` |
| CRUD | accounts/invoices/payments/ledger — finance only |
| Approval | refund/credit/payment exceptions |
| Export | `finance.records.export` (audited) |
| Analytics | financial summary; auditor read-only |

**Field-level:** amounts, bank refs, credit limits — see `07-Field-Level-Security.md`.

---

## CRM

| Concern | Detail |
|---|---|
| Roles | `sales_manager`, `sales_representative`, `customer_support`, `admin` |
| Dashboard | `crm.dashboard.read` |
| CRUD | leads/contacts/accounts/campaigns; support limited |
| Approval | campaign spend thresholds |
| Export | `crm.records.export` (PII-aware) |
| Analytics | funnel KPIs |

---

## Projects

| Concern | Detail |
|---|---|
| Roles | `admin`, project managers (employee+assignment), partners ◐ (`architect`, `interior_designer`, `civil_engineer`, `contractor`) |
| Dashboard | `projects.dashboard.read` |
| CRUD | project/task/milestone; partners project-scoped |
| Approval | milestone/sign-off |
| Export | `projects.records.export` |
| Analytics | project health |

---

## Service

| Concern | Detail |
|---|---|
| Roles | `service_manager`, `customer_support`, technicians (employee+assignment), `customer` portal later |
| Dashboard | `service.dashboard.read` |
| CRUD | requests/work orders/appointments |
| Approval | warranty exceptions |
| Export | `service.records.export` |
| Analytics | SLA KPIs |

---

## HR (P)

| Concern | Detail |
|---|---|
| Roles | `hr_manager`, `admin`, `auditor` (limited) |
| Dashboard | `hr.dashboard.read` |
| CRUD | employees/attendance — HR only; no sales/finance bleed |
| Approval | hiring/termination sensitive |
| Export | `hr.records.export` (restricted) |
| Analytics | workforce KPIs (fixture until handlers) |

---

## Manufacturing (P)

| Concern | Detail |
|---|---|
| Roles | `manufacturing_manager`, `production_staff`, `admin` |
| Dashboard | `manufacturing.dashboard.read` |
| CRUD | MO/BOM presentation until RC7/RC12 |
| Approval | release to production |
| Export | `manufacturing.records.export` |
| Analytics | OEE placeholders gated |

---

## CMS (P)

| Concern | Detail |
|---|---|
| Roles | `editor`, `moderator`, `admin` |
| Dashboard | `cms.dashboard.read` |
| CRUD | `cms.content.update`; publish Approval-gated (`cms.content.publish`) |
| Approval | blog/page publish |
| Export | limited |
| Analytics | content metrics (future) |

---

## DAM

| Concern | Detail |
|---|---|
| Roles | `editor`, `admin`, domain managers for module assets; `dam.kyc_assets.read` for restricted |
| Dashboard | `dam.dashboard.read` |
| CRUD | metadata upload live; binary storage gap (RC7) |
| Approval | public publish of media |
| Export | download under Policy |
| Analytics | storage usage (platform) |

---

## Notifications (P)

| Concern | Detail |
|---|---|
| Roles | `admin`, module managers (template view) |
| Dashboard | `notifications.dashboard.read` |
| CRUD | template/config — admin |
| Approval | mass-send |
| Export | delivery logs (audited) |

---

## Reporting (P) / Search (P)

| Module | Roles | Key permissions |
|---|---|---|
| Reporting | `executive`, managers, `auditor`, `admin` | `reporting.reports.read`, `reporting.reports.run`, `reporting.reports.export`, `reporting.reports.schedule` |
| Search | authenticated staff | `search.catalog.use`; results still Policy-filtered per hit type |

---

## Analytics

| Concern | Detail |
|---|---|
| Roles | `executive`, domain managers (◐), `admin`, `auditor` |
| Dashboard | `analytics.dashboards.read` |
| Configure widgets | `analytics.dashboards.configure` (admin/executive) |
| Export | `analytics.dashboards.export` |
| Forecasting | deny until RC14 (`FORECAST` unavailable) |

---

## AI (presentation shell)

| Concern | Detail |
|---|---|
| Roles | feature flag `ai_assistant` + `ai.assistant.use` |
| Settings | `ai.settings.manage` (admin) |
| Data rule | AI must not bypass Policy; no stock/money mutation from AI in RC5 |
| Export/usage | `ai.usage.read` |

---

## Platform / Admin / Onboarding

| Surface | Roles | Permissions |
|---|---|---|
| `/app/platform/*` | `admin`, `company_owner`, `platform_admin` | `platform.operations.read` (+ billing when live) |
| `/admin/platform` | `platform_admin`, `super_admin` | `platform.administration.read` |
| `/onboarding` | authenticated or invited user | `identity.onboarding.execute` (local draft today) |
| Deployment health | `admin`, `platform_admin` | `platform.health.read` |

---

## Portal

| Surface | Roles | Permissions |
|---|---|---|
| `/portal` | `customer`, `corporate_buyer` (org) | `portal.customer_portal.read` |
| Data | Fixture today | Still require role gate; no cross-tenant |

Professional portals (RC8) reuse partner roles from `03-Role-Catalog.md`.

---

## Workflow / Approvals operator pages

| Surface | Roles | Permissions |
|---|---|---|
| `/app/workflow` | `admin`, `approver`, domain managers | `platform.workflows.read` |
| `/app/approvals` | `approver`, managers | `platform.approvals.read`, `platform.approvals.claim`, `platform.approvals.approve` |

**Note:** RC5 authorizes access. RC6 binds real engine data.

---

## Cross-cutting denials

| Action | Denied for |
|---|---|
| `dam.kyc_assets.read` | All except Super Admin/Admin (and designated compliance) |
| `identity.roles.assign` for `super_admin` | Everyone except Super Admin |
| Finance write | Non-finance roles |
| HR PII export | Non-HR / non-auditor |
| Platform admin | Company staff without platform role |
| Cross-company any | All principals (Policy company scope) |
