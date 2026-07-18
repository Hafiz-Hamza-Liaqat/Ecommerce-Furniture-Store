# RC7.0 — Version 1.0 Scope Freeze

- **Version:** 1.0
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Status:** FROZEN for planning (approved for RC7.0 commit)
- **Evidence basis:** Roadmap §RC7; feature-gap matrix; RC2 backend matrix; registered CQRS in seven `*-application` packages; manufacturing/HR/CMS domain foundations; ADRs D04, D43, D45–D55.

## Authority

**This document is the single source of truth for RC7 V1 scope.**

No RC7 engineering slice may expand **Included** scope without an approved amendment to this document. Any entity or capability not listed as **Included** is out of RC7 engineering until that amendment is reviewed and accepted. Slice roadmaps and implementation plans are subordinate to this **V1 freeze**.

Future amendments to this freeze must reference the approving ADR or planning review.

## How to read this freeze

| Column | Meaning |
|---|---|
| **Included** | Must be delivered (or completed) within RC7 for V1 |
| **Excluded** | Must not be built in RC7 |
| **Deferred** | Known need; scheduled to a named later RC7 slice or later release — not in early `List*` work |
| **Future phase** | Outside RC7 / later productization RCs |

**Production profile rule:** Included list surfaces must not use fixture fallback in the **Production profile** after RC7.3.

**Demo/Test profile rule:** Fixtures remain allowed only in the **Demo/Test profile**.

**Entity rule:** UI may expose more catalogue entities than V1; those remain presentation-only until promoted into this freeze via amendment (**Included** / **Excluded** / **Deferred** / **Future**).

---

## Cross-cutting (all modules)

### Included

- Shared `List*` contracts (RC7.1): page and/or cursor, sort, filter, search, **Policy row filtering** (after repository page), total-count semantics (ADR D46).
- AuthorizationSpec on every new command/query; Policy Engine sole authorizer.
- Company (and branch where applicable) isolation on reads/writes.
- Optimistic concurrency on versioned aggregates where stores already support `expectedVersion`. Version conflicts must **fail closed** and never silently overwrite state.
- Security/domain audit on deny/allow and mutating paths per RC5.9 / existing audit pipeline.
- Workflow integration where lifecycle already uses Workflow (status remains projection — D04/D54).
- Production de-fixturing for Included list entities (RC7.3).
- Migration, seed, reconciliation, data-quality acceptance for Included data (late RC7).

### Excluded

- New authorization framework; SQL RLS as second authz layer.
- Engine ownership changes (Workflow / Approval / Policy / Rules).
- Professional portals (RC8), AI providers (RC9), calculators (RC10), full commerce (RC11), full MES (RC12), CX journeys (RC13), Analytics 2.0/forecasting (RC14), launch certification (RC15).
- Presenting browser-local notes/attachments/import toasts as production without RC7.6/RC7.7.

### Deferred (within or after RC7)

- Collaboration (notes/comments/activity) → RC7.6 only for Included entities.
- Attachments → RC7.5/RC7.6; must reference DAM.
- Import/export/bulk → RC7.7; requires Policy + audit + company + optimistic concurrency.
- Unfinished module packages → RC7.8 and later (V1 subsets only). Each such module begins with its own planning review before implementation if the approved V1 freeze changes.

---

## Sales

**Current backend:** Opportunity, Quote, SalesOrder create/update/lifecycle; Get* + GetCustomerSalesSummary. Lists fixture-backed.

### Included

- `ListOpportunity`, `ListQuote`, `ListSalesOrder` (filter/sort/page/search + Policy row filtering).
- Keep existing Create/Update/Revise/Cancel/Get handlers authoritative.
- Production UI lists for Opportunity, Quote, Sales Order → live `List*`.

### Excluded

- Full catalogue of sales UI entities without CQRS today (shipments, RMA, price lists, territories, discount matrices, etc.) unless amended into this freeze.
- Parallel quote/order status machines outside Workflow.

### Deferred

- Company-wide sales summary query (today per-customer only) → optional late RC7 if needed for de-fixtured KPIs; otherwise keep presentation KPI until Reporting V1 (RC7.8 and later).
- Sales attachments/notes on Opportunity/Quote/Order → RC7.6.
- Sales import/export → RC7.7 if claimed; otherwise Future.

### Future phase

- Advanced pricing engines, CPQ configurators, multi-channel commerce storefront (RC11).
- AI quote copilots (RC9).

---

## Procurement

