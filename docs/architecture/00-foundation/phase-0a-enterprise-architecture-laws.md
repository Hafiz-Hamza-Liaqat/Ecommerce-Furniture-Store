# Phase 0A — Enterprise Architecture Laws

**Status:** PHASE 0A FROZEN  
**Mode:** Documentation only  
**Cross-references:** [0B Data](../01-domain/phase-0b-enterprise-data-architecture.md) · [0C Services](../01-domain/phase-0c-enterprise-domain-service-architecture.md) · [0D Integration](../02-integration/phase-0d-event-bus-integration-saga.md) · [0E Security](../03-security/phase-0e-enterprise-security-architecture.md) · [0F Observability](../04-observability/phase-0f-observability-operations.md) · [ADR Index](../decision-records/ADR-INDEX.md) · [Glossary](../glossary.md)

---

# Platform Charter

**Artisan Furnish Hub** is the company’s digital operating system: luxury storefront + verified trade + partner project network + factory-to-doorway fulfillment, with AI assistants layered on after the system of record is solid.

It is not only an ecommerce website. It unifies ERP, CRM, sales, quotation, order management, customer management, interior design, contractor/partner platforms, inventory, production, and service management.

---

# Platform Kernel Map

```text
┌──────────────────────────────────────────────────────────────────┐
│ Settings · Feature Flags · Public API Gateway · Auth / RBAC      │
└──────────────────────────────────────────────────────────────────┘
┌────────────┬────────────┬────────────┬────────────┬──────────────┐
│ DAM        │ Approval   │ Workflow   │ Rules      │ Event Bus    │
│            │ Engine     │ Engine     │ Engine     │              │
└────────────┴────────────┴────────────┴────────────┴──────────────┘
┌────────────┬────────────┬────────────┬───────────────────────────┐
│ Policy     │ Search     │ Reporting  │ Notification (via events) │
│ Engine     │ Indexes    │ Framework  │ Document Gen (R+T+DAM)    │
└────────────┴────────────┴────────────┴───────────────────────────┘
                         ▼
              Domain Modules (Commerce, ERP, CRM, …)
                         ▼
              AI Gateway (reserved modules behind flags)
```

**Rule:** Domain code emits **events**, asks **rules** for decisions, starts **workflows**, submits **approvals**, authorizes via **Policy**, stores files in **DAM**, and never invents parallel systems.

---

# Section — Architecture Laws (Non-Negotiable)

1. **No domain bypasses kernels** — email/SMS/WhatsApp only via events → notification handlers.
2. **Workflow is status SSoT** — business status is the active workflow stage (or mapped projection); apps do not maintain a competing status machine.
3. **Stock only via StockLedger** — no direct inventory field edits.
4. **Money is append-only** — payments, commission ledger, refunds never silently rewritten.
5. **Files only via DAM** — no orphan URLs as source of truth.
6. **Authorization only via Policy Engine** — RBAC data feeds policy; controllers don’t reimplement scope.
7. **Commercial calculations via Rules Engine** — no hardcoded commission/MOQ/warranty magic numbers in domain services.
8. **Human gates via Approval Engine** — one inbox pattern for all approval types.
9. **Side effects via Event Bus** — handlers idempotent; critical paths use outbox.
10. **New major capabilities behind Feature Flags.**
11. **Reports only via Reporting Framework.**
12. **Config via Settings Module** — not scattered env flags (secrets excepted, vaulted).
13. **Multi-branch by default** — location-scoped stock and fulfillment.
14. **`company_id` on tenant data** — even for single-company v1.
15. **Every phase passes the NFR quality gate.**

---

# Section A — Status Supersession (Architecture Law Clarification)

### A.1 Supersession statement

**SUPERSEDES** all earlier Phase 0A narratives that presented fixed status chains (including but not limited to: Placed → Verified → Quotation → Approved → Advance Received → Material Purchased → Production Started → Carpentry → Painting → Polishing → Quality Check → Packing → Dispatch → Out For Delivery → Installation → Completed, and equivalent repair/project/return chains) as primary business status models.

**Effective rule:**

1. Those chains are **default `WorkflowDefinition` blueprints only** (examples: `sales_order_fulfillment_v1`, `repair_service_v1`, `custom_furniture_v1`, `kitchen_cabinets_v1`, `interior_project_v1`, `warranty_claim_v1`, `return_refund_v1`, `delivery_v1`, `installation_v1`).
2. The **Workflow Engine is the single source of truth** for business status. The active stage of the relevant `WorkflowInstance` is canonical.
3. Entity fields such as `status` / `status_label` are **read-only projections** of the current workflow stage, updated only by workflow transitions.
4. Application code and APIs **must not** patch entity status independently of the Workflow Engine.
5. UI labels, filters, search facets, and notifications may use projected status values; they do not own lifecycle state.

---

