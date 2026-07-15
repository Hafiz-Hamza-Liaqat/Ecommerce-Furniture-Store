# Phase 0C — Enterprise API Contracts & Domain Service Architecture

**Status:** Phase 0A FROZEN · Phase 0B APPROVED · Documentation only  
**Constraints:** No code · No SQL · No HTTP/GraphQL syntax · No frameworks · No redesign  
**Cross-references:** [Master Index](../README.md) · [0A Laws](../00-foundation/phase-0a-enterprise-architecture-laws.md) · [0B Data](./phase-0b-enterprise-data-architecture.md) · [0D Integration](../02-integration/phase-0d-event-bus-integration-saga.md) · [0E Security](../03-security/phase-0e-enterprise-security-architecture.md) · [0F Observability](../04-observability/phase-0f-observability-operations.md) · [Glossary](../glossary.md) · [ADR Index](../decision-records/ADR-INDEX.md)

---

# 1. Service Boundary Map

| Service | Owns (write) | Reads | Publishes | Consumes |
|---------|--------------|-------|-----------|----------|
| **Identity** | users, profiles, sessions/tokens, addresses, employees, teams, attendance, org memberships, partner_profiles, referral_codes, RBAC assignments | companies, branches | `UserRegistered`, `RoleAssigned`, `EmployeeUpdated`, `OrgMemberChanged` | — |
| **Organization / B2B** *(within Identity or thin Org service)* | organizations, credit_accounts, verification subject data | price_lists, media (KYC links) | `OrganizationSubmitted`, `OrganizationVerified` | Approval decisions, Policy |
| **Commerce** | categories, products, variants, collections, materials/attrs, price_lists/items, product_relations, CMS-unrelated catalog | inventory qty (read), media links | `ProductPublished`, `PriceListUpdated`, `CatalogChanged` | Approval (publish), DAM, Search reindex cmds |
| **Inventory** | inventory_items, stock_ledger, reservations, transfers | variants, materials, locations | `StockReserved`, `StockReleased`, `StockAdjusted`, `StockTransferred`, `LowStockDetected` | Order/PO/Production/GRN events |
| **Sales** | carts, wishlists, quotes, quote_versions/lines, sales_orders/lines, invoices/lines, payments/allocations, deliveries, delivery_proofs, installations, attributions, commission_ledger, sales_targets | inventory availability, prices, projects, partners | `QuoteCreated`, `QuoteApproved`, `OrderPlaced`, `OrderCancelled`, `InvoiceIssued`, `PaymentReceived`, `DeliveryScheduled`, `DeliveryCompleted`, `InstallationCompleted`, `CommissionAccrued` | Workflow, Approval, Rules, Inventory replies, Production status |
| **Manufacturing** | production_orders, production_tasks, work_orders (factory), qc_*, defects, rework, cost_sheets/lines, labor_entries, schedule_slots/resources | sales_order lines, BOM, inventory | `ProductionStarted`, `ProductionCompleted`, `QcPassed`, `QcFailed`, `ReworkCreated`, `CostSheetUpdated` | OrderApproved/Advance, Inventory, Workflow |
| **Procurement** | suppliers, PRs, supplier quotes, POs, GRNs, supplier_payments, material_cost_history, scorecards | inventory locations, materials | `PurchaseRequestCreated`, `POApproved`, `GRNReceived`, `SupplierPaid` | Approval, Inventory (on GRN), Workflow |
| **CRM** | leads, activities, notes, conversations/messages, reviews (moderation state), loyalty_* (flagged), notification_preferences; **persists** `notifications` rows | users, orders (read) | `LeadCreated`, `LeadConverted`, `ReviewSubmitted`, `MessagePosted` | Domain events → notification fan-in *(see Notifications)* |
| **Interior Projects** | projects, members, rooms, measurements, proposals, moodboards, furniture_recommendations | products, quotes/orders (read), partners | `ProjectCreated`, `ProjectCompleted`, `ProposalSubmitted`, `MoodboardUpdated` | Workflow, Sales (quote/order create cmds), Rules/AI suggestions |
| **Service Management** | service_requests, repair_jobs, appointments, warranties, warranty_claims, maintenance_reminders, returns/refunds subjects | orders, media | `ServiceRequestCreated`, `RepairCompleted`, `WarrantyClaimFiled`, `RefundRequested` | Workflow, Approval (refund/warranty), Sales/Inventory as needed |
| **CMS** | cms_collections/entries/revisions, ad_campaigns/placements, seo_meta, redirects, care_guides if CMS-backed | DAM | `CmsEntryPublished`, `AdCampaignUpdated`, `SeoUpdated` | Approval (publish), Feature flags (ads) |
| **DAM** | media_assets, versions, tags, links, derivatives | — | `MediaUploaded`, `MediaLinked`, `MediaDeleted` | — |
| **Workflow** | definitions, stages, transitions, instances, instance_events, assignments | subject refs (read-only) | `WorkflowStarted`, `WorkflowTransitioned`, `WorkflowCompleted` | Commands requesting transition; Rules guards; Approval completion |
| **Approval** | approval_requests, approval_actions | subject snapshots | `ApprovalSubmitted`, `ApprovalApproved`, `ApprovalRejected`, `ChangesRequested` | Submit commands from domains |
| **Rules** | rule_sets, rules; evaluation logs | context from caller | `RuleEvaluated` (optional) | Evaluate queries/commands from domains |
| **Policy** | policies, bindings; evaluation logs | RBAC data, flags, approval state | `PolicyDenied` (sensitive) | Authorize every command/query |
| **Reporting** | report_definitions, runs, schedules, dashboard_definitions/widgets, saved_reports | domain metrics/snapshots (read) | `ReportRunCompleted`, `ReportScheduled` | Analytics events/snapshots (read model) |
| **Search** | search_indexed_documents, reindex_queue | domain projections | `SearchIndexUpdated` | Catalog/CMS/Order/etc. change events |
| **Notifications** | *(channel send + uses CRM `notifications` persistence or owns send log)* | templates (Settings), user prefs | `NotificationDispatched` | **All** notifiable domain events via Event Bus |
| **Settings** | settings, document_number_series, feature_flags/overrides, template configs | — | `SettingChanged`, `FeatureFlagChanged` | — |
| **AI Gateway** | ai_modules, ai_jobs, ai_suggestions, ai_feedback | catalog/projects via tools | `AiJobCompleted`, `AiSuggestionCreated` | User/staff requests; never bypasses Policy |
| **Identity RBAC data** | permissions, roles, role_permissions | — | `PermissionModelChanged` | — |