**Current backend:** Supplier, PurchaseRequisition, PurchaseOrder + submit/issue/cancel; Get* + GetProcurementSummary.

### Included

- `ListSupplier`, `ListPurchaseRequisition`, `ListPurchaseOrder`.
- Existing create/update/lifecycle/Get/summary remain authoritative.
- Production UI lists for those three entities → live `List*`.

### Excluded

- Supplier scorecards, advanced sourcing events, blanket agreement engines not present in CQRS.
- Inventory receipt ownership (Inventory owns stock).

### Deferred

- Attachments on PO/PR → RC7.6.
- PO/PR import/export → RC7.7 if amended; else Future.

### Future phase

- Strategic sourcing / auction platforms; 3-way match automation beyond V1 finance/inventory integration.

---

## Inventory

**Current backend:** Item, Warehouse, StorageLocation, Receive/Adjust/Reserve/Release/Transfer; Get* stock/ledger/batch/lot/serial + summary.

### Included

- `ListInventoryItem`, `ListWarehouse`, `ListStock` (and `List*` for ledger/batch/lot/serial **only if** production UI lists them as primary grids; minimum: Item, Warehouse, Stock).
- Existing stock commands remain Inventory-owned.
- Production UI lists for Included entities → live `List*`.

### Excluded

- Manufacturing consuming inventory as a second stock ledger.
- WMS robotics / wave planning.

### Deferred

- Dual-branch transfer Policy/resource completeness (known residual) → RC7.4 scope completion.
- Attachments on items → RC7.6.
- Stock import/export / cycle-count bulk → RC7.7 if claimed; else Future.

### Future phase

- Advanced WMS, slotting optimization, multi-echelon planning.

---

## Finance

**Current backend:** FinancialAccount, Invoice, Payment, Credit adjustment, Ledger create/append; Get* + GetFinancialSummary.

### Included

- `ListFinancialAccount`, `ListInvoice`, `ListPayment`, `ListLedger` (minimum accounts/invoices/payments; ledger if UI primary).
- Existing create/update/record/Get/summary remain authoritative.
- Production UI lists for Included entities → live `List*`.

### Excluded

- Full statutory GL, multi-book consolidation, tax engine productization.
- Payroll posting (HR Future / later).

### Deferred

- Field-level profit/margin hardening on summaries already started in RC5.6 → continue under RC7.4 where live DTOs apply.
- Invoice PDF/binary → Reporting + DAM (D40), not ad-hoc finance file store — RC7.5 / RC7.8 and later Reporting subset.
- Import/export of invoices/payments → RC7.7 if claimed; else Future.

### Future phase

- Full accounting suite, banking connectors, multi-currency revaluation products.

---

## CRM

**Current backend:** Lead, Contact/Account (party), Activity, Campaign; qualify/convert; Get* + GetCrmSummary.

### Included

- `ListLead`, `ListContact` and/or `ListAccount` (as modeled), `ListActivity`, `ListCampaign` for entities with live CQRS.
- Existing lifecycle/Get/summary remain authoritative.
- Production UI lists for those entities → live `List*`.

### Excluded

- Marketing automation clouds, CDP, arbitrary custom-object CRM platforms.

### Deferred

- Notes/activity collaboration beyond existing Activity commands → RC7.6 if still fixture.
- Import leads/campaigns → RC7.7 if claimed; else Future.

### Future phase

- Journey orchestration (RC13), AI CRM copilots (RC9).

---

## Projects

**Current backend:** Project, Task, Milestone, Resource assign/release, Schedule; Get* + GetProjectSummary.

### Included

- `ListProject`, `ListTask`, `ListMilestone` (Resource/Schedule/WorkItem `List*` if production grids require them).
- Existing create/update/archive/assign/complete/Get/summary remain authoritative.
- Production UI lists for Included entities → live `List*`.

### Excluded

- Full PPM portfolio financials, earned-value management suites.
- Professional portal project views (RC8).

### Deferred

- Gantt/Kanban **backends** — presentation views may remain client-side over `List*` data; dedicated scheduling engines → Future unless amended.
- Attachments on projects/tasks → RC7.6.
- Project import/export → RC7.7 if claimed; else Future.

### Future phase

- Construction-specific control systems; RC8 professional shells.

---

## Service

**Current backend:** Service request, Work order, Appointment, Technician; update/close; Get* + history + GetServiceSummary.

### Included