# Section — Policy Engine (Separate from RBAC and Rules)

### Separation of concerns

| Engine | Question it answers | Examples |
|--------|---------------------|----------|
| **RBAC** | What roles/permissions does the principal hold? | `product.create`, `refund.approve` |
| **Policy Engine** | Is this **action on this resource in this context** allowed? | “Can Agent X view Order 99?” |
| **Rules Engine** | What **business outcome** should apply? | Commission %, MOQ, delivery fee, warranty days |
| **Approval Engine** | Does this action need **human review** before effect? | B2B approve, refund above threshold |

### Policy Engine model

- **Input:** `principal` (user, roles, scopes, org, branch) + `action` + `resource` (type, id, attributes) + `context` (time, feature flags, IP optional)
- **Output:** `Allow` | `Deny` + `reason_code` + optional `constraints`
- **Policy types:** RBAC gate · resource ownership (`own` / `assigned` / `organization` / `branch` / `company`) · attribute conditions · approval-required · feature-flag gated
- **Evaluation order:** Deny overrides → feature flag → approval-pending block → resource scope → RBAC permission
- **Enforcement:** Every API/command goes through Policy Engine
- **Audit:** Every Deny on sensitive actions logged; Allow logged for money/stock/permission changes

**0B entities:** `Policy`, `PolicyBinding`, `PolicyEvaluationLog` (optional sampling)

---

# Section G — RBAC vs Policy Engine

**RBAC** provides **permission data** (roles, permissions, assignments, scopes).

**Runtime authorization** is performed **exclusively by the Policy Engine**, which evaluates principal + action + resource + context (including RBAC data, resource ownership, feature flags, and approval state).

Dashboards and APIs must not treat the RBAC matrix as the runtime gate; the matrix is documentation and seed data for RBAC records consumed by Policy.

---

# Section — RBAC Permission Matrix (Draft)

Legend: ✔ allow · ✖ deny · ◐ own/assigned/org · △ branch-scoped

Roles: SA=Super Admin · AD=Admin · MD=Moderator · ED=Editor · CU=Customer · B2B · AG=Agent · ID=Designer · AR=Architect · CE=Civil · CO=Contractor · EM=Employee · PM=Production · WH=Warehouse · SM=Showroom · DL=Delivery · IN=Installation

| Permission | SA | AD | MD | ED | CU | B2B | AG | ID | AR | CE | CO | EM | PM | WH | SM | DL | IN |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| product.create/update | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| product.publish | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| price.edit | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| cms.edit | ✔ | ✔ | ◐ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| cms.publish | ✔ | ✔ | ✖ | ◐* | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| review.moderate | ✔ | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| ad.manage | ✔ | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| b2b.approve | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| partner.approve | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| order.view | ✔ | ✔ | ✖ | ✖ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | △ | △ | △ | ◐ | ◐ |
| refund.approve | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| po.approve | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | △ | ✖ | ✖ | ✖ |
| inventory.adjust | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | △ | △ | △ | ✖ | ✖ |
| production.manage | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | △ | ✖ | ✖ | ✖ | ✖ |
| delivery.update | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ◐ | ✖ |
| install.update | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ◐ |
| analytics.view | ✔ | ✔ | ✖ | ✖ | ✖ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ✖ | △ | △ | △ | ✖ | ✖ |
| settings.manage | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| role.grant_admin | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| user.delete_admin | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| kyc.view | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| audit.view | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |

\*Editor publish: **Approval-required** unless Settings allow direct publish (flag).

*Furniture Shop / Wholesaler inherit B2B column; tier via PriceList, not extra permission columns.*

---

# Section B — Decision Register (Expanded)

**Legend:** Approved = locked · Deferred = explicit non-decision; extensible model · Rejected = out of Phase 0A intent