**No duplicated ownership:** Stock writes → Inventory only; stage writes → Workflow only; authz decisions → Policy only; files → DAM only; reports/dashboards → Reporting only; commercial calcs → Rules; human gates → Approval; notifications dispatch → Notifications as Event Bus consumer.

---

# 2. Aggregate Roots & Consistency Boundaries

| Domain | Aggregate roots | Consistency boundary (single TX) |
|--------|-----------------|----------------------------------|
| Identity | `User`, `Organization`, `Employee`, `Team` | User+profile; Org+members; Employee; Team+members |
| Commerce | `Product`, `PriceList`, `Category`, `Collection` | Product+variants+attrs; PriceList+items |
| Inventory | `InventoryItem`, `StockTransfer`, `StockReservation` | Item + ledger entry (+ reservation row); Transfer + lines + ledger |
| Sales | `Cart`, `Quote`, `SalesOrder`, `Invoice`, `Payment`, `Delivery`, `Installation` | Quote+lines+version snapshot; Order+lines; Invoice+lines; Payment+allocations; Delivery+proof metadata |
| Manufacturing | `ProductionOrder`, `WorkOrder`, `QcInspection`, `CostSheet` | PO+tasks create; QC+defects; CostSheet+lines |
| Procurement | `Supplier`, `PurchaseRequest`, `PurchaseOrder`, `Grn` | PR+lines; PO+lines; GRN+lines (**stock ledger via Inventory call/outbox in same process boundary—see §8**) |
| Projects | `Project`, `Moodboard`, `DesignProposal` | Project+members; Moodboard+items; Proposal version |
| Service | `ServiceRequest`, `RepairJob`, `Warranty`, `WarrantyClaim`, `ReturnRequest`, `Refund` | Request; Claim; Return; Refund header |
| CRM | `Lead`, `Conversation`, `Review` | Lead; Conversation+message append; Review |
| CMS | `CmsEntry`, `AdCampaign` | Entry+revision; Campaign+placements |
| DAM | `MediaAsset` | Asset+version (+ derivatives async OK) |
| Workflow | `WorkflowInstance` | Instance + event + projection update on subject (**cross-agg projection in same TX as transition**) |
| Approval | `ApprovalRequest` | Request + action |
| Rules | `RuleSet` | Set + rules |
| Reporting | `ReportDefinition`, `ReportRun`, `DashboardDefinition` | Definition; Run record |
| AI | `AiJob` | Job; suggestions may be same TX |

