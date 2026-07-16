# RC5 Role Audit

## 1. Runtime truth

`RbacService`, `RoleRecord`, hierarchy, scoped assignments, permission links, in-memory storage, and SQL storage are implemented. No production/bootstrap call to `defineRole`, `definePermission`, `grantPermissionToRole`, or `assignRole` was found.

Therefore, **none of the 37 documented role/state rows currently exists as seeded RBAC data**. The frozen initial seed contains 33 system role records. `super_admin` is a special case: current Policy recognizes the code, but its approved bypass is constrained by `../13-Authorization-Governance-Specification.md`; no definition was found.

## 2. Complete role classification

| Catalog group | Role codes | Runtime classification |
|---|---|---|
| Governance (10) | `super_admin`, `platform_admin`, `company_owner`, `admin`, `moderator`, `editor`, `auditor`, `approver`, `read_only`, `guest` | Documentation-only; `super_admin` string recognized by Policy; `guest` should remain public/no assignment |
| Executive/management (10) | `executive`, `finance_manager`, `hr_manager`, `procurement_manager`, `warehouse_manager`, `manufacturing_manager`, `sales_manager`, `sales_representative`, `service_manager`, `customer_support` | Documentation-only |
| Professional/partner (11) | `architect`, `interior_designer`, `civil_engineer`, `dealer`, `manufacturer_partner`, `supplier`, `vendor`, `customer`, `corporate_buyer`, `contractor`, `consultant` | Documentation-only as roles; some have existing Identity attribute models |
| Operational (6) | `employee`, `production_staff`, `warehouse_staff`, `showroom_staff`, `delivery_staff`, `installation_staff` | Documentation-only |

## 3. Existing model anchors versus roles

| Concept | Actual implementation | Role result |
|---|---|---|
| Partner types | `agent`, `interior_designer`, `architect`, `civil_engineer`, `contractor` | Identity attributes exist; only four are mapped in RC5 role catalog; **`agent` is omitted** |
| Organization types | `b2b_buyer`, `furniture_shop`, `wholesaler`, `contractor_firm`, `other` | Can anchor org Policy later; not roles |
| Employee | Employee profile links user, branch, department | Supports future employee/operational assignments; no role |
| Platform UI role cards | `admin`, `ops`, `finance`, `viewer` fixture rows in web platform catalog | Presentation-only and not Identity RBAC |
| Super admin bypass | Policy checks `roleCode === "super_admin"` | Partial code recognition, not a provisioned role; Policy evaluation and mandatory audit are never bypassed |

## 4. Partial, unused, and duplicate findings

| Role | Finding |
|---|---|
| `vendor` | Explicit alias of `supplier`; duplicate if both are seeded without an ADR |
| `guest` | Public state, not an authenticated RBAC assignment; seeding it risks confusing public access with Policy |
| `read_only` vs UI `viewer` | Inconsistent terminology; UI fixture `viewer` is not RBAC |
| `admin` / UI `admin` | Same label but unrelated data stores |
| `finance_manager` / UI `finance` | Similar purpose but unrelated data |
| `manufacturer_partner` | Future organization/partner mapping |
| `consultant` | Documentation already identifies missing PartnerType; role remains possible as RBAC data but attribute mapping is unresolved |
| `agent` | Existing PartnerType with no corresponding RC5 role or explicit “attribute only” decision |
| All remaining roles | Unused because no assignments/permission links are provisioned |

## 5. Hierarchy and scope consistency

- `parentRoleId` supports one parent chain; prose such as “admin + owner scopes” must be represented by one hierarchy plus one or more scoped assignments, not multiple inheritance.
- Multiple active assignments are unioned. The statement “scope narrows, never widens” is not guaranteed: a company-scoped role broadens access even when another role is own/branch scoped.
- `global`, `company`, `branch`, `organization`, and `own` are real scope enum values.
- A global scope does not itself grant permissions; a linked permission is still required.

## 6. Frozen catalog decisions

1. Seed 105 canonical backend permissions and map all 105 current executable action keys exactly once.
2. `vendor` is an alias of `supplier` and is not separately seeded.
3. `guest` is public state and is excluded from RBAC seeds.
4. `agent` remains an Identity attribute and an explicit RC8 role decision.
5. `read_only` is the RBAC role; presentation-only `viewer` is not seeded.
6. System role codes are immutable; tenant custom roles are company-scoped.
7. `manufacturer_partner` and `consultant` are deferred to RC8; the initial immutable system seed is 33 roles.
8. Initial user assignment is a separately approved pre-enforcement operation, not an RC5.1 deliverable.

## 7. Verdict

**Role infrastructure:** implemented.  
**Catalog roles provisioned:** 0/33 initial system role records (0/37 documented rows/states).  
**Assignments usable in current environment:** none found.  
**RC5.1 implication:** this absence is RC5.1 scope, not a reason to introduce a new authorization engine.