- `ListServiceRequest`, `ListWorkOrder`, `ListAppointment`, `ListTechnician` (as modeled in CQRS).
- Existing create/update/close/Get/summary remain authoritative.
- Production UI lists for Included entities → live `List*`.

### Excluded

- Field-service routing optimizers, IoT device fleets.

### Deferred

- Attachments on work orders → RC7.6.
- Bulk schedule import → RC7.7 if claimed; else Future.

### Future phase

- Advanced FSM / mobile offline sync products.

---

## Manufacturing

**Current state:** Domain foundation only (`@afh/manufacturing`). **No** `manufacturing-application`. UI fixture-only. Full MES is **RC12**.

### Included (V1 subset — deliberately narrow)

- Application package scaffolding + persistence for a **minimal production-order registry** aligned to domain foundation:
  - Create/Get/List **ProductionOrder** (or equivalent foundation aggregate chosen at RC7.8 design)
  - Company scope + Policy + Workflow status projection (no parallel status machine)
- Read references to inventory items/warehouses (no stock ownership).
- Seed + `List*` for the Included production-order entity only.

### Excluded (must not enter RC7)

- BOM authoring/execution as a full product
- Routing authoring/execution
- Capacity planning / finite scheduling
- Shop-floor data collection / MES terminals
- MRP / material allocation engines
- Cost rollup / manufacturing accounting
- Machine maintenance / TPM
- Quality execution systems (beyond opaque refs if any)
- Inventory consumption postings owned outside Inventory

### Deferred

- Richer manufacturing master data beyond the single Included aggregate → RC12 or post-V1 amendment.
- Notification of production events delivery workers → not RC7 charter.

### Future phase

- **RC12 — Digital Manufacturing / MES** (BOM, routing, capacity, shop floor, MRP, cost, maintenance).

---

## HR

**Current state:** Domain foundation; UI fixtures; no HR application package.

### Included (V1 subset)

- Application scaffolding + persistence for:
  - **Employee** (or Person-employment) Create/Get/List
  - Optional **Department** Get/List if required for employee FK integrity
- Company scope + Policy; no payroll engine.

### Excluded

- Payroll calculation/payment
- Benefits administration
- Recruiting ATS
- Performance review cycles
- Time & attendance devices
- Union/contract engines

### Deferred

- Employee document attachments → RC7.6 via DAM.
- HR import (employee CSV) → RC7.7 if claimed; else Future.

### Future phase

- Full HCM suite; payroll (likely with Finance).

---

## CMS

**Current state:** Domain foundation; UI fixtures; no CMS application package.

### Included (V1 subset)

- Application scaffolding + persistence for:
  - **CmsEntry** (or ContentItem) Create/Update/Get/List
  - Collection key + publish flag as data fields
- Policy on editor vs public read (public marketing site may remain static until wired — do not expand to full public CMS in RC7 unless amended).
- Workflow optional for publish gate via Approval/Workflow — no parallel publish state machine.

### Excluded

- Full headless CMS marketplace, visual page builder product, multi-site CDN orchestration.
- Public blog/news ecosystem rebuild (marketing presentation remains out unless amended).

### Deferred

- CMS media → DAM references (RC7.5/RC7.6).
- Public site wiring to CMS entries → Future / content launch work.

### Future phase

- Marketing CMS productization; SEO pipeline beyond current partial static SEO.

---

## Notifications

**Current state:** Foundation; UI fixtures; Event Bus consumer model (D42). RC6 emits outbox notification **events**; delivery workers are RC6 residual / separate.

### Included (V1 subset)

- Application/query surface for **NotificationPreference** or **InAppNotification** List/Get (choose one primary read model at RC7.8 and later design).
- Respect Event Bus → Notifications ownership; no domain→channel calls.
- Policy on reading own/company notifications.

### Excluded

- Full multi-provider delivery mesh as RC7 charter (email/SMS/push workers) — unless separately approved; default **Excluded** from RC7.
- Campaign marketing blasts (CRM Future).

### Deferred

- Template management UI → Settings/Notifications later slice if needed.
- Delivery worker productionization → explicit residual program (not silent RC7 scope).

### Future phase

- Provider failover, digests, marketing automation.

---

## Reporting

**Current state:** Foundation; Reports/Analytics centers largely fixture; six live module summaries exist. D40/D41: Reporting owns presentation; domains own metrics.

### Included (V1 subset)