**Cross-aggregate:** use domain events + outbox; do not span multi-root writes except Workflow projection update paired with transition, and Inventory ledger paired with its reservation/transfer aggregate.

---

# 3. Application Services (responsibilities only)

| Service | Responsibilities |
|---------|------------------|
| **UserService** | Register/invite/suspend users; update profile/addresses; session/token lifecycle |
| **OrganizationService** | Create/update org; submit verification; manage members; maintain credit account fields (limit changes via Approval) |
| **PartnerService** | Upsert partner_profile; referral codes; partner application submit |
| **EmployeeService** / **TeamService** | Employee records; team membership (trades = team_kind); attendance |
| **ProductService** | CRUD products/variants/categories/collections; submit publish approval |
| **PriceListService** | Maintain lists/items; never bypass Rules for runtime price resolution |
| **CatalogQueryService** | Read models for PDP/PLP (queries) |
| **InventoryService** | Reserve/release/adjust/transfer; append ledger; low-stock signals |
| **CartService** / **WishlistService** | Cart/wishlist mutations |
| **QuoteService** | Create/revise quotes; submit approve path; convert to order |
| **SalesOrderService** | Place/cancel orders; drive workflow transitions; attribution attach |
| **InvoiceService** | Issue invoices/credit notes; number series |
| **PaymentService** | Initiate/capture/record payments; allocate; idempotent settle |
| **DeliveryService** / **InstallationService** | Schedule/complete; proofs; OTP verify |
| **CommissionService** | Accrue/settle/clawback ledger from Rules + events |
| **ProductionOrderService** | Create MO; start/complete tasks; priority |
| **WorkOrderService** | Field/factory work orders assign/complete |
| **QcService** | Run inspections; record defects; spawn rework |
| **CostSheetService** | Build/update manufacturing cost sheets |
| **SchedulingService** | Capacity slots/resources |
| **ProcurementService** | PR → RFQ compare → PO → GRN; supplier payments; cost history |
| **ProjectService** | Project lifecycle; members; rooms; measurements |
| **MoodboardService** / **DesignProposalService** | Boards; proposals |
| **RecommendationService** | Persist rule/AI/designer recommendations on project |
| **ServiceRequestService** / **RepairJobService** | Service intake; repair execution hooks |
| **WarrantyService** / **ClaimService** | Warranties; claims |
| **ReturnRefundService** | Returns; refunds (Approval) |
| **LeadService** / **ActivityService** | CRM pipeline |
| **ConversationService** | Chat threads/messages; bot/human handoff flags |
| **ReviewService** | Submit/moderate reviews |
| **CmsService** / **AdService** / **SeoService** | Content; ads; SEO meta/redirects |
| **MediaService** | Upload/version/link/delete assets |
| **WorkflowService** | Start instance; transition; assign; query definition |
| **ApprovalService** | Submit/review/decide approvals |
| **RulesService** | Evaluate rule sets for caller context |
| **PolicyService** | Authorize action (sole runtime gate) |
| **ReportingService** | Register definitions; run/schedule reports; dashboard configs |
| **SearchService** | Query indexes; enqueue reindex |
| **NotificationService** | Consume events; render templates; dispatch channels; write in-app rows |
| **SettingsService** / **FeatureFlagService** | Settings; flags |
| **AiGatewayService** | Enqueue AI jobs; return suggestions via tools under Policy |
| **AuditService** | Append audit entries (called from app services on sensitive ops) |

