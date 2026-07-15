# Phase 0B — Enterprise ERD (Documentation Only) / Enterprise Data Architecture

**Status:** PHASE 0B APPROVED / FROZEN  
**Mode:** Documentation only — logical ERD; no executable SQL DDL  
**Product:** Artisan Furnish Hub (Furniture Business Operating System)

**Cross-references:** [Master Index](../README.md) · [0A Laws](../00-foundation/phase-0a-enterprise-architecture-laws.md) · [0C Services](phase-0c-enterprise-domain-service-architecture.md) · [0D Integration](../02-integration/phase-0d-event-bus-integration-saga.md) · [0E Security](../03-security/phase-0e-enterprise-security-architecture.md) · [0F Observability](../04-observability/phase-0f-observability-operations.md) · [Glossary](../glossary.md) · [ADR Index](../decision-records/ADR-INDEX.md)

**Charter:** Complete logical database architecture for Artisan Furnish Hub (furniture business OS). Reproduces the approved Phase 0B Enterprise ERD artifact without redesign.

---

## 0. Global Conventions

### 0.1 Tenancy & location

| Field | Rule |
|-------|------|
| `company_id` | **Required** on all tenant-owned business tables (UUID FK → `companies`) |
| `branch_id` | Required where operations are branch-scoped; nullable only if truly company-global |
| `location_id` | Physical place (warehouse / showroom / workshop / office) under a branch |

### 0.2 Primary keys

- All tables: `id` UUID PK (unless noted as pure join table with composite PK)
- Prefer UUID v7 or ULID-compatible time-sortable IDs at implementation (logical: UUID)

### 0.3 Soft delete

| Strategy | Tables |
|----------|--------|
| Soft delete (`deleted_at` timestamptz null) | Catalog, CMS, users (deactivate preferred), orgs, products, projects, non-financial masters |
| **No soft delete** (immutable / append-only) | `audit_logs`, `stock_ledger_entries`, `commission_ledger_entries`, `payment` settled rows, `policy_evaluation_logs` (optional), `domain_events` / `outbox` processed archives |
| Status deactivate | Prefer `status=inactive` for User, PriceList, FeatureFlag override |

### 0.4 Audit

| Requirement | Rule |
|-------------|------|
| Row stamps | `created_at`, `updated_at`, `created_by`, `updated_by` on mutable business tables |
| Business audit | `audit_logs` for money, stock, permissions, approvals, policy denies on sensitive actions, KYC access |
| Workflow | All stage changes via workflow tables (SSoT); projections updated in same transaction |

### 0.5 Security classification

| Class | Examples | Storage notes |
|-------|----------|---------------|
| `public` | Product images, CMS, portfolio | CDN OK |
| `authenticated` | Own orders, invoices | API auth |
| `internal` | Cost sheets, supplier prices | Staff Policy |
| `restricted` | CNIC, tax docs, KYC | DAM restricted + encryption at rest |
| `secret` | Gateway keys, tokens | Settings secrets vault; never in plain logs |

Column-level: mark PII/KYC fields in ERD notes below.

### 0.6 Status fields

- `status` / `status_label` on lifecycle entities = **read-only projection** of Workflow (Phase 0A Law)
- Canonical stage = `workflow_instances.current_stage_id`

### 0.7 Naming

- Tables: `snake_case` plural  
- FKs: `{table_singular}_id`  
- Enums: documented as CHECK or enum types (logical)

---

# 1. Platform Kernel

## 1.1 Company & settings foundation

### `companies`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| legal_name, trade_name | varchar | |
| tax_id | varchar null | PII/business |
| default_locale, default_currency | varchar | D22/D23 deferred values |
| status | varchar | active/inactive |
| created_at, updated_at | timestamptz | |

**Unique:** none global beyond PK  
**Soft delete:** no (status only)

### `settings`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID FK companies | |
| key | varchar | e.g. `invoice.prefix` |
| value_json | jsonb | |
| is_secret | boolean | secret class if true |
| branch_id | UUID null FK | branch override |

**Unique:** `(company_id, key, branch_id)` (null branch = company default)  
**Classification:** secret if `is_secret`

### `document_number_series`
| Column | Type |
|--------|------|
| id | UUID PK |
| company_id, branch_id null | FKs |
| doc_type | varchar | invoice, po, challan… |
| prefix, next_value, pad_length | |

**Unique:** `(company_id, branch_id, doc_type)`

