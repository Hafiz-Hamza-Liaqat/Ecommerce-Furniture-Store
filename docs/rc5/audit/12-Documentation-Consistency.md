# RC5 Documentation Consistency Audit

## 1. File-by-file result

| RC5 file | Consistent content | Drift / correction required |
|---|---|---|
| `01-RC5-Overview.md` | Scope, Policy-only architecture, 18 routes, 107 handlers, no new endpoints | Explicitly state zero seeded roles/permissions and session-only frontend |
| `02-Authorization-Matrix.md` | Appropriate target role/module matrix | Label all codes target-state; distinguish exact current handler actions; dashboard/live data wording remains mixed |
| `03-Role-Catalog.md` | Role model/scope types and target responsibilities | No role is currently seeded; `agent` PartnerType omitted; `guest`/`vendor` decisions unresolved; scope narrowing is not guaranteed with multiple assignments |
| `04-Route-Protection-Matrix.md` | Route families exist; current column generally says Session | Add explicit 0 permission guards; portal/admin each have index-only route trees; generic child routes are broader than semantic matrix |
| `05-API-Authorization-Matrix.md` | 18/107 counts and command/query Policy chain | Upload does not yet use canonical `dam.assets.upload`; current record resources are company-only; legacy executable keys require RC5.1 mapping |
| `06-Record-Level-Security.md` | Valid target design using existing Policy fields | Mark company as current and branch/org/own/project/department/customer ownership as gaps |
| `07-Field-Level-Security.md` | Correct security principles | “Queries omit fields or deny” is false today; all listed permission examples are proposed |
| `08-Dashboard-Access.md` | Surfaces and target access concerns are useful | Access rows are not current; all dashboards are session-only; 23 is an inventory convention with overlapping surfaces |
| `09-Implementation-Plan.md` | Milestone order and no-second-engine principle | Named feature flags do not exist; action normalization must not precede exact current-code seeding; missing workflow definitions affect smoke tests |
| `10-Test-Plan.md` | Required negative/tenant/field test categories | Needs explicit empty-catalog seed fixture and authorization-boundary tests independent of workflow completion |
| `11-Migration-Plan.md` | General sequence and rollback intent | Flags are proposed, not current; re-login is not needed for backend role resolution; `ai.assistant.use` is not already gated; smoke commands may fail missing workflows |
| `12-RC5-Signoff.md` | Appropriate future checklist | Must remain unchecked until catalog, UI hand-off, upload Policy, record scope, and field tests exist |

## 2. Obsolete or unsupported references

| Reference | Status |
|---|---|
| Existing `ai_assistant` feature flag/gate | Architecture example only; no runtime implementation found |
| `ui_route_perms`, `rbac_catalog_v1`, `api_action_taxonomy_v1`, `record_scope_strict`, `field_security_v1` | Proposed migration names, not existing flags |
| Upload permission `dam.assets.upload` | Canonical RC5.4 target; unsupported by current route |
| Role re-login requirement | Unsupported for backend; Policy resolves assignments per evaluation |
| Current field omission for KYC/cost | Unsupported |
| Current own/assigned/project/branch handler resources | Unsupported; fields are null |
| Platform/portal multi-page implication | Implementations have single admin/portal index pages with wildcard redirects |

## 3. Missing references

- Existing `PartnerType` includes `agent`; role catalog does not decide its role treatment.
- UI platform fixture role names (`admin`, `ops`, `finance`, `viewer`) are not identified as unrelated presentation data.
- No RBAC seed/bootstrap is referenced as existing because none exists.
- No frontend effective-principal DTO exists.
- Workflow/rules/approval definitions are not registered in the host.
- Current backend action catalog contains 105 exact strings and mixed namespace conventions.
- Security devices are local-storage rows, not an Identity device-management API.

## 4. Duplicate and inconsistent terminology

| Terms | Finding |
|---|---|
| tenant / company | Current implementation uses company; tenant should be documented as the SaaS meaning, not a separate Policy resource |
| view / read / get | RC5 UI uses `view`, examples use `get`, CQRS actions use `read` |
| vendor / supplier | Documented alias; seeding both would duplicate responsibility |
| read_only / viewer | RBAC target versus UI fixture |
| reporting / reports | Two separate route surfaces with overlapping purpose |
| platform admin / company admin | Distinct intended scopes but currently both only session-gated |
| permission implemented / action referenced | Must remain distinct: no PermissionRecord exists |
| `platform.operations.read` vs `platform.health.read` | Resolved: platform shell uses operations read; deployment child additionally uses health read |
| “63 explicit route pages” | App.tsx tag count, not unique application leaf pages; overlaps marketing/ERP and omits nested centers |
| load-before-authorize | Pipeline authorizes pre-handle today; own/branch checks need ADR + RC5.5 work |

## 5. Corrected source-of-truth hierarchy

1. Current handler action constants are authoritative for backend Policy.
2. Current React route definitions are authoritative for route existence.
3. `RoleScopeType` and `PolicyResource` are capabilities, not evidence that handlers populate them.
4. RC5 role/dashboard/field matrices are target-state unless a seed/guard/projection test proves otherwise.
5. Productization counts are inventory aids, not independent authorization boundaries.

## 6. Documentation correction status

The RC5 blueprint files were updated only to add current-versus-target notes and correct unsupported claims. No source, route, API, Identity, Policy, CQRS, SQL, workflow, configuration, or architecture file was changed.