---

# 4. Command Catalog

*Format: Command · Input (logical) · Validation owner · Workflow · Approval · Events*

### Identity / Org
| Command | Input | Validation | Workflow | Approval | Events |
|---------|-------|------------|----------|----------|--------|
| RegisterUser | email, phone, password, profile | API shape + App | — | — | UserRegistered |
| UpdateUserProfile | userId, fields | App + Policy | — | — | UserProfileUpdated |
| SubmitOrganizationVerification | orgId, docs | App + Policy | optional onboarding WF | Approval type `b2b_registration` | OrganizationSubmitted |
| DecideOrganizationVerification | approvalId, decision | ApprovalService | may complete WF | Approval engine | OrganizationVerified / Rejected |
| AssignUserRole | userId, roleId, scope | App + Policy (SA/AD) | — | — | RoleAssigned |
| UpsertPartnerApplication | partnerType, docs | App | — | partner approval types | PartnerApplicationSubmitted |

### Commerce
| Command | Input | Validation | Workflow | Approval | Events |
|---------|-------|------------|----------|----------|--------|
| CreateProduct / UpdateProduct | product+variants | App | — | — | ProductUpdated |
| SubmitProductPublish | productId | App + Policy | — | `product_publishing` | ProductPublishSubmitted |
| UpdatePriceList | list+items | App + Policy | — | optional price approval | PriceListUpdated |

### Inventory
| Command | Input | Validation | Workflow | Approval | Events |
|---------|-------|------------|----------|----------|--------|
| ReserveStock | ref, lines[] | App + Rules (availability) | — | — | StockReserved |
| ReleaseStock | reservationId/ref | App | — | — | StockReleased |
| AdjustStock | itemId, delta, reason | App + Policy | — | — | StockAdjusted |
| TransferStock | from, to, lines | App | transfer WF optional | — | StockTransferred |

### Sales
| Command | Input | Validation | Workflow | Approval | Events |
|---------|-------|------------|----------|----------|--------|
| CreateQuote | customer/org, lines | App + Rules (price) | start `quote_v1` | — | QuoteCreated |
| ApproveQuote | quoteId | App | transition approve | may be customer or internal | QuoteApproved |
| ConvertQuoteToOrder | quoteId | App + Rules | complete quote; start order WF | — | OrderPlaced |
| CreateSalesOrder | channel, lines, parties | App + Rules + Policy | start `sales_order_fulfillment_v1` | — | OrderPlaced |
| CancelSalesOrder | orderId, reason | App + Policy | transition cancel | maybe | OrderCancelled |
| ReserveStockForOrder | orderId | Inventory cmd | — | — | StockReserved |
| CreateInvoice | orderId/amounts | App | — | — | InvoiceIssued |
| ReceivePayment | amount, method, idempotencyKey | App + Policy | may advance WF | — | PaymentReceived |
| ScheduleDelivery | orderId, window, team | App | delivery WF | — | DeliveryScheduled |
| CompleteDelivery | deliveryId, proof | App | transition complete | — | DeliveryCompleted |
| CompleteInstallation | installationId, proof | App | transition complete | — | InstallationCompleted |
| AccrueCommission | orderId | Rules + App | — | — | CommissionAccrued |

### Manufacturing
| Command | Input | Validation | Workflow | Approval | Events |
|---------|-------|------------|----------|----------|--------|
| CreateProductionOrder | orderLineId, due | App | start manufacturing WF | — | ProductionStarted *(or Created then Started)* |
| StartProduction / CompleteProductionTask | taskId | App | transitions | — | ProductionStarted / TaskCompleted |
| CompleteProduction | productionOrderId | App | terminal stage | — | ProductionCompleted |
| RecordQcInspection | checklist, result | App | QC transition | — | QcPassed / QcFailed |
| CreateRework | defectId | App | rework path | — | ReworkCreated |
| UpsertCostSheet | subject, lines | App | — | — | CostSheetUpdated |

