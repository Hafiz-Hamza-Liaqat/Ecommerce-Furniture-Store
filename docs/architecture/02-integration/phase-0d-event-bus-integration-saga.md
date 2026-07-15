# Phase 0D — Enterprise Event Bus, Integration Contracts & Saga Architecture

**Role:** Principal Enterprise Integration Architect  
**Mode:** Documentation only · No code · No SQL · No transport syntax · No frameworks  
**Depends on:** Phase 0A FROZEN · Phase 0B APPROVED · Phase 0C APPROVED  
**Cross-references:** [Master Index](../README.md) · [0A Laws](../00-foundation/phase-0a-enterprise-architecture-laws.md) · [0B Data](../01-domain/phase-0b-enterprise-data-architecture.md) · [0C Services](../01-domain/phase-0c-enterprise-domain-service-architecture.md) · [0E Security](../03-security/phase-0e-enterprise-security-architecture.md) · [0F Observability](../04-observability/phase-0f-observability-operations.md) · [Glossary](../glossary.md) · [ADR Index](../decision-records/ADR-INDEX.md)

---

# 1. Enterprise Event Bus Architecture

## 1.1 Ownership

| Concern | Owner |
|---------|--------|
| Event Bus platform (routing, retry, DLQ, replay tooling) | **Platform Integration** (shared kernel ops) |
| Event **schema/payload** | **Producing domain service** (Phase 0C) |
| Outbox rows | Producing service’s database boundary (Phase 0B `outbox_messages`) |
| Inbox dedupe | Consuming service (`inbox_processed`) |
| Notification dispatch | **Notifications** as Event Bus **consumer only** |
| Domain business decisions | Never on the bus (Policy / Rules / Workflow / Approval remain engines) |

The bus is a **delivery substrate**, not a business engine.

## 1.2 Publishers

Every Phase 0C domain service that mutates state and emits domain events: Identity, Commerce, Inventory, Sales, Manufacturing, Procurement, CRM, Interior Projects, Service Management, CMS, DAM, Workflow, Approval, Rules (optional), Reporting, Search, Settings, AI Gateway, Policy (security signals only).

**Publish path:** Application TX → persist aggregate + `domain_events` + `outbox_messages` → Outbox Publisher relays to bus.

## 1.3 Consumers

| Consumer | Role |
|----------|------|
| Inventory, Sales, Manufacturing, Procurement, Projects, Service, CRM, CMS | Cross-domain reactions |
| Workflow | Rare; usually driven by commands; may listen for Approval decisions |
| Notifications | Channel fan-out |
| Search | Reindex |
| Reporting / Analytics projections | Metric snapshots, report freshness |
| Commission / Credit handlers (within Sales) | Money side-effects |
| AI Gateway | Optional triggers (never unsupervised money/stock) |
| Audit / security monitors | `PolicyDenied`, payment anomalies |

## 1.4 Topics (logical)

Naming pattern: `{company_scope}.{domain}.{entity}.{event}` with company isolation at broker ACL or envelope.

| Topic family | Examples |
|--------------|----------|
| `identity.*` | user, organization, partner |
| `commerce.*` | product, price_list |
| `inventory.*` | stock, reservation, transfer |
| `sales.*` | quote, order, invoice, payment, delivery, installation, commission |
| `manufacturing.*` | production, qc, cost, rework |
| `procurement.*` | pr, po, grn, supplier_payment |
| `projects.*` | project, proposal |
| `service.*` | service_request, repair, warranty, refund |
| `crm.*` | lead, review, conversation |
| `cms.*` | entry, ad, seo |
| `dam.*` | media |
| `workflow.*` | started, transitioned, completed |
| `approval.*` | submitted, decided |
| `reporting.*` | report_run |
| `search.*` | index_updated |
| `ai.*` | job_completed |
| `security.*` | policy_denied |
| `platform.dlq.*` | dead letters per family |

Routing: publish to topic family by `event_type`; consumers subscribe by family + filter on `event_type` / `company_id`.

## 1.5 Delivery guarantees

| Guarantee | Level |
|-----------|--------|
| Producer → Outbox | **At-least-once** within committed TX (atomic with business write) |
| Outbox → Bus | At-least-once |
| Bus → Consumer | At-least-once |
| Business effect | **Exactly-once logical** via Inbox idempotency + aggregate guards |

No reliance on broker exactly-once as business truth.

## 1.6 Retry policy