---

## 1.2 RBAC

### `permissions`
| Column | Notes |
|--------|------|
| id PK | |
| code | unique globally e.g. `product.create` |
| module, description | |

### `roles`
| Column | Notes |
|--------|------|
| id PK | |
| company_id null | null = system role template |
| code | `super_admin`, `admin`, `customer`… |
| name, is_system | |

**Unique:** `(company_id, code)`  

### `role_permissions`
| PK | `(role_id, permission_id)` |
| FK | roles, permissions |

### `user_roles`
| Column | Notes |
|--------|------|
| id PK | |
| company_id, user_id, role_id | FKs |
| scope_type | company \| branch \| organization \| own |
| scope_id | UUID null | branch/org id when scoped |
| valid_from, valid_to null | |

**Indexes:** `(user_id, company_id)`, `(role_id)`  
**Audit:** assignment changes → audit_logs

---

## 1.3 Policy Engine

### `policies`
| Column | Notes |
|--------|------|
| id PK, company_id null | system vs tenant |
| code, name | |
| effect | allow \| deny |
| action | varchar | mirrors permission or custom |
| resource_type | varchar |
| condition_json | jsonb | ownership, attrs |
| priority | int | deny wins via evaluation order |
| status | active/inactive |

### `policy_bindings`
| Column | Notes |
|--------|------|
| id PK, company_id | |
| policy_id | FK |
| principal_type | role \| user |
| principal_id | UUID |

### `policy_evaluation_logs` *(optional sampling / sensitive)*
| Column | Notes |
|--------|------|
| id PK, company_id, user_id | |
| action, resource_type, resource_id | |
| decision, reason_code | |
| created_at | append-only |

**No soft delete** on evaluation logs.

---

## 1.4 Workflow Engine

### `workflow_definitions`
| Column | Notes |
|--------|------|
| id PK, company_id null | system defaults + tenant overrides |
| code | `sales_order_fulfillment_v1` etc. |
| name, version | int |
| entity_type | sales_order, repair_job… |
| is_active | bool |

**Unique:** `(company_id, code, version)`

### `workflow_stages`
| Column | Notes |
|--------|------|
| id PK, workflow_definition_id FK | |
| code, name, sort_order | |
| sla_hours null | |
| is_terminal | bool |

**Unique:** `(workflow_definition_id, code)`

### `workflow_transitions`
| Column | Notes |
|--------|------|
| id PK, workflow_definition_id | |
| from_stage_id, to_stage_id | FK stages |
| code | |
| guard_rule_set_id null | FK rule_sets |
| requires_approval_type null | links Approval |

**Unique:** `(workflow_definition_id, from_stage_id, to_stage_id, code)`

### `workflow_instances`
| Column | Notes |
|--------|------|
| id PK, company_id | |
| workflow_definition_id | |
| subject_type, subject_id | polymorphic |
| current_stage_id | **SSoT** |
| started_at, completed_at null | |
| status | running\|completed\|cancelled | projection helper |

**Unique:** active instance per `(company_id, subject_type, subject_id, workflow_definition_id)` where running (partial unique)

### `workflow_instance_events`
| Column | Notes |
|--------|------|
| id PK, instance_id | |
| from_stage_id, to_stage_id | |
| actor_user_id null | |
| comment, metadata_json | |
| created_at | append-only |

### `workflow_assignments`
| Column | Notes |
|--------|------|
| id PK, instance_id | |
| stage_id | |
| team_id null, user_id null | |
| assigned_at | |

---

## 1.5 Approval Engine

### `approval_requests`
| Column | Notes |
|--------|------|
| id PK, company_id, branch_id null | |
| type | b2b_registration, refund, po… |
| subject_type, subject_id | |
| status | submitted\|under_review\|approved\|rejected\|changes_requested | **via workflow or internal approval SM** — Approval Engine owns approval lifecycle; may use dedicated approval workflow definition |
| payload_json | snapshot |
| submitted_by, reviewed_by null | |
| decision_reason null | |
| created_at, updated_at | |

**Indexes:** `(company_id, status, type)`, `(subject_type, subject_id)`

### `approval_actions`
| Column | Notes |
|--------|------|
| id PK, approval_request_id | |
| actor_user_id, action | |
| comment, created_at | append-only |

---

## 1.6 Rules Engine