| ID | Decision | Status | Documentation note |
|----|----------|--------|-------------------|
| D01 | v1 operates as a single company; schema remains multi-company-ready via `company_id` | **Approved** | |
| D02 | Tenancy = shared DB + `company_id` + Policy row filters (not schema-per-tenant in v1) | **Approved** | |
| D03 | Multi-branch / multi-location from day one | **Approved** | |
| D04 | Workflow Engine = SSoT for business status; entity status = projection | **Approved** | See Section A |
| D05 | Governance roles: Super Admin, Admin, Moderator, Editor in canonical role set | **Approved** | |
| D06 | Furniture Shop / Wholesaler = Organization types + PriceList tiers, not separate permission engines | **Approved** | |
| D07 | Payment gateways (provider selection) | **Deferred** | Provider-agnostic payment model |
| D08 | Online card checkout in MVP vs bank/advance-first | **Deferred** | Feature flag `online_payments` |
| D09 | Google AdSense | **Deferred** | Flag `adsense` default off |
| D10 | Custom in-platform ads managed by Super Admin / Admin / Moderator | **Approved** | Flag `custom_ads` |
| D11 | Loyalty program launch timing | **Deferred** | Model allowed; flag off until phase |
| D12 | Procurement (PR/PO/GRN/etc.) in domain model | **Approved** | Build phased; entities in 0B |
| D13 | Full statutory general ledger in-app | **Deferred** | Management accounting in v1 model |
| D14 | Public CMS pages (About, Help, Blog, Design Guidance, etc.) | **Approved** | Exact IA in Phase UI |
| D15 | Mobile-first priority: Delivery + Installation first | **Approved** | |
| D16 | AI modules reserved behind flags | **Approved** | Implementation deferred |
| D17 | Versioned internal API (`/api/v1`); public developer portal later | **Approved** | |
| D18 | Commission formulas (rates by role/category, clawbacks) | **Deferred** | Owned by Rules Engine; values not locked |
| D19 | Multi-partner attribution when Agent + Designer + Contractor touch one deal | **Deferred** | Attribution model extensible; rules TBD |
| D20 | Advance payment percentage before production | **Deferred** | Rules/Settings configurable; % not locked |
| D21 | Default warranty periods by category | **Deferred** | Rules/Settings; defaults TBD |
| D22 | Default language (v1 primary locale) | **Deferred** | `locale` supported; primary TBD |
| D23 | Default currency (v1) | **Deferred** | `currency_code` supported; primary TBD |
| D24 | Labor costing method (hourly rates vs flat per job) | **Deferred** | CostSheet supports either via lines |
| D25 | Help Center scope (CMS articles only vs ticketing) | **Deferred** | CMS Help approved as capability; tickets TBD |
| D26 | Offline field photo upload in v1 | **Deferred** | Online upload required; offline queue TBD |
| D27 | Required launch PDF set (which documents on day one) | **Deferred** | Generation path locked; checklist TBD |
| D28 | Exact footer link inventory | **Deferred** | Footer exists via CMS/IA; final link list in UI phase |
| D29 | Recommendation seeding (manual relations vs history-derived) | **Deferred** | `ProductRelation` supports both |
| D30 | Expense entry in-app (rent/utilities) vs external only | **Deferred** | |
| D31 | MFA required for Super Admin / Admin at launch | **Deferred** | Compatible; mandate TBD |
| D32 | Marketplace mode / franchise module | **Rejected** | Flags reserved off; not Phase 0A business scope |
| D33 | Hard-coded single-tenant queries (no `company_id`) | **Rejected** | Violates multi-company readiness |
| D34 | Parallel domain-owned status state machines alongside Workflow | **Rejected** | Superseded by Section A |
| D35 | Runtime authorization via ad-hoc controller checks bypassing Policy Engine | **Rejected** | See Section G |
| D36 | Separate RBAC roles for Carpenter / Painter / Polisher | **Rejected** | See Section F |

Also mirrored in [ADR-INDEX.md](../decision-records/ADR-INDEX.md).

---

# Section C — Reporting vs Domain Analytics

- **Domain modules** own **operational metrics** (domain events, counters, KPIs derived from their data).
- **Reporting Framework** owns **reports, exports (PDF/Excel), print layouts, scheduled reports, shareable reports, dashboard widgets, and analytical dashboards** that present or distribute those metrics.

Domains may emit metrics and register report definitions; they **must not** implement one-off export/schedule/share stacks outside the Reporting Framework.

---

# Section D — Notifications

**Notifications** are **Event Bus consumers**. Domain modules emit domain events; notification handlers subscribe to those events and render/send messages using **Settings templates** (email, SMS, WhatsApp, in-app). Domains do not send channel messages directly.

Flow:

```text
Domain Events → Event Bus → Notification Handlers → Settings Templates → Email / SMS / WhatsApp / In-app
```

---

# Section E — Document Generation

**Document generation** uses:

1. **Reporting** (document/render/export pipeline),
2. **Settings Templates** (layout and numbering configuration),
3. **DAM** (storage of generated files and related source assets).

No separate document engine is introduced.

---

# Section F — Field Trades Mapping

**Carpenter, Painter, Polisher**, and similar workshop/field trades are **not** separate RBAC roles. They are classified as **Employee** users assigned to **Team** (and optionally Branch/Location). Permissions follow the Employee (and task assignment) model; work queues use Team membership and Work Order / Production Task assignment. Runtime access is still evaluated by the **Policy Engine**.

---

# Kernel Engines (Required)

## Digital Asset Management (DAM)

Every media asset metadata: Title, Tags, Alt text, Category, Project, Product, Uploaded by, Version, Created date, Visibility (`public` | `authenticated` | `restricted` | `internal`).

Asset kinds include: Product Images, Product Videos, 360° (future), AR models (future), CAD, Sketches, Moodboards, Before/After Repair, Installation Photos, Manufacturing Photos, Certificates, Documents, KYC.

