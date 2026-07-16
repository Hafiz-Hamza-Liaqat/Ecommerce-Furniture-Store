# RC5 Permission Audit

## 1. Classification rule

- **Implemented:** a `PermissionRecord` is provisioned and linked to a role.
- **Referenced legacy key:** an executable handler asks Policy for a noncanonical action key, but no mapped canonical permission record is provisioned.
- **Missing:** RC5 expects the code for an existing surface/action, but no executable consumer or seed exists.
- **Future:** intended for a presentation-only/future backend capability.
- **Deprecated:** an old code is explicitly retired. No such runtime marker exists today.

## 2. Totals

| Classification | Result |
|---|---|
| Implemented permission records | **0 found** |
| Referenced backend action strings | **105 unique** across 107 handlers |
| Missing/target frontend and cross-cutting permissions | All RC5 route/dashboard/export/configure codes |
| Future permissions | HR, manufacturing, CMS, DAM CQRS, AI provider, integrations provider, portal, SaaS control-plane actions without live backends |
| Deprecated | None formally declared |

The complete 105 current action keys are mapped contract-by-contract in `06-CQRS-Audit.md`. They are legacy runtime evidence, not valid new permission codes. They are all **Referenced**, not Implemented, because `RbacPolicyEngine` checks them but the catalog is empty.

## 3. Current executable action families

| Module | Current exact actions | Classification |
|---|---|---|
| Sales | `opportunity.*`, `quote.create/revise/read`, `order.create/cancel/read` | Referenced |
| Procurement | `supplier.*`, `requisition.create/submit/read`, `po.create/issue/cancel/read` | Referenced |
| Inventory | `inventory.item.*`, `inventory.warehouse.*`, `inventory.location.create`, `inventory.stock.*`, `inventory.ledger.read`, `inventory.batch/lot/serial.read`, `inventory.summary.read` | Referenced |
| Finance | `finance.account.*`, `finance.invoice.*`, `finance.payment.record/read`, `finance.credit.adjust/read`, `finance.ledger.create/append/read`, `finance.summary.read` | Referenced |
| CRM | `lead.*`, `contact.*`, `account.*`, `activity.log/read`, `communication.record/read`, `campaign.*`, `crm.summary.read` | Referenced |
| Projects | `project.*`, `task.*`, `milestone.*`, `resource.assign/release/read`, `team.read`, `schedule.update/read`, `work_item.read`, `project.summary.read` | Referenced |
| Service | `service_request.*`, `work_order.*`, `technician.assign/reassign`, `technician_assignment.read`, `appointment.schedule/reschedule/read`, `service.history/summary.read` | Referenced |

## 4. RC5 target permission references

| RC5 reference(s) | Classification | Reason |
|---|---|---|
| `executive.dashboard.read`, `executive.dashboard.export`, `executive.dashboard.configure` | Missing | Executive route/widgets do not consume permissions |
| `{module}.dashboard.read`, `{module}.records.export` | Missing for live modules; Future for presentation modules | Canonical target pattern |
| `{module}.{resources}.read/create/update/delete` plus approved lifecycle verbs | Missing/inconsistent | Current backends use legacy action keys; five modules omit module prefix |
| `platform.approvals.read`, `platform.approvals.claim`, `platform.approvals.approve`, `{module}.{resources}.approve` | Future/Missing | Engines exist but definitions/routes are local and no catalog exists |
| `platform.workflows.read`, `platform.workflows.transition` | Future/Missing | Workflow UI is presentation; definitions are not registered |
| `reporting.reports.read`, `reporting.reports.run`, `reporting.reports.export`, `reporting.reports.schedule` | Future/Missing | Report surfaces are client-driven; no reporting CQRS |
| `analytics.dashboards.read`, `analytics.dashboards.export`, `analytics.dashboards.configure` | Missing | Routes/builder do not consume them |
| `ai.assistant.use`, `ai.settings.manage`, `ai.usage.read` | Future | AI provider is simulated and no gate exists |
| `platform.operations.read`, `platform.health.read`, `platform.administration.read` | Missing/Future | Health probes are real/public; ops/admin data/actions are mostly fixtures |
| `portal.customer_portal.read` | Future | Portal is fixture and has no ownership enforcement |
| `dam.kyc_assets.read` | Future | No KYC field projection/API path found |
| `identity.audit_logs.read`, `identity.settings.manage` | Missing/Future | UI surfaces exist; no matching authorization consumer |
| `finance.costs.read`, `finance.bank_accounts.read`, `finance.credit_accounts.update` | Missing | No field-level projection/patch policy |
| `sales.orders.approve`, `sales.records.export` | Missing/Future | No permission consumer |
| `procurement.records.export`, `inventory.records.export`, `finance.records.export`, `crm.records.export`, `projects.records.export`, `service.records.export` | Missing/Future | No authorized export service |
| `hr.dashboard.read`, `manufacturing.dashboard.read`, `cms.dashboard.read`, `dam.dashboard.read`, `notifications.dashboard.read` | Future/Missing | Session-only presentation modules; no respective application handler set |

## 5. Invalid or mismatched examples

| Canonical permission | Current legacy executable key | Finding |
|---|---|---|
| `sales.opportunities.create` | `opportunity.create` | Requires explicit RC5.1 mapping |
| `sales.opportunities.read` | `opportunity.read` | Requires explicit RC5.1 mapping |
| `finance.invoices.read` | `finance.invoice.read` | Requires explicit RC5.1 mapping |
| `inventory.stock.adjust` | `inventory.stock.adjust` | Key already has three segments; canonical resource semantics still validated |
| Canonical `read` suffix | Current keys mostly use `read` | Compatible verb; namespace/resource normalization still required |
| Approved specific lifecycle verb | Current keys use revise, issue, cancel, archive, complete | Preserve specific verbs; do not use generic `lifecycle` |

Legacy keys are not “deprecated” until a catalog release declares them so. RC5.1 seeds canonical permission records plus an explicit mapping; it does not substitute unmatched strings or rename handlers.

## 6. Provisioning risk

The fail-closed check is `principal.permissionCodes.includes(action)`. A single character mismatch causes denial. The frozen RC5.1 design therefore requires 105 canonical backend permissions and an explicit one-to-one mapping for all 105 legacy action keys. No mapping exists before RC5.1.

## 7. Verdict

**Permission engine:** implemented.  
**Effective permission catalog:** empty.  
**Action traceability:** complete in `06-CQRS-Audit.md`.  
**RC5 catalog readiness:** partial until target UI codes and exact backend codes are separated and approved.