### `rule_sets`
| Column | Notes |
|--------|------|
| id PK, company_id | |
| code, name, domain | commission, moq, delivery_fee, warranty… |
| status | |

**Unique:** `(company_id, code)`

### `rules`
| Column | Notes |
|--------|------|
| id PK, rule_set_id | |
| priority, condition_json, action_json | |
| status, valid_from/to null | |

### `rule_evaluation_logs`
| append-only optional: company_id, rule_id, context_json, result_json, created_at |

---

## 1.7 DAM

### `media_assets`
| Column | Notes |
|--------|------|
| id PK, company_id | |
| title, alt_text | |
| kind | product_image, cad, kyc_doc… |
| visibility | public\|authenticated\|restricted\|internal |
| security_class | mirrors visibility |
| mime_type, byte_size, checksum | |
| storage_key | |
| current_version | int |
| uploaded_by | FK users |
| created_at, updated_at, deleted_at | soft |

**Indexes:** `(company_id, kind)`, GIN tags via junction

### `media_versions`
| id PK, media_asset_id, version_no, storage_key, checksum, created_by, created_at |  
**Unique:** `(media_asset_id, version_no)`

### `media_tags` / `media_asset_tags`
| tag master + M:N |

### `media_links`
| Column | Notes |
|--------|------|
| id PK, media_asset_id | |
| company_id | |
| entity_type, entity_id | polymorphic |
| role | primary, gallery, before, after, proof… |
| sort_order | |

**Indexes:** `(entity_type, entity_id)`, `(media_asset_id)`

### `media_derivatives`
| id, media_asset_id, variant (thumb/card/zoom), storage_key, width, height |

---

## 1.8 Feature Flags

### `feature_flags`
| id, company_id null, code unique(company_id,code), description, default_enabled |

### `feature_flag_overrides`
| id, feature_flag_id, company_id, branch_id null, user_id null, enabled, updated_at |  
**Unique:** `(feature_flag_id, company_id, branch_id, user_id)`

---

## 1.9 Event / Outbox

### `domain_events`
| id PK, company_id, event_type, aggregate_type, aggregate_id, payload_json, metadata_json, created_at | append-only |

### `outbox_messages`
| id PK, company_id, event_id null, topic, payload_json, status (pending\|published\|failed), attempts, next_attempt_at, created_at, published_at null |  
**Indexes:** `(status, next_attempt_at)`  

### `inbox_processed` *(idempotency for consumers)*
| consumer_name, event_id, processed_at | PK `(consumer_name, event_id)` |

---

## 1.10 Reporting

### `report_definitions`
| id, company_id, code, name, module, query_key, param_schema_json, status |  
**Unique:** `(company_id, code)`  
**Ownership:** Reporting Framework (Phase 0A)

### `report_runs`
| id, report_definition_id, requested_by, params_json, status, result_media_asset_id null, created_at, completed_at |

### `report_schedules`
| id, report_definition_id, cron, recipients_json, params_json, status |

### `dashboard_definitions`
| id, company_id, code, role_code null, layout_json | Reporting-owned dashboards |

### `dashboard_widgets`
| id, dashboard_definition_id, widget_type, metric_key, config_json, sort_order |

### `saved_reports`
| id, company_id, user_id, report_definition_id, name, params_json |

---

## 1.11 Search (metadata; index tech in 0D)

### `search_indexed_documents`
| id, company_id, index_name, entity_type, entity_id, title, body_text, facets_json, updated_at, deleted_at |  
**Unique:** `(company_id, index_name, entity_type, entity_id)`  
**Indexes:** company+index+entity; full-text TBD in 0D  

### `search_reindex_queue`
| id, company_id, entity_type, entity_id, status, created_at |

---

## 1.12 AI Gateway stubs

### `ai_modules`
| id, code unique, name, status |

### `ai_jobs`
| id, company_id, ai_module_id, requested_by, input_json, status, result_json null, error null, created_at, completed_at |

### `ai_suggestions`
| id, company_id, ai_job_id null, subject_type, subject_id, suggestion_type, payload_json, accepted null, created_at |

### `ai_feedback`
| id, suggestion_id, user_id, rating, comment, created_at |

---

## 1.13 Audit

### `audit_logs`
| id, company_id, actor_user_id null, action, entity_type, entity_id, before_json, after_json, ip, user_agent, created_at |  
**Append-only · no soft delete · partition by created_at recommended**  
**Indexes:** `(company_id, created_at)`, `(entity_type, entity_id)` |