## Approval Engine

Single state machine: Draft (optional) → Submitted → Under Review → Approved | Rejected | Changes Requested → Resubmitted.

Types include: B2B/Agent/Designer/Contractor registration, Purchase Order, Product publishing, Blog/CMS publishing, Discount, Refund, Warranty claim, Credit limit change, Price list change, Ad campaign publish.

## Workflow Engine

Configurable definitions/stages/transitions/instances/assignments for Repair, Manufacturing, Interior Project, Warranty, Delivery, Installation, Custom Furniture, Returns, etc.

## Rules Engine

Configurable: Wholesale discounts, Loyalty tiers, Commissions, Delivery charges, Warranty periods, Production priorities, MOQ, Credit checks, Tax hooks, Recommendation eligibility, Refund windows.

## Feature Flags

Examples: `online_payments`, `ai_assistant`, `ar_room_preview`, `multi_language`, `franchise_module`, `marketplace_mode`, `loyalty_program`, `adsense`, `custom_ads`, voice/image search.

## Event Bus

Domain events drive inventory, invoices, commissions, notifications, analytics, audit, search indexing. See [Phase 0D](../02-integration/phase-0d-event-bus-integration-saga.md).

## Search Architecture

Separate indexes: Products, Customers, Orders, Projects, Quotes, Invoices, Employees, Suppliers, Inventory, Production Jobs, Service Requests, Blog, Portfolio, DAM, Approvals.

## Reporting Framework

Export PDF/Excel, Print, Schedule, Share, Dashboard Widget — via ReportDefinition registration.

## Settings Module

Company Profile, Branches, Business Hours, Taxes, Currencies, Units, Roles, Permissions, Themes, Email/SMS/WhatsApp/Invoice/Quote/Notification templates, Feature flags, Payment config, Ads, Backup, Logs, Numbering series.

## Public API Strategy

Versioned HTTP API boundaries (`/api/v1` logical); UI never bypasses domain services; future mobile/dealer/accounting/AI clients.

## AI Gateway Reservation

AI Gateway with AuthZ context, orchestrator, tool adapters under Policy, retrievers, suggestion store, human handoff. Modules reserved (Furniture Finder, Room Planner, Budget Planner, Material Advisor, Color Matcher, Layout Optimizer, Style Comparison, Project Cost Estimator, Maintenance Advisor, Sales/B2B/CRM Assistants, Inventory Forecasting, etc.) behind flags.

---

# User Roles (Business)

1 Customer · 2 B2B Buyer · 3 Furniture Shop · 4 Wholesaler · 5 Sales Agent · 6 Interior Designer · 7 Architect · 8 Civil Engineer · 9 Contractor · 10 Company Employee · 11 Production Manager · 12 Warehouse Manager · 13 Showroom Manager · 14 Delivery Team · 15 Installation Team · 16 Admin · 17 Super Admin  

Plus governance: Moderator, Editor (D05).

---

# Enterprise Modules (In Scope for Model)

Procurement & Purchasing · Manufacturing Costing · Production Scheduling · Customer After-Sales · Loyalty (deferred launch) · Smart Recommendation Engine (rules-first) · Quality Assurance · Business Documents · Financial Dashboard (management accounting) · Mobile-First Staff Experience · CMS · SEO · Multi-branch · Analytics domains as metrics (Reporting presents).

---

# NFR Quality Gate (Every Implementation Phase)

No TypeScript errors · No ESLint errors · Responsive design · Accessibility (WCAG-oriented) · Performance targets · Role-based authorization via Policy · Input validation · Secure API design · Loading/Error/Empty states · Confirmation dialogs · Audit logging where applicable · Consistent design system · Mobile compatibility · Reusable components · Unit/integration testing where appropriate.

---

# Company vs Multi-Company Strategy

| Horizon | Strategy |
|---------|----------|
| **v1** | One real company; every tenant row still has `company_id` |
| **Isolation** | Shared database; Policy Engine enforces company boundary |
| **Future SaaS** | Same schema; onboard companies as rows; flags for franchise/marketplace later |
| **Forbidden in v1** | Hard-coded single-tenant assumptions |

---

# PII / KYC Security Requirements (Summary)

Classification: PII, KYC, secrets. KYC in DAM `visibility=restricted`; encrypted at rest; `kyc.view` + Policy; TLS; retention configurable; no raw CNIC in logs; signed URLs short TTL. Full detail: [Phase 0E](../03-security/phase-0e-enterprise-security-architecture.md).

---

# Observability Baseline (Summary)

Correlation IDs; structured logs with PII redaction; metrics; tracing on critical paths; audit distinct from debug logs; alerts. Full detail: [Phase 0F](../04-observability/phase-0f-observability-operations.md).

---

**PHASE 0A FROZEN**
