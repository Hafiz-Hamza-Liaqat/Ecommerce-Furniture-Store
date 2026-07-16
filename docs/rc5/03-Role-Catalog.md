# RC5 — Role Catalog

**Reuse:** `RoleRecord`, `PermissionRecord`, `UserRoleRecord`, `RoleScopeType`, `RbacService`, Policy Engine hierarchy (`parentRoleId`).  
**Law:** Roles are RBAC data. Runtime decisions are Policy-only.

> **Baseline correction (2026-07-17):** Infrastructure exists; **0 of these roles are seeded**. `super_admin` is recognized by current Policy, but its permitted bypass is limited by `13-Authorization-Governance-Specification.md`. Existing `PartnerType` also includes `agent` (not listed below — decide attribute-only vs role in RC8). `vendor` is an alias of `supplier`. `guest` is a public state, not an authenticated assignment. Multiple active assignments contribute permissions only when their own scopes apply; they never bypass an explicit deny.

---

## 1. Scope types (existing)

| Scope | Meaning | Evidence |
|---|---|---|
| `global` | Platform / break-glass only | `RoleScopeType` |
| `company` | Tenant (`company_id`) | Mandatory isolation (D02) |
| `branch` | Operational site | 0E scopes |
| `organization` | B2B / partner firm | Org members |
| `own` | Self-owned / explicitly assigned | ◐ in 0A matrix |

---

## 2. System roles

### Governance

| Role code | Display | Inherits | Responsibilities | MFA expectation |
|---|---|---|---|---|
| `super_admin` | Super Admin | — (root) | Break-glass; grant Admin; security settings; `identity.roles.assign`; cross-cutting audit | Required |
| `platform_admin` | Platform Admin | subset of ops permissions | SaaS ops shell (`/admin/platform`); tenants/plans **when live**; not day-to-day company ERP | Required |
| `company_owner` | Company Owner | `admin` + owner scopes | Company lifecycle, billing contact, top-level settings | Required |
| `admin` | Admin / Company Admin | governance pack below Super Admin | Most settings, user ops, approvals configuration (not grant Super Admin) | Required |
| `moderator` | Moderator | editor + moderation | Reviews, ads, content moderation | Step-up for sensitive |
| `editor` | Editor | content edit pack | CMS/content edit; publish may require Approval | Optional |
| `auditor` | Auditor | read packs | `identity.audit_logs.read`, read-only financial/ops evidence | Required |
| `approver` | Approver | approval act permissions | Claim/decide Approval tasks within configured types | Step-up for money |
| `read_only` | Read-only User | view-only permissions | Dashboards/lists without mutate | Optional |
| `guest` | Guest | none / public | Unauthenticated public site only; no `/app` | N/A |

### Executive & management

| Role code | Display | Inherits | Responsibilities |
|---|---|---|---|
| `executive` | Executive | analytics + cross-module view | Executive dashboard, company KPIs, limited mutate |
| `finance_manager` | Finance Manager | finance CRUD + approve thresholds | Accounts, invoices, payments, credit, exports |
| `hr_manager` | HR Manager | hr module + PII controls | Employees, attendance, teams (when APIs exist) |
| `procurement_manager` | Procurement Manager | procurement + `procurement.purchase_orders.approve` | Suppliers, PR, PO, receive coordination |
| `warehouse_manager` | Warehouse Manager | inventory branch/location | Stock, transfers, adjustments, warehouses |
| `manufacturing_manager` | Manufacturing Manager | `manufacturing.production.manage` | MO, BOM, scheduling UI (presentation until RC7/RC12) |
| `sales_manager` | Sales Manager | sales + discount approve | Pipeline, quotes, orders, territories |
| `sales_representative` | Sales Representative | sales ◐ | Own opportunities/quotes/orders |
| `service_manager` | Service Manager | service module | Tickets, work orders, technicians |
| `customer_support` | Customer Support | service + limited CRM view | Tickets, customer communications (no KYC/finance write) |

### Professional / partner (identity attributes + roles)

Partner types already exist (`PartnerType` in identity models). Roles bind permissions; partner type supplies Policy attributes.

| Role code | Display | Maps to | Scope pattern |
|---|---|---|---|
| `architect` | Architect | `partner_type=architect` | project / assigned |
| `interior_designer` | Interior Designer | `partner_type=interior_designer` | project / assigned |
| `civil_engineer` | Civil Engineer | `partner_type=civil_engineer` | project / assigned |
| `dealer` | Dealer / Furniture Shop | org `furniture_shop` / wholesaler | organization |
| `manufacturer_partner` | Manufacturer (external) | future org/partner mapping (RC8; may need ADR if new type) | organization / awarded work |
| `supplier` | Supplier | procurement supplier principal (RC8 portal) | organization / PO-scoped |
| `vendor` | Vendor | alias of supplier unless ADR splits | organization |
| `customer` | Customer | Customer identity | own |
| `corporate_buyer` | Corporate Buyer | org `b2b_buyer` | organization |
| `contractor` | Contractor | `partner_type=contractor` / org `contractor_firm` | project / assigned |
| `consultant` | Consultant | **gap:** not in PartnerType — map via ADR or `organizations.type=other` + custom role in RC8 | engagement |