### Procurement
| Command | Input | Validation | Workflow | Approval | Events |
|---------|-------|------------|----------|----------|--------|
| CreatePurchaseRequest | lines | App | PR WF | — | PurchaseRequestCreated |
| CreatePurchaseOrder | supplier, lines | App | PO WF | `purchase_order` | POSubmitted |
| ApprovePO | approval/PO | Approval | transition | Approval | POApproved |
| ReceiveGRN | poId, lines, location | App | GRN complete | — | GRNReceived → Inventory stock in |

### Projects / Service / CRM / CMS
| Command | Input | Validation | Workflow | Approval | Events |
|---------|-------|------------|----------|----------|--------|
| CreateProject | type, client | App | project WF | — | ProjectCreated |
| CompleteProject | projectId | App | terminal | — | ProjectCompleted |
| CreateServiceRequest | type, details | App | service WF | — | ServiceRequestCreated |
| FileWarrantyClaim | warrantyId, details | App | claim WF | warranty approval | WarrantyClaimFiled |
| RequestRefund | invoice/payment, amount | App | refund WF | `refund` | RefundRequested |
| CreateLead | contact, source | App | — | — | LeadCreated |
| PublishCmsEntry | entryId | App | — | `blog_publishing` etc. | CmsEntryPublished |
| UploadMedia | file meta, visibility | App + Policy | — | — | MediaUploaded |

### Workflow / Approval (kernel)
| Command | Input | Validation | Workflow | Approval | Events |
|---------|-------|------------|----------|----------|--------|
| StartWorkflow | definitionCode, subject | Workflow + Policy | creates instance | — | WorkflowStarted |
| TransitionWorkflow | instanceId, transitionCode, comment | Workflow + Rules guard + Policy | **SSoT update** + projection | may require open approval | WorkflowTransitioned |
| SubmitApproval | type, subject, payload | Approval + Policy | — | create request | ApprovalSubmitted |
| DecideApproval | requestId, decision | Approval + Policy | may unblock WF | record action | ApprovalApproved/Rejected |

---

# 5. Query Catalog

| Query | Filters | Pagination | Sort | Security scope |
|-------|---------|------------|------|----------------|
| GetProduct / SearchProducts | category, price, attrs, collection | cursor/limit | newest, price, popularity | Policy; public vs B2B price list |
| GetPriceForVariant | variant, qty, party | — | — | Policy + Rules evaluation |
| GetInventory / SearchInventory | location, sku, low-stock | yes | qty | branch/location Policy |
| GetQuote / ListQuotes | status, party, date | yes | date | own/org/company |
| GetOrder / ListOrders | status, branch, channel | yes | date | scoped |
| GetInvoice / ListInvoices | party, status, date | yes | date | scoped |
| GetProductionBoard | stage, branch, team | yes | due | Manufacturing Policy |
| GetWorkQueue | team, type, date | yes | schedule | assigned/team |
| GetProject / ListProjects | type, status, partner | yes | date | member/company |
| GetServiceRequests | type, status | yes | date | own/staff |
| GetApprovalsInbox | type, status | yes | date | reviewer Policy |
| GetWorkflowInstance | subject | — | — | Policy |
| GetDashboard | role, branch, dateRange | — | — | **Reporting** + Policy |
| GetReport / RunReportQuery | report code, params | — | — | Reporting + Policy |
| SearchGlobal | index, q | yes | relevance | Policy filtered indexes |
| GetCmsEntry / ListCms | collection, status | yes | publish date | public vs editor |
| GetMediaAsset | id | — | — | DAM visibility + Policy |
| GetNotifications | unread | yes | date | own user |
| GetAiSuggestions | subject | yes | date | Policy |

---

# 6. API Resource Catalog (logical)

