# RC5 — Enterprise Authorization Architecture Blueprint

**Document type:** Frozen implementation blueprint (documentation only)  
**Baseline:** Post-RC4 + `docs/productization/` audit  
**Constraint:** No application code, routes, APIs, or architecture changes in this pack.

---

## 1. Objectives

RC5 closes the enterprise authorization gap so that:

1. **Policy Engine remains the sole runtime authorizer** (Phase 0A Law / Phase 0E); all other controls provide inputs or defense in depth.
2. **RBAC data** (roles, permissions, scoped assignments) is complete, seedable, and auditable for every Version 1.0 module surface.
3. **Frontend route and UI affordances** declare required permissions without ever making allow/deny decisions.
4. **Every CQRS command/query and upload** continues to authorize via existing `authorize()` → Policy pipeline.
5. **Record-level and field-level controls** are expressed as Policy resource attributes and UI presentation rules — not a new framework.
6. **Session/company binding** already introduced in RC4 is preserved and extended with authorization completeness tests.
7. Implementation can proceed **incrementally (RC5.1–RC5.9)** without revisiting architecture.

RC5 is **authorization architecture completion and enforcement consistency**, not a redesign of Identity, Runtime, Policy, CQRS, Persistence, or Workflow.

---

## 2. Scope

| In scope | Detail |
|---|---|
| Role catalog & permission codes | Canonical `<module>.<resource>.<action>` catalog aligned to existing `RoleRecord` / `PermissionRecord` / `UserRoleRecord` |
| Module authorization matrices | Executive, ERP modules, Analytics, AI, Platform, Portal |
| Route protection requirements | Document current session-only guards vs required Policy-backed UX gating |
| API authorization requirements | Map all 18 HTTP routes + 107 CQRS contracts to permissions and scopes |
| Record-level security design | Company, organization, branch, project, own/assigned — via existing `PolicyResource` |
| Field-level security design | Presentation + Policy attribute rules; no parallel field ACL engine |
| Dashboard access design | Open / export / configure / approve / analytics view |
| Implementation milestones | RC5.1–RC5.9 |
| Test, migration, signoff plans | Evidence-based gates |

---

## 3. Out of scope

| Explicitly out | Rationale |
|---|---|
| New HTTP routes or CQRS contracts | Frozen RC productization rule; inventing List*/portal APIs is RC7+ |
| New authorization framework | Policy Engine is SSoT |
| Workflow/Approval definition registration | RC6 |
| ERP List* APIs and fixture retirement | RC7 |
| Professional portal shells | RC8 |
| AI gateway / real model providers | RC9 |
| Industry calculators | RC10 |
| Commerce catalogue expansion | RC11 |
| Manufacturing MES | RC12 |
| Cookie/session transport migration may be **coordinated** with RC5 but full httpOnly cookie cutover is documented as a **security closure dependency**, not a new auth engine |
| Architecture ADRs changing Policy/Workflow/Rules ownership | Forbidden without ADR; not part of RC5 |

---

## 4. Assumptions

1. Architecture pack **0A–0F remains frozen** (`docs/architecture/00-foundation/ARCHITECTURE-FREEZE.md`).
2. Backend Policy evaluation already runs in the application pipeline (`packages/application/src/pipeline/behaviors.ts`).
3. Frontend currently gates only on **session presence** (`RequireAuth` / `RequireAuthElement` in `packages/web/src/App.tsx`) — documented in `docs/release/RC2-authorization-verification.md`.
4. RBAC storage and hierarchy already exist (`packages/identity/src/rbac/rbac-service.ts`, `RoleScopeType`). **Audit finding (2026-07-17):** no permission/role seeds or assignments were found; catalog provisioning is RC5.1 work.
5. `PolicyResource` already supports `companyId`, `ownerUserId`, `organizationId`, `branchId`, and attributes (`packages/identity/src/policy/policy-engine.ts`). **Audit finding:** current application helpers populate company only; owner/org/branch are null today.
6. Productization counts in `docs/productization/MASTER_PRODUCTIZATION_REPORT.md` are the baseline inventory.
7. Professional roles (Architect, Interior Designer, etc.) are **identity/partner attributes + roles**, not separate authorization engines (Phase 0E / 0A D06).
8. Trades (Carpenter/Painter/Polisher) remain **Employee + Team**, not RBAC roles (0A rejected D36).
9. Gap validation evidence: `docs/rc5/audit/MASTER_RC5_GAP_VALIDATION_REPORT.md`.

---

## 5. Existing infrastructure being reused