---

# 2. Identity & Organization

## 2.1 Users & profiles

### `users`
| id PK | |
| company_id null | platform user may span; membership via user_roles/org | For v1 single company, still set company home |
| email | unique where not deleted |
| phone | PII |
| password_hash | secret |
| status | active\|invited\|suspended |
| locale, mfa_enabled | |
| created_at, updated_at, deleted_at | |

**Unique:** `lower(email)` where deleted_at is null  
**PII:** email, phone  

### `person_profiles`
| user_id PK/FK, full_name, cnic_encrypted null (KYC restricted), avatar_media_id null, created_at, updated_at |

### `addresses`
| id, company_id, user_id null, organization_id null, label, line1, line2, city, region, postal, country, geo_json null, is_default, deleted_at | PII |

### `sessions` / `api_tokens`
| id, user_id, token_hash, expires_at, revoked_at, created_at | secret hashes |

---

## 2.2 Organizations (B2B & partners)

### `organizations`
| id, company_id, type | b2b_buyer\|furniture_shop\|wholesaler\|contractor_firm\|other |
| legal_name, trade_name, registration_no, tax_number | PII/business |
| verification_status | projection / approval |
| credit_limit, price_list_id null | |
| primary_branch_id null | |
| status, deleted_at | |

**Indexes:** `(company_id, type, verification_status)`

### `organization_members`
| id, organization_id, user_id, member_role, is_owner, status |  
**Unique:** `(organization_id, user_id)` |

### `partner_profiles`
| id, company_id, user_id, partner_type | agent\|interior_designer\|architect\|civil_engineer\|contractor |
| organization_id null | |
| bio, portfolio_url null, status | |
**Unique:** `(company_id, user_id, partner_type)` |

### `referral_codes`
| id, company_id, partner_profile_id, code unique(company_id,code), status |

### `organization_documents` → prefer `media_links` to org + kind=kyc  

### `credit_accounts`
| id, company_id, organization_id unique, credit_limit, balance, currency, updated_at | internal |

---

## 2.3 Branches & locations

### `branches`
| id, company_id, code, name, city, status, deleted_at |  
**Unique:** `(company_id, code)` |

### `locations`
| id, company_id, branch_id, type | warehouse\|showroom\|workshop\|office |
| code, name, address_id null, status, deleted_at |  
**Unique:** `(company_id, branch_id, code)` |

### `showrooms` / `warehouses` / `workshop_zones`
Optional 1:1 extension tables on `locations` for type-specific attrs (display capacity, zone kind carpentry/paint/polish).

**Cardinality:** Company 1—N Branch 1—N Location  

---

## 2.4 Employees & teams

### `employees`
| id, company_id, user_id unique(company_id,user_id), employee_code, branch_id, department, manager_employee_id null, status, hired_at, deleted_at |  
**Unique:** `(company_id, employee_code)` |

### `teams`
| id, company_id, branch_id null, code, name, team_kind | delivery\|installation\|carpenter\|paint\|polish\|warehouse\|other |
| status |  

**Unique:** `(company_id, code)`  
**Note:** Carpenter/Painter/Polisher = team_kind + membership, **not** RBAC roles  

### `team_members`
| id, team_id, employee_id, is_lead, status |  
**Unique:** `(team_id, employee_id)` |

### `attendance_records`
| id, company_id, employee_id, work_date, check_in, check_out null, status, branch_id |  
**Unique:** `(employee_id, work_date)` |

---

# 3. Commerce (Catalog & Inventory)

### `categories`
| id, company_id, parent_id null, slug, name, sort_order, status, deleted_at |  
**Unique:** `(company_id, slug)` |

### `collections`
| id, company_id, slug, name, status, deleted_at | unique `(company_id, slug)` |

### `brands` *(optional)*
| id, company_id, name, slug |

### `wood_types` / `fabrics` / `colors` / `finishes` / `materials`
| id, company_id, code, name, attrs_json, status | unique `(company_id, code)`  
`materials` may FK wood/fabric etc. via attrs or child FKs  

### `products`
| id, company_id, category_id, brand_id null, slug, name, description, product_type | ready\|mto\|customizable |
| status_projection, published_at null, deleted_at | publish via Approval |
| seo via seo_meta |

**Unique:** `(company_id, slug)`  
**Indexes:** `(company_id, category_id)`, `(company_id, status_projection)`