```
/companies
/branches /locations
/users /users/{id} /users/{id}/addresses
/organizations /organizations/{id} /organizations/{id}/members
/partners /referral-codes
/employees /teams /attendance
/roles /permissions /user-roles
/policies
/categories /products /products/{id} /variants
/collections /price-lists
/inventory /inventory/{id} /stock-reservations /stock-transfers /stock-ledger
/carts /wishlists
/quotes /quotes/{id} /quotes/{id}/versions
/orders /orders/{id}
/invoices /invoices/{id}
/payments
/deliveries /installations
/commissions /sales-targets
/production-orders /production-tasks /work-orders
/qc-inspections /defects /rework-orders /cost-sheets /schedules
/suppliers /purchase-requests /purchase-orders /grns /supplier-payments
/projects /projects/{id}/rooms /measurements /moodboards /proposals /recommendations
/service-requests /repair-jobs /appointments /warranties /warranty-claims /returns /refunds
/leads /activities /notes /conversations /messages /reviews
/cms/entries /ads /seo /redirects
/media /media/{id}
/workflows /workflows/{id}/transitions
/approvals
/rules/evaluate
/reports /report-runs /dashboards /saved-reports
/search
/notifications /notification-preferences
/settings /feature-flags
/ai/jobs /ai/suggestions
/audit-logs
```

Resources are logical groupings for contracts; transport mapping is Phase 0D+.

---

# 7. Validation Ownership

| Layer | Validates |
|-------|-----------|
| **API (edge)** | Presence, types, formats, pagination limits, idempotency key presence where required |
| **Application Service** | Entity existence, aggregate invariants, cross-field business checks not owned elsewhere |
| **Policy Engine** | Whether principal may perform action on resource (sole authz) |
| **Rules Engine** | Prices, MOQ, discounts, commission amounts, delivery fees, warranty duration, priority scores |
| **Workflow Engine** | Legal transitions, stage guards wiring, instance state |
| **Approval Engine** | Request completeness; reviewer decision authority (with Policy) |

**Order of a mutating command:** Edge validate → Policy authorize → App load aggregate → Rules (if needed) → Approval gate (if needed) → Workflow transition (if needed) → Persist → Outbox events → Audit.

---

# 8. Transaction Boundaries

### Single transaction
- Aggregate write + row stamps  
- Workflow transition + `workflow_instance_events` + **subject status projection**  
- Inventory aggregate + **stock_ledger** entry (+ reservation row)  
- Approval decision + approval_action  
- Payment settle + allocations (with idempotency key)  
- Outbox insert **in same TX** as aggregate commit  

### Eventual consistency (after outbox)
- Notifications, Search reindex, Analytics snapshots, Reporting materialization, AI follow-ups, cross-domain reactions (e.g. OrderPlaced → CreateProductionOrder policy)

### Forbidden in one TX
- Multi-domain multi-root graphs (Sales + Procurement + CMS)  
- External payment provider confirmation as long-running lock without idempotency  

### Audit
- Sensitive commands write `audit_logs` in the same TX as the mutation when practical; otherwise immediate follow-up TX linked by correlation id.

---

# 9. Event Catalog

