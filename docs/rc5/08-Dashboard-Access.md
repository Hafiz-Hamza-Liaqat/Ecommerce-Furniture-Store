# RC5 — Dashboard Access

**Inventory baseline:** 23 conservative dashboards (`docs/productization/04-dashboard-inventory.md`).  
**Target rule:** Opening a dashboard requires view permission; data still Policy-filtered per query.

> **Audit correction (2026-07-17):** Current access for every dashboard route is **session-only**. The matrix below is target-state. Six executive/module summary queries are real CQRS; most KPI/admin/AI/integration/portal content is fixture or local storage. “23” is an inventory convention with overlapping surfaces (for example `/app/reporting` vs `/app/reports`). See `docs/rc5/audit/04-Dashboard-Audit.md`.

Legend: ✔ allow · ◐ scoped · ✖ deny

---

## Access dimensions

| Dimension | Permission pattern |
|---|---|
| Open | `{module}.dashboard.read` / `analytics.dashboards.read` |
| Export | `{module}.dashboard.export` / `analytics.dashboards.export` / `reporting.reports.export` |
| Approve | From dashboard links to Approvals — needs explicit `platform.approvals.read` and resource approval permission |
| Configure widgets | `analytics.dashboards.configure` / `executive.dashboard.configure` |
| View analytics | `analytics.dashboards.read` |

---

## Matrix

| Dashboard | Open | Export | Approve | Configure widgets | View analytics |
|---|---|---|---|---|---|
| Executive `/app` | executive, admin, owner | executive, admin | link only if `platform.approvals.read` | admin, executive | ✔ if `analytics.dashboards.read` |
| Sales module | sales_manager; rep ◐ | sales_manager+ | discount approvals | admin | sales KPIs |
| Procurement | procurement_manager, admin | manager+ | `procurement.purchase_orders.approve` | admin | ✔ |
| Inventory | warehouse_manager, admin | manager+ | adjust approvals | admin | ✔ |
| Finance | finance_manager, admin, auditor(read) | finance, auditor | payment/refund | admin | ✔ |
| Projects | project roles + partners ◐ | manager+ | milestone | admin | ✔ |
| CRM | sales/CRM roles | manager+ | campaign | admin | ✔ |
| Service | service_manager, support | manager+ | warranty | admin | ✔ |
| HR (P) | hr_manager, admin | hr only | HR approvals | admin | limited |
| Manufacturing (P) | mfg_manager, admin | manager+ | release | admin | limited |
| CMS (P) | editor, moderator, admin | limited | publish | admin | limited |
| DAM | editor, admin, managers | under Policy | media publish | admin | storage |
| Notifications (P) | admin | admin | mass-send | admin | ✖ |
| Search (P) | authenticated staff | ✖ | ✖ | ✖ | ✖ |
| Reporting (P) | `reporting.reports.read` roles | `reporting.reports.export` | ✖ | admin | via reports |
| Analytics Center | `analytics.dashboards.read` | `analytics.dashboards.export` | ✖ | `analytics.dashboards.configure` | ✔ |
| Reports Center | `reporting.reports.read` | `reporting.reports.export` | ✖ | `reporting.reports.schedule` | ✔ |
| Insights | `analytics.insights.read` | limited | ✖ | ✖ | ✔ |
| Platform overview | `platform.operations.read` | ✖ | ✖ | admin | ✖ |
| Platform deployment | `platform.health.read` | ✖ | ✖ | ✖ | health only |
| Platform monitoring (P) | `platform.operations.read` | ✖ | ✖ | ✖ | fixture |
| Admin platform | `platform.administration.read` | ✖ | ✖ | ✖ | fixture |
| AI usage (P) | `ai.usage.read` | ✖ | ✖ | `ai.settings.manage` | local only |

---

## Role summary

| Role | Typical dashboards |
|---|---|
| Super Admin / Platform Admin | Platform control plane; break-glass remains Policy-evaluated and does not imply company ERP access |
| Company Owner / Admin | Executive + all company modules |
| Executive | Executive, analytics, summaries |
| Domain managers | Own module + related analytics |
| Reps / support / staff | Own module ◐; no executive configure |
| Auditor | Finance/audit read; export audited |
| Partners | Project dashboards ◐ only (RC8) |
| Customer | Portal only — not ERP dashboards |
| Guest | None |

---

## Export rules

1. Exports are **permissions**, not implied by view.  
2. Finance/HR/PII exports require enhanced audit.  
3. Presentation export toasts today are **not** real exports — still gate the button.  
4. Real export engines arrive with Reporting completion (RC7/RC14); permission codes stay stable.

---

## Configure widgets

| Who | What |
|---|---|
| `analytics.dashboards.configure` | Builder layouts, saved views |
| `executive.dashboard.configure` | Executive widget layout (local today) |
| Others | Consume shared layouts only |

LocalStorage layouts are not multi-user security; server-saved layouts later must carry ACL.

---

## Approve from dashboard

Dashboards may deep-link to `/app/approvals`. Approving requires Approval permissions and (RC6) real engine binding. RC5 only ensures the link is visible to `approver` / managers.