| Stage | Policy |
|-------|--------|
| Transient failure | Exponential backoff: e.g. 5s → 30s → 2m → 10m → 1h (configurable in Settings) |
| Max attempts | Per-event-type policy (default 8); then DLQ |
| Non-retryable | Validation of poison payload, permanent Authorization on consumer side → DLQ immediately with reason |
| Workflow/Approval timeouts | Saga timers (Section 3), not only bus retry |

## 1.7 Dead-letter queues

- One DLQ per topic family: `platform.dlq.{family}`  
- Payload includes original envelope, failure reason, attempt count, `correlation_id`  
- Ops replay to original topic after fix  
- Alert on DLQ depth / age  

## 1.8 Replay policy

| Replay type | Rule |
|-------------|------|
| Consumer reprocess from offset/time | Allowed if Inbox makes handlers idempotent |
| Selective replay by `event_id` / aggregate | Supported via tooling |
| Rebuild read models (Search/Reporting) | Replay catalog/order events; never replay compensation blindly without saga state check |
| Forbidden | Replay of payment capture as new capture without idempotency key |

## 1.9 Event versioning

- Envelope field `event_version` (int)  
- Additive optional fields preferred  
- Breaking change → new `event_type` suffix `.v2` or version bump with dual-publish window  
- Consumers ignore unknown fields  

## 1.10 Correlation & causation

| ID | Meaning |
|----|---------|
| `correlation_id` | End-to-end business journey (one per user request or saga) |
| `causation_id` | Parent event or command id that caused this event |
| `event_id` | Unique id for this event (UUID) |
| `command_id` / `idempotency_key` | When event resulted from an idempotent command |

All logs, audits, outbox, inbox store these for traceability (Phase 0A observability).

## 1.11 Idempotency strategy

1. Producer: command idempotency keys (Phase 0C §11)  
2. Outbox: unique `event_id`  
3. Consumer Inbox: `(consumer_name, event_id)` processed marker  
4. Aggregate: natural guards (cannot reserve twice for same order line; workflow stage monotonicity)  

---

# 2. Enterprise Integration Boundaries

## 2.1 Communication styles

| Style | Use when |
|-------|----------|
| **Synchronous command** | Same user request must confirm write (create order, transition workflow, authorize via Policy) |
| **Synchronous query** | Read needs immediate consistent-enough answer (GetInventory availability, Rules evaluate price) |
| **Asynchronous event** | Side effects, fan-out, cross-domain reactions |
| **Async command** *(optional queue command)* | Heavy work (reindex, report run, AI job)—still recorded as commands with ids |

## 2.2 Cross-domain matrix

| Interaction | Sync / Async | Type | Notes |
|-------------|--------------|------|-------|
| Sales → Inventory Reserve/Release | Sync command preferred at order place; async compensate on failure | Command | Sales does not write stock |
| Inventory → Sales | Async | Event | StockReserved/Released confirmations optional for saga |
| Sales → Manufacturing CreateProductionOrder | Async event `OrderPlaced` / stage advance | Event → command in Mfg | |
| Manufacturing → Inventory issue materials | Sync or async command | Command | |
| Manufacturing → Workflow | Sync command TransitionWorkflow | Command | Stage SSoT |
| All domains → Workflow | Sync Transition/Start | Command | |
| Procurement → Inventory on GRN | Sync command in GRN TX or event `GRNReceived` → Inventory | Prefer command in same app process orchestration; else event + Inbox | |
| Approval → Workflow / subject service | Async event `ApprovalApproved` | Event | Unblocks saga |
| Workflow → Notifications | Async | Event `WorkflowTransitioned` | Notifications consumer |
| Workflow → Reporting | Async | Event | Metrics/projections |
| Reporting → Search | **Forbidden write path** | — | Search listens to domain events, not Reporting |
| CRM → Notifications | Async via CRM events | Event | No direct SMS from CRM service code path |
| Sales → Notifications | Async | Event | |
| AI Gateway → domains | Sync query tools under Policy; async job complete events | Query + Event | No silent stock/money mutations |
| Policy | Sync on every command/query | Authorization | Not via bus |
| Rules | Sync evaluate on command path | Query-like | |
| DAM | Sync upload command; async derivative build | Command + Event | |
| Search | Async index from events; sync search query | Event + Query | |

## 2.3 Explicit forked examples

**Sales → Inventory:** sync `ReserveStock` in order placement orchestration; on failure order placement fails or saga compensates.  