### `product_variants`
| id, company_id, product_id, sku, name, wood_type_id null, fabric_id null, color_id null, dimensions_json, weight null, barcode null, status, deleted_at |  
**Unique:** `(company_id, sku)` ; barcode unique where not null  

### `product_collection_items`
| product_id, collection_id | PK composite |

### `product_attributes` / EAV optional: product_id, key, value  

### `product_relations` *(recommendations)*
| id, company_id, product_id, related_product_id, relation_type | upsell\|cross_sell\|bundle\|alternate |
| sort_order |  
**Unique:** `(product_id, related_product_id, relation_type)` |

### `price_lists`
| id, company_id, code, name, list_type | retail\|wholesale\|dealer\|trade |
| currency, status, deleted_at | unique `(company_id, code)` |

### `price_list_items`
| id, price_list_id, variant_id, unit_price, compare_at null, min_qty (MOQ), valid_from/to null |  
**Unique:** `(price_list_id, variant_id, min_qty, valid_from)`  

### `discount_rules` → prefer Rules Engine `rule_sets` domain=discount; optional cache table  

### `inventory_items`
| id, company_id, location_id, variant_id null, material_id null, quantity_on_hand, quantity_reserved, reorder_level null, updated_at |  
**Check:** exactly one of variant_id or material_id  
**Unique:** `(location_id, variant_id)` WHERE variant NOT NULL; `(location_id, material_id)` WHERE material NOT NULL  

### `stock_ledger_entries`
| id, company_id, inventory_item_id, location_id, entry_type | in\|out\|adjust\|damage\|transfer_in\|transfer_out\|reserve\|release |
| quantity_delta, quantity_after, reference_type, reference_id, reason, actor_user_id, created_at |  
**Append-only · Architecture Law: only path to stock change**  
**Indexes:** `(inventory_item_id, created_at)`, `(reference_type, reference_id)` |

### `stock_reservations`
| id, company_id, inventory_item_id, quantity, reference_type, reference_id, status, expires_at, created_at |

### `stock_transfers`
| id, company_id, from_location_id, to_location_id, status_projection, requested_by, created_at | + `stock_transfer_lines` |

### `bom_headers` / `bom_lines`
| product_variant_id or custom subject; material_id, qty, unit | for costing/production |

### `suppliers` — see Procurement §8 (shared)

---

# 4. Sales

### `carts` / `cart_items`
| cart: id, company_id, user_id null, organization_id null, currency, updated_at |  
| items: cart_id, variant_id, qty, unit_price_snapshot |

### `wishlists` / `wishlist_items`
| user_id, variant_id | unique pair |

### `quotes`
| id, company_id, branch_id, number, customer_user_id null, organization_id null, project_id null, currency, totals_json, status_projection, valid_until, version, created_by, deleted_at |  
**Unique:** `(company_id, number)`  
**Lifecycle:** workflow `quote_v1` |

### `quote_lines`
| id, quote_id, line_type, variant_id null, description, qty, unit_price, tax_json, metadata_json |

### `quote_versions`
| id, quote_id, version_no, snapshot_json, created_at | unique `(quote_id, version_no)` |

### `sales_orders`
| id, company_id, branch_id, number, channel | web\|showroom\|b2b\|project |
| customer_user_id null, organization_id null, project_id null, quote_id null |
| currency, subtotal, tax, total, advance_required null |
| fulfillment_location_id null, shipping_address_id null |
| status_projection, attribution_partner_profile_id null |
| placed_at, deleted_at null | soft only if voided draft policy |

**Unique:** `(company_id, number)`  
**Workflow:** `sales_order_fulfillment_v1` (default definition from Phase 0A chains)  
**Indexes:** `(company_id, status_projection)`, `(customer_user_id)`, `(organization_id)`, `(branch_id, placed_at)` |

### `sales_order_lines`
| id, sales_order_id, line_type | product\|custom\|service |
| variant_id null, description, qty, unit_price, cost_snapshot null, metadata_json |

### `invoices`
| id, company_id, branch_id, number, sales_order_id null, organization_id null, user_id null, currency, totals, status_projection, issued_at, due_at, pdf_media_id null |  
**Unique:** `(company_id, number)` |

### `invoice_lines`
| id, invoice_id, description, qty, unit_price, tax_json |