| Event | Producer | Consumers |
|-------|----------|-----------|
| UserRegistered | Identity | CRM, Notifications, Search |
| OrganizationSubmitted | Identity/Org | Approval, Notifications |
| OrganizationVerified | Approval/Org | Identity role grant, Notifications, Search |
| ProductUpdated / ProductPublished | Commerce | Search, CMS/SEO optional, Notifications (internal) |
| PriceListUpdated | Commerce | Cache/Search facets |
| StockReserved / Released / Adjusted / Transferred | Inventory | Sales, Manufacturing, Notifications (low stock), Analytics |
| LowStockDetected | Inventory | Notifications, Reporting metrics |
| QuoteCreated / QuoteApproved | Sales | Notifications, CRM, Workflow already applied |
| OrderPlaced | Sales | Inventory reserve, Manufacturing foreshadow, Commission attribution, Search, Analytics, Notifications, Audit |
| OrderCancelled | Sales | Inventory release, Commission clawback, Notifications |
| InvoiceIssued | Sales | Notifications, Reporting, Search |
| PaymentReceived | Sales | Workflow advance, Credit account, Commission, Notifications, Analytics |
| DeliveryScheduled / DeliveryCompleted | Sales | Notifications, Workflow, Analytics |
| InstallationCompleted | Sales | Notifications, Warranty create, Workflow, Analytics |
| CommissionAccrued / CommissionPaid | Sales | Notifications, Analytics |
| ProductionStarted / ProductionCompleted | Manufacturing | Sales WF, Notifications, Analytics, Inventory consume |
| QcPassed / QcFailed | Manufacturing | Workflow, Notifications, Rework |
| CostSheetUpdated | Manufacturing | Analytics/Reporting metrics |
| PurchaseRequestCreated | Procurement | Notifications |
| POApproved | Procurement | Notifications, Supplier flows |
| GRNReceived | Procurement | **Inventory** stock in, Cost history, Analytics |
| ProjectCreated / ProjectCompleted | Projects | Notifications, Analytics, CRM |
| ServiceRequestCreated / RepairCompleted | Service | Notifications, Workflow |
| WarrantyClaimFiled | Service | Approval, Notifications |
| RefundRequested / RefundCompleted | Service/Sales | Approval, Payments, Commission clawback, Notifications |
| LeadCreated / LeadConverted | CRM | Notifications, Analytics |
| ReviewSubmitted | CRM | Moderation, Notifications |
| CmsEntryPublished | CMS | Search, SEO, Notifications optional |
| MediaUploaded / MediaLinked | DAM | Search (DAM index) |
| WorkflowStarted / Transitioned / Completed | Workflow | Subject owners already projecting; Analytics; Notifications on selected transitions |
| ApprovalSubmitted / Approved / Rejected | Approval | Subject services resume; Notifications |
| ReportRunCompleted | Reporting | Notifications |
| SearchIndexUpdated | Search | — |
| NotificationDispatched | Notifications | Audit optional |
| AiJobCompleted / AiSuggestionCreated | AI | Projects/CRM UI |
| FeatureFlagChanged / SettingChanged | Settings | runtime config consumers |
| PolicyDenied | Policy | Audit, security monitoring |

---

# 10. Error Model (logical categories)

| Category | Meaning |
|----------|---------|
| Validation | Malformed/incomplete input |
| Authorization | Policy deny |
| Not Found | Unknown aggregate/resource |
| Conflict | Version/idempotency/concurrency conflict |
| Workflow violation | Illegal transition or missing instance |
| Rule violation | Rules Engine reject (MOQ, credit, price) |
| Approval pending | Mutation blocked until decision |
| Business rule failed | App invariant (e.g. cannot invoice zero lines) |
| Dependency failed | Downstream eventual handler retry exhaustion (async) |

---

# 11. Idempotency Rules

| Command class | Idempotency |
|---------------|-------------|
| ReceivePayment / payment capture | **Required** (`idempotency_key`) |
| CreateInvoice | Required per order+type or key |
| ApprovePO / DecideApproval | Required (decision key / single-decision guard) |
| ReceiveGRN | Required per PO receipt key |
| ReserveStock | Required per order/ref |
| TransitionWorkflow | Required per (instanceId, transitionCode, idempotencyKey) or monotonic stage guard |
| ConvertQuoteToOrder | Required (one order per quote version) |
| CreateSalesOrder (client retry) | Recommended key |
| ReportRun | Recommended |
| AiJob create | Recommended |

Safe retries must not double stock, double pay, or double commission.

---

# 12. Authorization Matrix (application services)

*Runtime: Policy Engine only. RBAC = data.*

| Application service | Permission (typical) | Policy checks | Ownership | Feature flags | Approval state |
|---------------------|----------------------|---------------|-----------|---------------|----------------|
| ProductService.write | product.create/update | action+resource | company | — | publish needs approval cleared |
| PriceListService | price.edit | + high-risk audit | company | — | optional |
| InventoryService.adjust | inventory.adjust | location scope | branch/location | — | — |
| QuoteService | quote.* | party scope | own/org/assigned | — | — |
| SalesOrderService | order.* | scope | own/org/branch | `online_payments` if paying online | — |
| PaymentService | payment.receive | strict | company/finance | `online_payments` | — |
| InvoiceService | invoice.* | scope | company | — | — |
| Delivery/Installation | delivery.update / install.update | assigned | team/user | — | — |
| ProductionOrderService | production.manage | branch | branch | — | — |
| ProcurementService.PO | po.* | company | company | — | PO approve pending blocks receive |
| ProjectService | project.* | member | project members | — | — |
| Refund commands | refund.approve | high-risk | company | — | Approval approved |
| CmsService.publish | cms.publish | editor/admin | company | — | publish approval if configured |
| AdService | ad.manage | admin/moderator | company | `custom_ads` / `adsense` | — |
| MediaService | media.* | visibility | uploader/company | — | KYC restricted = kyc.view |
| ReportingService | analytics/report perms | role dashboards | scoped | — | — |
| AiGatewayService | ai.use | tool-level Policy | user | `ai_assistant` etc. | — |
| WorkflowService.transition | per subject perm | + transition | as subject | — | blocks if approval required open |
| ApprovalService.decide | per approval type | reviewer | inbox | — | — |
| Organization verify decide | b2b.approve | admin | company | — | — |