**Inventory → Manufacturing:** events `StockReserved` / low stock; Manufacturing queries inventory before start.  

**Manufacturing → Workflow:** sync transitions only.  

**Procurement → Inventory:** `ReceiveGRN` orchestrates Inventory stock-in command; publishes `GRNReceived` for others.  

**Workflow → Notifications / Reporting:** async events only.  

**Approval → Workflow:** `ApprovalApproved/Rejected` consumed by subject saga / WorkflowService.  

**Reporting → Search:** not a dependency for writes; both consume domain events independently.

---

# 3. Saga Architecture

Sagas are **orchestration documents** over commands + events. **Workflow Engine remains lifecycle SSoT** for subject stage; sagas coordinate **cross-aggregate** work and compensation.

## 3.1 Common saga mechanics

| Element | Rule |
|---------|------|
| Saga state store | Logical `saga_instances` (may be Phase 0B extension / Settings-backed ops table)—orchestrator owns state, not business stage |
| Steps | Command or wait-for-event |
| Retry points | Each step; bus retries + saga step retry |
| Timeout | Per step SLA; on timeout → compensate or human Approval |
| Compensation | Explicit compensating commands/events; never “delete history” |

---

## 3.2 Quote → Order

**Happy path:** CreateQuote → (customer/internal) ApproveQuote → ConvertQuoteToOrder → StartWorkflow(order) → ReserveStock → Ack  

**Compensation:** If ReserveStock fails → cancel order workflow transition / mark failed + ReleaseStock if partial + notify  
**Rollback events:** `OrderCancelRequested`, `StockReleased`, `QuoteConversionFailed`  
**Retry points:** ConvertQuoteToOrder (idempotent), ReserveStock  
**Timeout:** Quote validity (`valid_until`) expires → Workflow cancel quote; no order  

---

## 3.3 Order → Production

**Happy path:** Order workflow reaches “Advance Received” / “Material Purchased” (as definition) → CreateProductionOrder → ProductionStarted → … → ProductionCompleted → Workflow advance on order  

**Compensation:** Production fail/cancel → Workflow to rework or cancel path; Release unused reservations; notify  
**Rollback events:** `ProductionCancelled`, `StockReleased`  
**Retry points:** CreateProductionOrder idempotent per order line  
**Timeout:** `due_at` breach → priority Rules + Notifications + optional Approval for expedite  

---

## 3.4 Production → Delivery → Installation

**Happy path:** ProductionCompleted → Pack/Dispatch stages → ScheduleDelivery → DeliveryCompleted → ScheduleInstallation → InstallationCompleted → order Workflow terminal  

**Compensation:** Delivery fail → reschedule; do not reverse production; Installation fail → snag/rework WorkOrder  
**Rollback events:** `DeliveryFailed`, `InstallationFailed` (not stock rollback)  
**Retry points:** ScheduleDelivery, CompleteDelivery (idempotent proofs)  
**Timeout:** scheduled window miss → Notifications + reassignment  

---

## 3.5 Refund

**Happy path:** RequestRefund → Approval → RefundCompleted → Payment provider/credit → Commission clawback → Stock restock if return GRN path → Workflow complete  

**Compensation:** If payment refund fails after approval → finance alert DLQ/human; do not auto-reapprove  
**Rollback events:** `RefundFailed`, `CommissionClawbackFailed`  
**Retry points:** payment refund instruction (idempotency key)  
**Timeout:** Approval SLA; else auto-escalate Notification to Admin  

---

## 3.6 Warranty Claim

**Happy path:** FileWarrantyClaim → Eligibility Rules → Approval/inspect → RepairJob or Replacement order → Complete → Close claim Workflow  

**Compensation:** Reject claim → notify; mid-repair cancel → close with reason  
**Rollback events:** `WarrantyClaimRejected`, `RepairCancelled`  
**Retry points:** CreateRepairJob  
**Timeout:** inspection appointment miss → reschedule saga step  

---

## 3.7 Procurement (PR → PO → GRN)

**Happy path:** CreatePR → (optional quotes) → CreatePO → Approval → POApproved → ReceiveGRN → Inventory stock-in → SupplierPayment (optional separate saga)  

**Compensation:** Reject PO → cancel PR lines; GRN partial → adjust PO remaining; bad stock → damage adjust Inventory  
**Rollback events:** `POCancelled`, `GRNReversed` (adjust ledger, not delete)  
**Retry points:** ApprovePO decide, ReceiveGRN idempotent  
**Timeout:** supplier lead-time → Notifications + scorecard  