### `payments`
| id, company_id, provider_code, method, amount, currency, status, external_ref null, idempotency_key null, paid_at null, metadata_json |  
**Unique:** `(company_id, idempotency_key)` where not null  
**Deferred providers D07** — `provider_code` extensible |

### `payment_allocations`
| id, payment_id, invoice_id, amount |  

### `deliveries`
| id, company_id, branch_id, sales_order_id, work_order_id null, location_from_id, status_projection, scheduled_at, delivered_at null, team_id null |  
**Workflow:** `delivery_v1` |

### `delivery_proofs`
| id, delivery_id, otp_hash null, signature_media_id null, photo links via media_links, captured_at, captured_by |

### `installations`
| id, company_id, sales_order_id, work_order_id null, status_projection, scheduled_at, completed_at null, team_id null |  
**Workflow:** `installation_v1` |

### `commission_rules` → Rules Engine  
### `commission_ledger_entries`
| id, company_id, partner_profile_id, sales_order_id null, entry_type | pending\|payable\|paid\|clawback |
| amount, currency, status, created_at, settled_at null | append-oriented |

### `sales_targets`
| id, company_id, partner_profile_id null, branch_id null, period_start, period_end, target_amount |

### `attributions`
| id, company_id, sales_order_id, partner_profile_id, role_weight, source | D19 deferred logic |

---

# 5. Manufacturing

### `production_orders`
| id, company_id, branch_id, number, sales_order_id null, sales_order_line_id null, location_workshop_id, status_projection, bom_header_id null, priority, due_at, created_at |  
**Workflow:** manufacturing stages as definition  
**Unique:** `(company_id, number)` |

### `production_tasks`
| id, production_order_id, stage_code, team_id null, assignee_employee_id null, status_projection, started_at, completed_at |

### `work_orders`
| id, company_id, branch_id, number, work_type | delivery\|installation\|repair\|internal |
| subject_type, subject_id, team_id null, status_projection, scheduled_at |  
**Unique:** `(company_id, number)` |

### `qc_checklists` / `qc_checklist_items`
| template per process |

### `qc_inspections`
| id, company_id, production_order_id null, work_order_id null, checklist_id, inspector_employee_id, result | pass\|fail |
| inspected_at, notes |

### `defects`
| id, qc_inspection_id, code, severity, description, media via links |

### `rework_orders`
| id, production_order_id, defect_id null, status_projection, created_at |

### `cost_sheets`
| id, company_id, subject_type | variant\|production_order |
| subject_id, currency, total_cost, retail_price_snapshot null, margins_json, status |

### `cost_sheet_lines`
| id, cost_sheet_id, cost_component | wood\|fabric\|foam\|hardware\|labor\|paint_polish\|delivery\|installation\|other |
| amount, source_ref_type, source_ref_id null |

### `labor_entries`
| id, company_id, employee_id, production_task_id null, hours, rate, amount, work_date | D24 deferred method |

### `schedule_slots` / `resources`
| resource: company_id, branch_id, resource_type team\|space\|machine, ref_id |  
| slot: resource_id, production_task_id null, starts_at, ends_at, status |

---

# 6. Service

### `service_requests`
| id, company_id, branch_id, number, request_type | repair\|repaint\|polish\|restore\|visit\|measurement |
| customer_user_id, address_id null, status_projection, description, created_at |  
**Workflow** per type |

### `repair_jobs`
| id, service_request_id unique, production-like fields, status_projection |

### `appointments`
| id, company_id, branch_id, subject_type, subject_id, customer_user_id null, scheduled_start, scheduled_end, location_type, status_projection, assigned_employee_id null |

### `warranties`
| id, company_id, sales_order_id null, variant_id null, starts_on, ends_on, terms_json, certificate_media_id null | D21 defaults deferred |

### `warranty_claims`
| id, company_id, warranty_id, status_projection, description, created_at | workflow `warranty_claim_v1` |

### `maintenance_reminders`
| id, company_id, user_id, warranty_id null, remind_on, channel_pref, status, sent_at null |

### `care_guides`
| id, company_id, slug, title, body_cms_ref null, material_id null, status | or CMS entry link |

### `return_requests` / `refunds`
| return: order_id, status_projection |  
| refund: payment_id/invoice_id, amount, status_projection, approval_request_id null |

---

# 7. Interior Projects