### Operational staff (not trade-named roles)

| Role code | Display | Notes |
|---|---|---|
| `employee` | Employee | Base staff; teams carry trade |
| `production_staff` | Production | PM column in 0A |
| `warehouse_staff` | Warehouse | WH column |
| `showroom_staff` | Showroom | SM column |
| `delivery_staff` | Delivery | DL ◐ |
| `installation_staff` | Installation | IN ◐ |

---

## 3. Permission hierarchy principles

1. **Deny by default.**
2. **Super Admin** is not grantable by Admin (`identity.roles.assign` for the `super_admin` target is Super-Admin-only). Super Admin is a scope shortcut after permission and company checks, not a universal bypass (`13`).
3. **Inheritance** uses single-parent `parentRoleId` on `RoleRecord` (already implemented).
4. **Scope intent:** company ⊃ branch ⊃ location/project ⊃ own. Current Policy unions permissions across assignments and can satisfy scope from a different assignment; least-privilege seeds must not rely on that widening. Binding permission to the contributing assignment’s scope is an RC5.5 hardening target.
5. **Partner/org roles** never receive company-wide finance/HR/KYC unless explicitly assigned and audited.
6. **Presentation-only modules** still get `*.dashboard.read` permissions so UI can be gated later; live data arrives in RC7+.

---

## 4. Permission code naming

Canonical pattern: `<module>.<resource>.<action>`. The grammar, approved verbs, reserved prefixes, wildcard prohibition, invalid examples, and legacy mapping rules are normative in `13-Authorization-Governance-Specification.md`.

Examples (non-exhaustive; full module mapping in `02-Authorization-Matrix.md`):

- `executive.dashboard.read`
- `sales.opportunities.create` / `sales.opportunities.read` / `sales.opportunities.update`
- `finance.invoices.read` / `finance.invoices.create` / `finance.invoices.export`
- `analytics.dashboards.read` / `analytics.dashboards.export` / `analytics.dashboards.configure`
- `reporting.reports.read` / `reporting.reports.export` / `reporting.reports.schedule`
- `platform.approvals.claim` / `platform.approvals.approve`
- `platform.workflows.read` / `platform.workflows.transition`
- `ai.assistant.use` / `ai.settings.manage`
- `platform.operations.read` / `portal.customer_portal.read`
- `dam.kyc_assets.read` / `identity.audit_logs.read` / `identity.settings.manage`

Current handler strings such as `opportunity.create` are legacy executable action keys, not valid new permission codes.

---

## 5. Intended responsibilities (summary)

| Layer | Who | Does |
|---|---|---|
| Platform | Super Admin, Platform Admin | Control plane, break-glass, SaaS admin shell |
| Company | Owner, Admin, Executive | Tenant configuration and oversight |
| Domain managers | Finance/HR/Procurement/Warehouse/Mfg/Sales/Service | Module CRUD + approvals within thresholds |
| Operators | Reps, support, warehouse/production staff | Assigned/own work |
| Partners | Architect, Designer, Civil, Contractor, Dealer… | Project/org scoped collaboration (RC8 UX) |
| Customer | Customer, Corporate Buyer | Own/org commerce & service |
| Oversight | Auditor, Approver, Read-only | Compliance and maker-checker |

---

## 6. Gaps (identify, do not invent engines)

| Gap | Disposition |
|---|---|
| Consultant not in PartnerType | Document for RC8 + ADR if needed |
| External manufacturer partner type | Prefer org relationship; ADR if new principal type |
| Supplier-facing principal | Not same as internal supplier master data entity |
| Seed of 105 canonical backend permissions + legacy mappings + 33 system roles | RC5.1 deliverable using existing RbacService; route/dashboard/field permissions may be inactive catalog entries only |

---

## 7. Seed classes and statistics

| Metric | Count / rule |
|---|---|
| Named rows in this catalog | 37 |
| Initial immutable system role records | 33 |
| Governance roles seeded | 9 (`guest` excluded) |
| Executive/management roles seeded | 10 |
| Professional/partner roles seeded | 8 |
| Operational roles seeded | 6 |
| Public state | 1 (`guest`; never a role assignment) |
| Alias | 1 (`vendor` resolves to `supplier`; no separate seed) |
| Deferred to RC8 | 2 (`manufacturer_partner`, `consultant`) |
| Tenant custom roles | Unbounded; company-scoped and tenant-owned |

System role codes and security purpose are immutable. Tenant custom roles may compose available canonical permissions but cannot mutate system roles or grant global/platform scope. Versioned, idempotent seed evolution, deprecation, rename, removal, and rollback rules are normative in `13`.

---

## 8. Mapping to Phase 0A columns

| 0A column | RC5 role codes |
|---|---|
| SA | `super_admin` |
| AD | `admin`, `company_owner` |
| MD | `moderator` |
| ED | `editor` |
| CU | `customer` |
| B2B | `corporate_buyer`, `dealer` (org tier) |
| AG | sales agent → `sales_representative` or dedicated `agent` if seeded |
| ID/AR/CE/CO | `interior_designer`, `architect`, `civil_engineer`, `contractor` |
| EM/PM/WH/SM/DL/IN | employee + operational roles |