---

## 3.8 B2B Verification / Organization Onboarding

**Happy path:** SubmitOrganizationVerification → Approval under review → Approved → Grant B2B roles + PriceList + CreditAccount → Notify  

**Compensation:** Rejected → status projection + notify; Changes Requested → wait resubmit  
**Rollback events:** `OrganizationRejected` (revoke temp access if any)  
**Retry points:** document reprocessing  
**Timeout:** Approval SLA → remind Admins  

---

## 3.9 Payment → Workflow Advance

**Happy path:** ReceivePayment (idempotent) → allocate invoice → emit PaymentReceived → saga advances order Workflow (advance/final)  

**Compensation:** Payment auth fails → no transition; Payment captured then cancel → Refund saga  
**Retry points:** provider webhook/command with idempotency  
**Timeout:** pending payment → cancel reservation after Settings timeout  

---

# 4. Outbox Pattern

| Topic | Definition |
|-------|------------|
| **Ownership** | Producing bounded context persists outbox in **its** transactional store |
| **TX boundary** | Business write + outbox row **same transaction** |
| **Publisher** | Outbox relay process polls `pending`, publishes to bus, marks `published` / increments attempts |
| **Delivery** | At-least-once to bus |
| **Retry** | Same backoff as §1.6; then outbox status `failed` + alert (may mirror DLQ) |
| **Ordering** | Per-aggregate ordering: publish in `created_at`/`sequence` order for same `aggregate_id` where required (§6) |
| **Exactly-once logical** | Achieved with consumer Inbox, not by outbox alone |
| **Idempotent consumers** | Mandatory for all business consumers |

Outbox never contains Policy decisions as a substitute for sync authorize.

---

# 5. Inbox Pattern

| Topic | Definition |
|-------|------------|
| **Deduplication** | Insert `(consumer_name, event_id)` before side effects; if duplicate, ack success no-op |
| **Replay safety** | Replayed events hit Inbox and no-op if already applied; handlers still check aggregate state |
| **Duplicate handling** | Treat as success; metrics counter `duplicate_suppressed` |
| **Poison messages** | After N parse/handler permanent failures → DLQ; do not block partition forever |
| **Handler rule** | Side effects must be idempotent (upsert, guarded transitions, ledger with reference uniqueness) |

---

# 6. Event Catalog (enterprise)

*Envelope (all events): `event_id`, `event_type`, `event_version`, `company_id`, `occurred_at`, `correlation_id`, `causation_id`, `producer`, `aggregate_type`, `aggregate_id`, `sensitivity`, `payload`*

**Sensitivity:** `public` | `internal` | `pii` | `restricted` | `financial`

