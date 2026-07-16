# RC5 Record-Level Security Audit

## 1. Requested resource matrix

| Resource | Resource/data model | Policy model support | Ownership/scope actually populated | Classification |
|---|---|---|---|---|
| Company | Identity user/company IDs and company IDs on business aggregates | `PolicyResource.companyId`; explicit cross-company deny | Populated by all current application helpers; session/header/payload match | Implemented company isolation |
| Branch | `RoleScopeType.branch`; employee branch; warehouse `branchId`; branch header | `PolicyResource.branchId` and branch assignment matching | Current application helpers always set `branchId: null` | Partial model; enforcement gap |
| Workspace | Browser workspace selector/fixture data | No `RoleScopeType.workspace`; no `PolicyResource.workspaceId` | Local UI selection only | Documentation/UI only |
| Department | Employee profile `department: string|null` | No department scope enum; possible future attributes | No principal/resource department attribute supplied to Policy | Partial identity data; enforcement absent |
| Warehouse | Inventory aggregate includes company and optional branch | Resource type/ID/company and branch field available | Inventory authorization helper does not copy warehouse branch into PolicyResource | Partial; company-only today |
| Customer | Sales customer IDs and CRM account/contact entities | Own/org fields could model customer access | No Identity-user-to-customer ownership mapping in current handlers | Model references; ownership absent |
| Supplier | Procurement supplier aggregate, company scoped | Organization/resource fields could model supplier principal | No supplier-user/org ownership mapping; helper company-only | Model implemented; external ownership absent |
| Project | Project/task/resource aggregates and team concepts | `ownerUserId`, `organizationId`, attributes could carry project/team | Current project helper supplies none of these | Company-only today |
| Employee | Identity employee profile links `userId`, branch, department | Own/branch Policy concepts available | No HR application handlers and no employee PolicyResource path | Partial model; authorization documentation-only |
| Tenant | RC5 uses tenant interchangeably with company | No separate tenant resource type required by current architecture | Enforced as company for business CQRS | Implemented only as company alias |

## 2. Current Policy semantics

`RbacPolicyEngine` evaluates in this order:

1. exact permission string (before company and scope; `super_admin` does not skip this);
2. company mismatch deny;
3. scope allow.

Scope allows:

- `super_admin`;
- any role assignment scoped `company` or `global`;
- exact owner match for `own`;
- exact organization match;
- exact branch match.

Because company/global returns allow before narrower checks, a principal with both broad and narrow assignments receives the union. RC5 wording that scopes always narrow is a design intention, not guaranteed runtime behavior.

## 3. Application resource construction

Each of the seven application packages defines a `companyResource` helper. Across 107 handlers it populates:

- resource type;
- optional resource ID;
- payload company ID;
- owner, organization, and branch as `null`.

No helper populates attributes such as amount, stage, project ID, verification status, warehouse/location, visibility, or department. `EnhancedPolicyEngine` is wired, but empty enrichers/predicates do not create this context automatically.

## 4. Resource-specific gaps

| Risk scenario | Current outcome after a permission is granted company-wide |
|---|---|
| Sales rep reads another rep's opportunity in same company | Policy cannot distinguish owner |
| Project partner reads unassigned project | Policy cannot distinguish assignment/project |
| Warehouse user adjusts another branch's stock | Policy cannot distinguish branch/location |
| Customer reads another customer's record | Portal has no backend ownership path |
| Supplier reads another supplier's PO | No supplier principal mapping |
| Department manager reads another department | No department Policy attribute |
| Employee reads own HR record | No HR handler/own-resource path |

Fail-closed permission behavior does not solve these same-company horizontal access cases once broad permissions are seeded.

## 5. Documentation comparison

- `docs/rc5/06-Record-Level-Security.md` is a target design, not a description of existing enforcement.
- Company/tenant isolation is the only broadly implemented record-level control.
- Branch, organization, and own are implemented Policy capabilities but unused by application AuthorizationSpecs.
- Project, warehouse location, customer, supplier, employee, workspace, and department ownership models are not complete.
- Fixture/local-storage records have no trustworthy tenant or ownership security.

## 6. Verdict

| Layer | Readiness |
|---|---:|
| Company/tenant | 90% |
| Branch | 25% |
| Organization | 20% |
| Own/assigned | 15% |
| Project/location/department attributes | 10% |
| Portal customer/supplier ownership | 0% |

RC5.1 may seed company-scoped roles, but narrow roles must not be advertised as secure until their resources are populated and tested.