### `projects`
| id, company_id, branch_id null, number, project_type | interior\|architecture\|civil\|contractor |
| title, client_user_id null, organization_id null, lead_partner_profile_id null, budget, currency, status_projection, deleted_at |  
**Unique:** `(company_id, number)`  
**Workflow:** `interior_project_v1` etc. |

### `project_members`
| id, project_id, user_id null, partner_profile_id null, member_role, status |  

### `rooms`
| id, project_id, name, room_type, sort_order |

### `space_measurements`
| id, room_id, length, width, height, unit, notes, measured_at, media_links for sketches |

### `design_proposals`
| id, project_id, version, title, status_projection, payload_json, created_by |

### `moodboards` / `moodboard_items`
| moodboard: project_id, title |  
| items: media_asset_id null, product_id null, notes, sort_order |

### `furniture_recommendations`
| id, project_id, room_id null, product_id null, source | rules\|ai\|designer |
| payload_json, created_at |

---

# 8. Procurement

### `suppliers`
| id, company_id, code, name, tax_number null, status, deleted_at | unique `(company_id, code)` |

### `supplier_contacts` / `supplier_items`
| supplier_id, material_id, unit_price, lead_time_days, currency |

### `purchase_requests`
| id, company_id, branch_id, number, requested_by, status_projection, needed_by | unique number |

### `purchase_request_lines`
| pr_id, material_id, qty, unit |

### `supplier_quotations` / `supplier_quotation_lines`
| linked to PR/RFQ |

### `purchase_orders`
| id, company_id, branch_id, supplier_id, number, status_projection, currency, totals, approval_request_id null |  
**Workflow + Approval for PO** |

### `purchase_order_lines`
| po_id, material_id, qty, unit_price |

### `grns` (goods received notes)
| id, company_id, purchase_order_id, location_id, number, received_at, received_by, status_projection |

### `grn_lines`
| grn_id, po_line_id, qty_received, qty_rejected, notes |

### `supplier_payments`
| id, company_id, supplier_id, amount, currency, status, paid_at, reference |

### `material_cost_history`
| id, company_id, material_id, supplier_id null, unit_cost, currency, effective_at | append |

### `supplier_scorecards`
| id, supplier_id, period, on_time_pct, defect_pct, metrics_json |

---

# 9. CRM

### `customers`  
*(logical view: users with customer role + profile; optional)*  

### `customer_profiles`
| user_id PK, company_id, segment, lifetime_value_cache null, notes |

### `leads`
| id, company_id, branch_id null, source, contact_name, email, phone PII, status_projection, owner_user_id null, partner_profile_id null, converted_user_id null, created_at |

### `activities`
| id, company_id, subject_type, subject_id, activity_type, body, due_at null, completed_at null, actor_user_id |

### `notes`
| id, company_id, subject_type, subject_id, body, created_by, created_at, deleted_at |

### `conversations` / `chat_messages`
| conversation: company_id, channel, subject_type null, subject_id null, status |  
| messages: conversation_id, sender_user_id null, sender_kind user\|staff\|bot, body, created_at |  
| link media via media_links |

### `notifications`
| id, company_id, user_id, event_type, title, body, channel, payload_json, read_at null, created_at |  
**Produced by Event Bus handlers** |

### `notification_preferences`
| user_id, company_id, channel, event_type, enabled | unique tuple |

### `reviews`
| id, company_id, user_id, subject_type product\|service, subject_id, rating, body, status | moderated |

### `loyalty_accounts` / `points_ledger` / `loyalty_tiers`  
| Deferred D11 — tables in ERD, flag off |

---

# 10. CMS & Ads & SEO

### `cms_collections`
| id, company_id, code | pages\|blog\|portfolio\|testimonials\|faqs\|careers\|help\|promotions |

### `cms_entries`
| id, company_id, collection_id, slug, title, body_json, status_projection, published_at null, author_id, deleted_at |  
**Publish may require Approval**  
**Unique:** `(company_id, collection_id, slug)` |

### `cms_entry_revisions`
| entry_id, version, snapshot_json, created_at |

### `ad_campaigns` / `ad_placements`
| campaign: company_id, name, status, creative_media_id, link_url, schedule | D10 |
| placement: campaign_id, slot_key | home_banner, plp_sidebar… |

### `seo_meta`
| id, company_id, entity_type, entity_id, meta_title, meta_description, og_json, canonical_url, structured_data_json |  
**Unique:** `(company_id, entity_type, entity_id)` |

### `redirects`
| id, company_id, from_path, to_path, status_code | unique `(company_id, from_path)` |