---

# 13. Long-running Process Map

```text
CreateQuote
  → Workflow(quote) + Rules(price)
  → [Approval if internal]
  → QuoteApproved
  → ConvertQuoteToOrder / CreateSalesOrder
  → Workflow(sales_order_fulfillment_v1)   ← SSoT
  → ReserveStock (Inventory)
  → [Advance PaymentReceived → Workflow advance]
  → CreateProductionOrder (if MTO/custom)
  → Manufacturing WF (carpentry→paint→polish→QC)
  → QcPassed / Rework loop
  → Pack/Dispatch stages
  → ScheduleDelivery → DeliveryCompleted
  → CompleteInstallation (if required)
  → CreateInvoice → PaymentReceived (balance)
  → CommissionAccrued → (later) paid
  → Warranty create / Analytics metrics
  → Reporting dashboards (read)
  → Notifications (event handlers)
  → Audit (sensitive nodes)
```

Parallel: Procurement PO/GRN feeds Inventory for materials before/during production.  
Projects may spawn multiple quotes/orders under same pattern.  
Service/repair uses analogous WF without full manufacturing as needed.

---

# 14. Cross-domain Dependency Matrix

| From → To | Allowed? | Notes |
|-----------|----------|-------|
| Sales → Inventory | ✔ commands/events | reserve/release |
| Sales → Workflow/Rules/Approval/Policy | ✔ | |
| Sales → Manufacturing | ✔ events/commands | create MO |
| Manufacturing → Inventory | ✔ | consume/issue |
| Procurement → Inventory | ✔ | GRN in |
| Procurement → Approval/Workflow | ✔ | |
| Projects → Sales | ✔ | create quote/order |
| Service → Sales/Inventory/Approval | ✔ | |
| All domains → Policy, DAM, Settings | ✔ | |
| All domains → Workflow (own subjects) | ✔ | |
| Domains → Notifications | ✖ direct | publish events only |
| Domains → Reporting writes | ✖ | metrics events; Reporting owns reports |
| Domains → Search writes | ✖ | events → Search service |
| Inventory → Sales | ✔ read/events only | no order mutation |
| Manufacturing → Sales | ✔ events (status); Sales owns order projection via WF |
| CMS → Commerce | ✔ read products; no price writes |
| AI → domains | ✔ read tools under Policy; write suggestions only |
| Cyclic Sales⇄Manufacturing writes | ✖ | event-driven one way for creation; status via Workflow |

**No cyclic write ownership.** Read-only cycles acceptable.

---

# 15. Documentation Validation

| Check | Result |
|-------|--------|
| Phase 0A Architecture Laws | Aligned (Workflow SSoT, Policy runtime, Rules calcs, DAM files, Event notifications, Reporting ownership, Flags, no duplicate engines) |
| Phase 0B ERD | Commands/events map to approved entities/aggregates |
| Ownership rules | Service map unique writers |
| Workflow SSoT | Transitions sole lifecycle authority; projections in TX |
| Policy Engine | Sole runtime authz in §7/§12 |
| Reporting ownership | Dashboards/reports under Reporting service |
| Event ownership | Producers unique; Notifications consumer-only for dispatch |
| DAM ownership | MediaService sole file writer |
| Rules ownership | Pricing/MOQ/commission via RulesService |
| No duplicate business engines | Confirmed in boundary map |

---

## PHASE 0C ARTIFACT APPROVED