| Event | Producer | Consumers | Payload ownership | Ordering | Retry | Ver | Sensitivity |
|-------|----------|-----------|-------------------|----------|-------|-----|-------------|
| UserRegistered | Identity | CRM, Notify, Search | Identity | per user | default | 1 | pii |
| OrganizationSubmitted | Identity | Approval, Notify | Identity | per org | default | 1 | restricted |
| OrganizationVerified / Rejected | Approval/Org | Identity, Notify, Search | Approval+Org | per org | default | 1 | internal |
| ProductUpdated / Published | Commerce | Search, Notify(internal) | Commerce | per product | default | 1 | public/internal |
| PriceListUpdated | Commerce | Search, Sales caches | Commerce | per list | default | 1 | internal |
| StockReserved / Released | Inventory | Sales saga, Analytics | Inventory | **per inventory_item** | strict | 1 | internal |
| StockAdjusted / Transferred | Inventory | Analytics, Notify(low) | Inventory | per item | strict | 1 | internal |
| LowStockDetected | Inventory | Notify, Reporting metrics | Inventory | best effort | default | 1 | internal |
| QuoteCreated / Approved | Sales | Notify, CRM | Sales | per quote | default | 1 | internal |
| OrderPlaced / Cancelled | Sales | Inventory, Mfg, Comm, Search, Analytics, Notify, Audit | Sales | per order | default | 1 | financial |
| InvoiceIssued | Sales | Notify, Reporting, Search | Sales | per invoice | default | 1 | financial |
| PaymentReceived / Failed | Sales | WF advance saga, Credit, Comm, Notify, Audit | Sales | per payment key | **strict idempotent** | 1 | financial |
| DeliveryScheduled / Completed / Failed | Sales | Notify, WF, Analytics | Sales | per delivery | default | 1 | pii (address) |
| InstallationCompleted / Failed | Sales | Notify, Warranty, WF, Analytics | Sales | per installation | default | 1 | internal |
| CommissionAccrued / Paid / Clawback | Sales | Notify, Analytics | Sales | per ledger entry | strict | 1 | financial |
| ProductionStarted / Completed / Cancelled | Mfg | Sales WF saga, Notify, Analytics, Inventory | Mfg | per production_order | default | 1 | internal |
| QcPassed / QcFailed | Mfg | WF, Rework, Notify | Mfg | per inspection | default | 1 | internal |
| ReworkCreated | Mfg | WF, Notify | Mfg | per rework | default | 1 | internal |
| CostSheetUpdated | Mfg | Reporting metrics | Mfg | per sheet | default | 1 | internal |
| PurchaseRequestCreated | Procurement | Notify | Procurement | per PR | default | 1 | internal |
| POApproved / Cancelled | Procurement | Notify, Supplier ops | Procurement | per PO | default | 1 | financial |
| GRNReceived | Procurement | Inventory, Cost history, Analytics | Procurement | per GRN | strict | 1 | internal |
| SupplierPaid | Procurement | Analytics, Notify | Procurement | per payment | strict | 1 | financial |
| ProjectCreated / Completed | Projects | Notify, Analytics, CRM | Projects | per project | default | 1 | internal |
| ServiceRequestCreated | Service | Notify, WF | Service | per request | default | 1 | pii |
| RepairCompleted | Service | Notify, WF | Service | per job | default | 1 | internal |
| WarrantyClaimFiled / Rejected | Service | Approval, Notify | Service | per claim | default | 1 | pii |
| RefundRequested / Completed / Failed | Service/Sales | Approval, Payment, Comm, Notify, Audit | Sales/Service | per refund | strict | 1 | financial |
| LeadCreated / Converted | CRM | Notify, Analytics | CRM | per lead | default | 1 | pii |
| ReviewSubmitted | CRM | Moderation, Notify | CRM | per review | default | 1 | public |
| MessagePosted | CRM | Notify | CRM | per conversation | default | 1 | pii |
| CmsEntryPublished | CMS | Search, SEO | CMS | per entry | default | 1 | public |
| MediaUploaded / Linked | DAM | Search | DAM | per asset | default | 1 | by visibility |
| WorkflowStarted / Transitioned / Completed | Workflow | Notify (selected), Analytics, subject sagas | Workflow | **per instance** | strict | 1 | internal |
| ApprovalSubmitted / Approved / Rejected / ChangesRequested | Approval | Subject saga, WF, Notify | Approval | per request | default | 1 | internal/restricted |
| ReportRunCompleted | Reporting | Notify | Reporting | per run | default | 1 | internal |
| SearchIndexUpdated | Search | — | Search | best effort | default | 1 | internal |
| NotificationDispatched | Notifications | Audit opt | Notifications | best effort | default | 1 | pii |
| AiJobCompleted / AiSuggestionCreated | AI | Projects/CRM UI | AI | per job | default | 1 | internal |
| PolicyDenied | Policy | Audit, security | Policy | best effort | default | 1 | internal |
| FeatureFlagChanged / SettingChanged | Settings | Runtime config | Settings | best effort | default | 1 | secret if flagged |

---

# 7. Integration Contracts (logical)

## 7.1 Command contracts (examples)

| Command | From → To | Request (logical fields) | Response | Errors |
|---------|-----------|--------------------------|----------|--------|
| ReserveStock | Sales → Inventory | company_id, reference_type/id, lines[variant_id, location_id?, qty], idempotency_key | reservation_ids | Conflict, Rule violation, Not Found |
| ReleaseStock | Sales/Saga → Inventory | reservation_id or reference, idempotency_key | ack | Not Found, Conflict |
| TransitionWorkflow | Any subject owner → Workflow | instance_id, transition_code, actor_id, comment, idempotency_key | new_stage_id | Workflow violation, Approval pending, Authorization |
| StartWorkflow | Subject owner → Workflow | definition_code, subject, actor | instance_id | Conflict (already running) |
| SubmitApproval | Domain → Approval | type, subject, payload_snapshot, actor | request_id | Validation, Authorization |
| DecideApproval | Reviewer → Approval | request_id, decision, reason | ack | Authorization, Conflict |
| EvaluateRules | Domain → Rules | rule_set_code, context | result_actions | Rule violation |
| Authorize | All → Policy | principal, action, resource, context | allow/deny+reason | Authorization |
| CreateProductionOrder | Saga/Sales → Mfg | order_line_id, due_at, idempotency_key | production_order_id | Conflict, Validation |
| ReceiveGRNStockIn | Procurement → Inventory | grn_id, lines, location_id, idempotency_key | ledger refs | Conflict, Validation |
| IssueInvoice | Sales internal | order_id, idempotency_key | invoice_id | Business rule failed |
| ReceivePayment | Sales | amount, method, idempotency_key, provider refs | payment_id | Conflict, Validation |
| DispatchNotification | **Forbidden as domain command** | — | — | Domains publish events only |