---

# 11. Analytics (metrics ownership vs reporting)

### `analytics_events`
| id, company_id, event_name, user_id null, session_id null, properties_json, created_at | append | **Domain/product telemetry** |

### `metric_definitions`
| id, company_id null, code, name, module, calc_key | **Domain owns metric meaning** |

### `metric_snapshots`
| id, company_id, metric_code, dimensions_json, period_start, period_end, value, computed_at |  

**Dashboards / saved reports / exports** → §1.10 Reporting only (Phase 0A ownership rule)

---

# 12. Relationships (cardinality map)

```text
companies 1—N branches 1—N locations
companies 1—N users (via roles); users N—M roles; roles N—M permissions
users 1—1 person_profiles; users N—M organizations via organization_members
partner_profiles N—1 users; referral_codes N—1 partner_profiles
employees N—1 users; teams N—M employees via team_members

categories 1—N products 1—N variants
variants N—M price_lists via price_list_items
variants/materials 1—N inventory_items @ locations
inventory_items 1—N stock_ledger_entries

quotes 1—N quote_lines; quotes 0—1→N sales_orders
sales_orders 1—N lines; 0—N invoices; 0—N payments via allocations
sales_orders 0—N production_orders 1—N production_tasks
sales_orders 0—N deliveries / installations / work_orders
sales_orders 0—N commission_ledger_entries

projects 1—N rooms 1—N measurements; 1—N moodboards; 0—N quotes/orders
service_requests 0—1 repair_jobs; 0—N appointments; warranties 0—N claims

suppliers 1—N POs 1—N lines; POs 0—N GRNs → stock_ledger
PR 0—N supplier_quotations → PO

workflow_definitions 1—N stages/transitions
workflow_instances N—1 definitions; N—1 current stage; 1—N events
approval_requests 1—N actions
media_assets 1—N versions/derivatives; N—M entities via media_links
domain_events / outbox → async consumers (notifications, search, analytics)
```

### Ownership rules (summary)

| Data | Owner module |
|------|----------------|
| Stock quantity | Stock ledger only |
| Business stage | Workflow instance |
| Authorization decision | Policy Engine at runtime |
| Permission catalog | RBAC tables |
| Files | DAM |
| Reports/dashboards/exports | Reporting |
| Operational metric definitions | Domain + metric_definitions |
| Notifications rows | Event handlers |
| Generated PDFs | Reporting + templates + DAM media |

### Lifecycle (all long-running)

Subject created → WorkflowInstance started → transitions (guards: Rules; gates: Approval) → projections updated → DomainEvent → Outbox → Notifications / Search / Analytics / Commission / Stock as applicable → AuditLog on sensitive changes

---

# 13. Index & constraint checklist (cross-cutting)

| Concern | Pattern |
|---------|---------|
| Tenant list queries | `(company_id, created_at DESC)` |
| Status boards | `(company_id, status_projection)` + branch where used |
| Numbers | unique `(company_id, number)` for orders, invoices, PO, PR, projects |
| SKU/barcode | unique per company |
| Polymorphic subject | `(subject_type, subject_id)` |
| Outbox poll | `(status, next_attempt_at)` |
| Ledger time | `(inventory_item_id, created_at)` |
| Partial uniques | one running workflow instance per subject+definition |
| Soft delete | unique email/slug **WHERE deleted_at IS NULL** |

---

# 14. Phase 0B entity inventory (count guide)

Kernel ~40 · Identity/Org ~20 · Commerce ~25 · Sales ~25 · Manufacturing ~20 · Service ~15 · Projects ~12 · Procurement ~15 · CRM ~15 · CMS/SEO/Ads ~12 · Analytics ~5 · AI ~4  

**Total logical entities ≈ 200+** (including lines/junctions)

---

# 15. Explicit non-goals (0B)

- Physical DB vendor DDL  
- Queue product choice (Kafka vs SQS) — 0D  
- Search engine product — 0D  
- Exact gateway enums — Deferred D07  
- Numeric locale/currency defaults — Deferred D22/D23  

---

# Freeze & Approval

Phase 0B was **approved** and is **frozen** with the Phases 0A–0F architecture pack. Implementation must conform to this ERD. Architectural changes require an ADR.

**PHASE 0B ARTIFACT APPROVED**

---

*End of Phase 0B Enterprise ERD document (documentation only).*
