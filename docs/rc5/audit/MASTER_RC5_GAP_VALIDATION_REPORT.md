# MASTER RC5 Gap Validation Report

**Audit date:** 2026-07-17  
**Type:** Documentation-only gap validation and traceability  
**Source of truth:** current codebase under `packages/`  
**Blueprint reviewed:** `docs/rc5/`  
**Deliverables:** `docs/rc5/audit/01` … `13` plus this master report

## 1. Executive decision

| Item | Result |
|---|---|
| Overall RC5.1 readiness | **73%** |
| Blocking issues | Exact action seeding, role/assignment seed, catalog decisions, upload Policy gap (later), session DTO gap (RC5.2) |
| Recommendation for RC5.1 | **GO, with conditions** |
| Begin implementation in this turn | **NO** — wait for explicit approval |
| Begin RC5.2+ immediately | **NO-GO** |

## 2. What is true today

1. The Policy Engine is the sole runtime authorization decision path for CQRS.
2. All 107 CQRS handlers declare `authorize()` and are company-scoped through helpers.
3. All 18 HTTP routes exist and match the documented transport inventory.
4. Protected frontend routes require a session ID only.
5. Zero permission records, role definitions, role-permission links, and user-role assignments were found as seeded data.
6. Upload authenticates and checks company, but does not call Policy.
7. Own/organization/branch Policy fields exist and are unused by current application AuthorizationSpecs.
8. Field-level omit/mask/restricted-edit is not implemented.
9. AI, integrations, portal, and most platform surfaces are presentation/fixture/local-storage.
10. Partner/employee models exist; RC5 roles are not provisioned.

## 3. Traceability totals

| Domain | Documented / expected | Actual | Gap class |
|---|---:|---|---|
| HTTP routes | 18 | 18 | Upload Policy missing |
| CQRS contracts | 107 | 107 with authorize | Record scope incomplete; actions unseeded |
| Unique Policy actions | implied catalog | 105 referenced | 0 implemented seeds |
| Roles | 37 catalog entries | 0 seeded | Documentation-only |
| Protected route families | AuthZ expected | AuthN only | Permission guards missing |
| Sidebar destinations | 39 | 39 resolve; 1 duplicate | No permission filtering |
| Requested dashboards | 18 | 18 surfaces | 0 permission-gated |
| Sensitive field families | 8 | 0 protected | Documentation-only |
| Record concepts | 10 | Company enforced | Branch/org/own/etc. gaps |

## 4. Deliverable index

| File | Purpose |
|---|---|
| `01-RC5-Traceability-Matrix.md` | Master cross-artifact map |
| `02-Route-Audit.md` | Route existence, guards, duplicates, missing gates |
| `03-Navigation-Audit.md` | Navbar, sidebar, palette, breadcrumbs, shortcuts |
| `04-Dashboard-Audit.md` | Dashboard access and data truth |
| `05-API-Traceability.md` | HTTP route Policy/auth/company mismatches |
| `06-CQRS-Audit.md` | All 107 contracts, actions, workflow/approval gaps |
| `07-Identity-Audit.md` | Login/session/MFA/devices/email drift |
| `08-Role-Audit.md` | Role catalog versus runtime |
| `09-Permission-Audit.md` | Implemented/Referenced/Missing/Future/Deprecated |
| `10-Record-Security-Audit.md` | Company/branch/workspace/etc. |
| `11-Field-Security-Audit.md` | Sensitive field protection gaps |
| `12-Documentation-Consistency.md` | Blueprint drift and terminology |
| `13-RC5-Implementation-Readiness.md` | GO/NO-GO and prerequisites |

## 5. Highest-impact mismatches

1. **Action taxonomy:** canonical permissions such as `sales.opportunities.create` do not match legacy executable keys such as `opportunity.create`; RC5.1 now requires an explicit mapping.
2. **Upload:** RC5 claims a DAM permission; the route has none.
3. **Frontend authorization:** RC5 expected permissions are target-state; current guard is session-only.
4. **Record scope:** Policy supports own/org/branch; handlers currently supply nulls; authorize runs pre-load.
5. **Field security:** RC5 implies omit/deny; no projection exists.
6. **Migration flags:** named flags are proposed, not implemented.
7. **Identity session:** no roles/permissions returned to the UI.
8. **Devices:** security UI is local storage, not Identity session inventory.
9. **Roles:** catalog is complete as design, empty as data; `agent` PartnerType is omitted.
10. **Workflows:** handlers reference definitions that are not registered in the host.
11. **Platform permission split:** resolved in the frozen baseline as `platform.operations.read` for the shell and `platform.health.read` for deployment.
12. **Route count framing:** “63 explicit pages” is an App.tsx tag metric, not a unique leaf-page inventory.

## 6. Blockers for RC5.1

1. Seed 105 canonical backend permissions and explicitly map all 105 current CQRS action keys before any rename.
2. Seed the locked 33 system roles and deterministic role-permission links; user assignment is a later, separately approved operational step.
3. Apply the frozen decisions: `vendor` aliases `supplier`, `guest` is public state, and `agent` remains an RC8 decision.
4. Keep route protection, navigation/UI changes, module enforcement, record security, field security, and action renormalization out of RC5.1.
5. Limit RC5.1 tests to catalog/constants/seeds/mappings/definition integrity; workflow/approval behavior is not an RC5.1 completion condition.

## 7. Documentation corrections applied

RC5 blueprint files receive correction notes only where unsupported current-state claims were found. No source code, routes, APIs, Identity, Policy, CQRS, SQL, Workflow, configuration, or architecture changes were made.

## 8. Final recommendation

**GO for RC5.1 role/permission seeding after explicit approval.**

Do not begin RC5.1 implementation from this audit turn.  
Do not begin RC5.2 UI authorization until an approved session/principal hand-off exists.  
Do not treat presentation dashboards, local fixtures, or UI hide logic as security controls.