## 7.2 Query contracts (examples)

| Query | From → To | Input | Output | Security |
|-------|-----------|-------|--------|----------|
| GetAvailableQty | Sales → Inventory | variant, location?, company | qty available | Policy |
| EvaluatePrice | Sales/Commerce → Rules | variant, qty, party, price_list | unit_price, discounts | Policy |
| GetWorkflowState | UI/Domain → Workflow | subject | stage, allowed transitions | Policy |
| SearchProducts | Storefront → Search | q, facets, page | hits | Policy / public |
| GetDashboard | UI → Reporting | role, filters | widget data | Policy |
| AiToolGetOrder | AI → Sales | order_id | sanitized order | Policy (strict) |

## 7.3 Event contracts

- Envelope mandatory (§6)  
- Payload owned by producer; consumers must not require producer DB access  
- PII minimized; restricted fields omitted or tokenized; full KYC never on open topics  

---

# 8. Failure Handling

| Mechanism | Application |
|-----------|-------------|
| **Retries** | Outbox publish, bus delivery, consumer handlers, saga steps (§1.6) |
| **Circuit breakers** | Outbound payment provider, SMS/WhatsApp, AI providers—fail fast; saga waits or queues |
| **Compensating actions** | Saga compensations (§3); stock release; clawback; workflow cancel transitions |
| **DLQ** | Poison/exhausted messages (§1.7); operational replay |
| **Monitoring** | Queue lag, outbox age, DLQ depth, saga stuck time, payment failure rate, WF transition failures |
| **Alerting** | Financial event failures, DLQ growth, PolicyDenied spikes, saga timeout breaches |
| **Audit** | Financial, stock, approval, permission, PolicyDenied, refund—append `audit_logs` with correlation_id |

---

# 9. Event Security

| Concern | Rule |
|---------|------|
| **Authorization** | Publishing/consuming bus topics constrained by platform ACLs; **business authz remains Policy** on commands/queries—not replaced by bus |
| **Tenant / company isolation** | Every event carries `company_id`; consumers filter; no cross-company processing |
| **Branch isolation** | Payload includes `branch_id` when relevant; consumers enforce Policy scopes |
| **PII** | Classify events; redact in logs; minimize payload; Delivery address only on need-to-know topics |
| **Restricted / KYC** | No raw CNIC/tax docs on bus—references to DAM media ids only; access via Policy + DAM |
| **Encryption** | TLS in transit; restricted payloads encrypted at rest in stores; secrets never in events |
| **Audit logging** | Sensitive event handling and PolicyDenied audited |

---

# 10. Architecture Validation

| Requirement | Status |
|-------------|--------|
| Phase 0A Architecture Laws | **Compliant** — events for side effects; Notifications consumer-only; Workflow SSoT; Policy sync authority; Rules calculations; DAM files; Reporting presentation; no new business engines on bus |
| Phase 0B ERD | **Compliant** — outbox, inbox, domain_events, audit, notifications align |
| Phase 0C service boundaries | **Compliant** — producers/consumers match ownership; no domain writes others’ aggregates |
| No cyclic ownership | **Confirmed** — event-driven reactions; write ownership acyclic |
| No duplicate business engines | **Confirmed** — bus ≠ Workflow/Rules/Policy/Approval |
| Workflow lifecycle SSoT | **Confirmed** — sagas coordinate; stages via Workflow commands |
| Policy sole runtime authorization | **Confirmed** |
| Rules calculation engine | **Confirmed** |
| Reporting presentation owner | **Confirmed** — consumes events for projections; owns dashboards/reports |
| DAM file owner | **Confirmed** |
| Notifications Event Bus consumers only | **Confirmed** — no domain→notify commands |

---

## PHASE 0D ARTIFACT APPROVED