| Component | Location | RC5 use |
|---|---|---|
| Policy Engine | `packages/identity` + `packages/platform` EnhancedPolicyEngine | Sole allow/deny |
| RBAC service | `packages/identity/src/rbac/` | Permission/role definition & assignment |
| Identity models | `RoleRecord`, `PermissionRecord`, `UserRoleRecord`, `PartnerType`, `OrganizationType` | Catalog binding |
| Application pipeline | `packages/application` behaviors | Enforce `authorize()` on every dispatch |
| Handler AuthorizationSpec | `CommandHandler.authorize` / `QueryHandler.authorize` | Action + resource per contract |
| Session / company header binding | `packages/api/src/auth/authentication.ts` | Tenant context |
| Security audit | `SecurityAuditService` | Deny/privilege audits |
| Feature flags (architecture) | Phase 0A / Settings | Gate risky surfaces |
| Workflow / Approval engines | `packages/platform` | Context inputs to Policy — **not** replaced in RC5 |
| Frontend session | `packages/web/src/state/session.tsx` | Auth presence only |

---

## 6. Gaps to close (not new frameworks)

| Gap | Evidence | RC5 treatment |
|---|---|---|
| No complete seeded role/permission catalog wired for all modules | 0A matrix is draft; runtime may lack full seeds | Seed + document; use existing RBAC APIs |
| Frontend has no permission-aware navigation | Session-only guards | Declarative route meta + hide/disable UI; backend remains authoritative |
| Field-level security not specified | Absent | Design attributes + UI rules; Policy for sensitive reads |
| Record ownership attributes incomplete on some resources | Handler-dependent | Standardize `PolicyResource` population |
| Platform/Portal/AI pages are presentation-only | Productization audit | Authorize **access to shells**; do not invent backend APIs |
| Session tokens in localStorage | RC4 R1 | Tracked as security dependency; cookie migration is implementation detail under Identity session contracts, not a new engine |

---

## 7. Success criteria

RC5 is complete when:

1. Role catalog and permission codes are documented, seedable, and mapped to every module in this pack.
2. Every explicit route has a documented protection requirement (public / authenticated / permission / scope).
3. Every HTTP route and every registered CQRS contract has a documented permission + scope expectation.
4. Record-level and field-level designs reference only Policy + RBAC + existing resource attributes.
5. Dashboard access matrix is complete for all inventoried dashboards.
6. RC5.1–RC5.9 milestones have acceptance criteria sufficient for incremental delivery.
7. Test plan covers role switch, tenant isolation, cross-company denial, ownership, and field visibility.
8. Migration/rollback/feature-flag sequence is defined without architecture change.
9. Signoff checklist can be executed without reopening Phase 0 decisions.
10. No document in `docs/rc5/` invents a second authorizer, new business engine, or forbidden API.
11. Every authorization permission uses the canonical grammar; current noncanonical handler strings are documented only as legacy executable action keys with an explicit mapping.
12. Every milestone has objective evidence and an independently usable rollback checkpoint.

---

## 8. Recommended pre-step: RC4.5 Documentation Freeze

Before RC5.1 implementation starts:

1. Review `docs/productization/` and `docs/release/` for count consistency (pages, dashboards, forms, APIs, handlers).
2. Treat `MASTER_PRODUCTIZATION_REPORT.md` + this RC5 pack as the **authorization baseline**.
3. Tag repository (e.g. `rc4-docs-freeze`) after review.
4. Resolve conflicts in writing (prefer source-code counts over older RC approximations).

This freeze is process-only and does not change architecture.

---

## 9. Post-RC5 sequence (unchanged productization order)

1. RC5.1–RC5.9 Enterprise Authorization  
2. RC6 Workflow Engine Completion  
3. RC7 ERP Backend Completion  
4. RC8 Professional Platform  
5. RC9 AI Commerce  
6. RC10 Industry Tools  
7. RC11 Furniture Commerce  
8. RC12 Digital Manufacturing  
9. RC13 Customer Experience  
10. RC14 Analytics 2.0  
11. RC15 Commercial Release  

---

## 10. Related documents

| Doc | Purpose |
|---|---|
| `02-Authorization-Matrix.md` | Module permissions |
| `03-Role-Catalog.md` | Roles & inheritance |
| `04-Route-Protection-Matrix.md` | Routes |
| `05-API-Authorization-Matrix.md` | HTTP + CQRS |
| `06-Record-Level-Security.md` | Isolation & ownership |
| `07-Field-Level-Security.md` | Field visibility/edit |
| `08-Dashboard-Access.md` | Dashboards |
| `09-Implementation-Plan.md` | RC5.1–RC5.9 |
| `10-Test-Plan.md` | Tests |
| `11-Migration-Plan.md` | Rollout |
| `12-RC5-Signoff.md` | Checklist |
| `13-Authorization-Governance-Specification.md` | Canonical naming, evaluation order, seed evolution, Super Admin, audit, performance, and frozen statistics |

---

## 11. Frozen baseline statistics

| Metric | Baseline |
|---|---:|
| HTTP routes reviewed | 18 |
| CQRS contracts | 107 |
| Unique current legacy executable action keys | 105 |
| Canonical backend permission mappings required in RC5.1 | 105 |
| Initial immutable system role records | 33 |
| Permission/role records seeded before RC5.1 | 0 |

The baseline is frozen after approval of `01`–`13`. Changes require an updated catalog version, objective source evidence, Security review, and corresponding test/migration/sign-off updates.