- Application surface to **List/Get report definitions** and **run a bounded set of V1 reports** backed by existing domain summaries / approved read models (not Analytics 2.0). Reporting is a **read model only; never a business owner**.
- Export of those V1 reports only via Reporting (not ad-hoc module CSV bypass) — may land with RC7.7 / RC7.8 and later.
- Policy on `reporting.reports.read` (and export permission distinct from view).

### Excluded

- Dashboard builder as authoritative product
- Forecasting / predictive analytics (RC14)
- Arbitrary SQL report designer

### Deferred

- Insights center / analytics packs → RC14 or post-V1.
- Document generation binaries → Reporting + Templates + DAM (D40) with RC7.5.

### Future phase

- **RC14 — Analytics 2.0**.

---

## Search

**Current state:** Foundation; UI fixtures; Search owns indexes (architecture 0C).

### Included (V1 subset)

- Reindex/query API for a **bounded V1 index set** (e.g. inventory items, customers/parties, projects — exact set fixed at RC7.8 and later design within freeze).
- List/search query with Policy row filtering on hits (no leak of unauthorized docs).
- Search remains a **read model only; never a business owner**; writes stay in domains.

### Excluded

- Universal enterprise search across all 201 entities
- AI smart search (RC9)
- Replacing CQRS Get/List as source of truth

### Deferred

- Faceted commerce search → RC11.
- Full-text across CMS/DAM → after CMS/DAM V1 exist.

### Future phase

- Cross-portal search (RC8); AI ranking (RC9).

---

## DAM

**Current state:** Metadata upload route exists; **binary/object storage partial** (RC4 limitation). Catalogue lists fixture-heavy.

### Included (V1)

- Authoritative **binary/object storage** for uploaded assets (production path).
- Create/Get/List **Asset** (metadata) with company scope + Policy.
- MIME allowlist / size limits retained and enforced server-side.
- Attachments in other modules **reference DAM asset ids** (RC7.6).

### Excluded

- Public CDN product, image transformation SaaS, video transcoding farm.
- Using local browser blob storage as production source of truth.

### Deferred

- Advanced renditions/thumbnails → post-V1.
- Retention/legal hold workflows → privacy program / later.

### Future phase

- Partner document vaults in RC8 verification flows (consume DAM; do not fork file ownership).

---

## Collaboration & bulk I/O (cross-module)

Applies only to **Included** entities above.

### Included

- **RC7.6:** Notes, comments, activity feed (server-backed) for Included entities that the freeze’s module sections mark Deferred→RC7.6.
- **RC7.6:** Attachments as DAM references.
- **RC7.7:** Import, export, bulk operations **only** for entities explicitly opted in at slice kickoff (default opt-in candidates: Inventory items, CRM leads, Suppliers — confirm per slice). Every import/export/bulk **must** enforce:
  - Policy authorization
  - Audit
  - Company isolation
  - Optimistic concurrency (or equivalent fail-closed version checks — never silent overwrite)

### Excluded

- Kanban/Gantt/calendar as separate backend products (client views over `List*` data are enough for V1).
- Silent bulk APIs without Policy.

### Future phase

- Real-time collab (OT/CRDT), external EDI networks.

---

## Production profile vs Demo/Test profile

| Profile | Fixtures |
|---|---|
| **Production profile** | Forbidden for Included list/detail after RC7.3; live CQRS only |
| **Demo/Test profile** | Explicit fixtures allowed for UX demos and automated tests |

Exact env flag/name is an RC7.1/RC7.3 deliverable; behavior is frozen here.

---

## Amendment rule

To add an entity or MES/HR/CMS capability to Included:

1. Update this V1 freeze in a reviewed docs change.
2. Name the target RC7.x slice.
3. Record ADR if ownership or read-model boundaries change.
4. For RC7.8 and later modules, begin with a planning review if this freeze changed since last approval.

Future amendments to this freeze must reference the approving ADR or planning review.

**No code may precede an amendment.**

---

## Freeze summary (quick)

| Module | V1 posture |
|---|---|
| Sales / Procurement / Inventory / Finance / CRM / Projects / Service | `List*` + de-fixture for existing CQRS entities |
| Manufacturing | Minimal production-order app only; **MES → RC12** |
| HR | Employee (+ optional Department) only; no payroll |
| CMS | Entry CRUD/List only; no full marketing CMS |
| Notifications | In-app/preferences read model only; never a business owner; delivery workers not default IN |
| Reporting | Bounded V1 report list/run; read model only; never a business owner; no Analytics 2.0 |
| Search | Bounded V1 index set; read model only; never a business owner |
| DAM | Binary storage + asset List/Get; attachments reference DAM |
