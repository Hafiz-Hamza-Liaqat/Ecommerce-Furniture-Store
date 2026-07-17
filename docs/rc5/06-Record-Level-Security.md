# RC5 — Record-Level Security

**Reuse only:** Policy Engine + `PolicyResource` + RBAC scopes (`company` | `branch` | `organization` | `own` | `global`).  
**Do not** invent a separate RLS database engine or per-table security microservice.

> **Audit correction (2026-07-17):** Company isolation is implemented and enforced. Branch/organization/own are Policy capabilities. RC5.4 populates `ownerUserId` / `organizationId` / `branchId` / `attributes` on AuthorizationSpecs from command/query payloads when those fields are present; get-by-id and other payloads without ownership fields still leave them null. Persisted-record load-before-authorize and enforceable own/branch/org checks remain RC5.5. Workspace is UI-only. Department exists on employee profiles but is not a Policy scope. See `docs/rc5/audit/10-Record-Security-Audit.md` and `docs/release/RC5.4-api-authorization.md`.

---

## 1. Isolation layers

| Layer | Key | Enforcement |
|---|---|---|
| Tenant / company | `company_id` | Mandatory on business resources; Policy deny if principal.company ≠ resource.company (D02) |
| Organization | `organization_id` | B2B/dealer/buyer members; partner firm data |
| Branch | `branch_id` | Warehouse, showroom, production site |
| Location | location attribute | Stock bins/warehouses under branch |
| Department | attribute / team | Optional ABAC attribute on principal or resource |
| Project | `projectId` attribute + membership | Interior/architecture/civil/contractor |
| Customer | customer/account id + own | Customer portal and CRM |
| Own / assigned | `ownerUserId`, assignee, team | Sales rep, technician, delivery |

---

## 2. Ownership model

| Pattern | Definition | Example roles |
|---|---|---|
| **Company-wide** | Any resource in company | Admin, finance_manager on invoices |
| **Branch** | Resource.branch in principal branch scopes | warehouse_manager |
| **Organization** | Resource.org in memberships | corporate_buyer, dealer |
| **Project member** | User in project_members | architect, designer, contractor |
| **Own** | ownerUserId = principal | sales_representative opportunities |
| **Assigned** | assigneeUserId / team contains principal | service technician work orders |
| **Global** | Explicit platform control-plane resources only | super_admin / platform_admin; no implicit company ERP access |

Authorization follows the complete order in `13-Authorization-Governance-Specification.md`. Inside the current Policy Engine the ordered denies are permission → company isolation → scope. Default deny applies, and any applicable explicit deny overrides all role-derived allows. Super Admin currently short-circuits only the scope step after permission and company checks pass.

---

## 3. Module application

| Module | Default record scope | Notes |
|---|---|---|
| Sales | Company; reps own/assigned | Quotes/orders inherit opportunity ownership |
| Procurement | Company; PO branch △ | Supplier master company-wide |
| Inventory | Company + branch/location | Transfers validate both locations |
| Finance | Company | Auditor read; no org bleed |
| CRM | Company; own/team on leads | Accounts may be shared within team |
| Projects | Project membership | Partners never see other projects |
| Service | Assigned / queue | Customers see own via portal (RC8/RC13) |
| HR | Company HR boundary | Strict; managers see reports only if attribute allows |
| Manufacturing | Branch/plant | Until live APIs, shell-only |
| DAM | Company + visibility | KYC restricted; `dam.kyc_assets.read` |
| CMS | Company | Publish Approval |
| Notifications | Company | Admin |
| Reporting/Search/Analytics | Company | Filter embedded queries by company |
| Portal | Own / org | Never other customers |
| Platform admin | Global platform | Not company ERP |

---

## 4. Tenant isolation tests (required)

| Attack | Expected |
|---|---|
| User A company1 Get* company2 id | Deny / not found |
| Spoof `x-company-id` ≠ session | Reject (RC4) |
| Org member reads other org | Deny |
| Partner reads unassigned project | Deny |
| Customer portal IDOR on order id | Deny |
| Platform admin token used as company ERP without role | Deny ERP unless also company-scoped role |

---

## 5. Department isolation

Departments are **not** a separate RoleScopeType today. Design options **within freeze**:

1. Encode as `attributes.departmentId` on resources and principal (ABAC), or  
2. Map departments to **Team** membership (preferred for field orgs).

Do not add a new scope enum without ADR. Prefer Team/attributes.

---

## 6. Customer ownership

| Record | Owner |
|---|---|
| Customer profile | User |
| Orders/quotes (commerce) | Customer user or organization |
| Service requests | Requesting customer |
| Project as client | Customer as project client attribute; staff/partners via membership |

---

## 7. Implementation guidance (RC5.5)

1. Audit every handler `authorize()` for complete `PolicyResource`.  
2. **[RC5.5 target, not implemented]** Add post-load re-authorization for updates using persisted company/owner. Today `authorize()` runs pre-handle on the command payload only (`packages/application` AuthorizationBehavior); owner/branch/org fields are not populated. Requires an ADR before treating own-scope as enforceable.  
3. Add automated cross-company tests.  
4. Document attribute keys in a shared glossary — no new engine.  
5. UI filters are convenience only.

---

## 8. Gaps

| Gap | Disposition |
|---|---|
| List queries without server filters | Cannot enforce row-level on lists until RC7 List* |
| Fixture grids | Client-side only; do not treat as secure multi-tenant data |
| In-memory Approval/Workflow stores | Not durable ownership sources until RC6 |
| Department scope type | Use attributes/teams; ADR if first-class scope required |
