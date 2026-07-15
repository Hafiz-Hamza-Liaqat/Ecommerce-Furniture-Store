# Phase 6G — Architecture Compliance Audit

**Scope:** Artisan Furnish Hub monorepo through Phases 0A–6G  
**Mode:** Read-only (no code modified during audit)  
**Date:** 2026-07-16  
**Baseline for:** Phase 7A (API & Transport Foundation)

---

## Verdict

### **PASS WITH NOTES**

Safe to proceed to **Phase 7A (API transport)**. Core layering and architecture laws hold. Notes are expected gaps (interfaces-only repos, in-memory adapters) plus a few soft workflow/status projection deviations—not blockers for HTTP transport.

---

## 1. Frozen architecture pack

| Check | Result |
|-------|--------|
| `docs/architecture/` exists | Yes (12 files) |
| Pack status | **FROZEN** (`ARCHITECTURE-FREEZE.md`, README) |
| Redesigned by implementation? | **No** — git history shows a single commit touching the pack: `a4e37f4` *docs(architecture): freeze enterprise architecture phases 0A–0F before implementation* |
| Implementation docs location | Separate: `docs/implementation/` (does not alter architecture pack) |

### Law documents (0A–0F)

| Doc | Path | Role |
|-----|------|------|
| **0A** | `docs/architecture/00-foundation/phase-0a-enterprise-architecture-laws.md` | Non-negotiable laws (Policy, Workflow, Rules, Approval, Outbox, ledgers, DAM, etc.) |
| **0B** | `docs/architecture/01-domain/phase-0b-enterprise-data-architecture.md` | Logical ERD, tenancy, append-only ledgers |
| **0C** | `docs/architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md` | Service boundaries, write ownership, command/query contracts |
| **0D** | `docs/architecture/02-integration/phase-0d-event-bus-integration-saga.md` | Event Bus, Outbox/Inbox, sagas |
| **0E** | `docs/architecture/03-security/phase-0e-enterprise-security-architecture.md` | Identity, Policy as sole runtime authz |
| **0F** | `docs/architecture/04-observability/phase-0f-observability-operations.md` | Logs/metrics/traces; no new business engines |

**Confirmation: architecture pack is untouched by Phases 1–6G.**

---

## 2. Package inventory & dependency boundaries

28 workspace packages under `packages/*`.

| Package | Phase | Role | Boundary |
|---------|-------|------|----------|
| `@afh/shared-kernel` | 1A | Kernel | Leaf |
| `@afh/persistence` | 1B | Infra foundation | Domain-neutral |
| `@afh/identity` | 2A | Platform / identity | Policy/RBAC |
| `@afh/platform` | 2B | Platform engines | Workflow/Approval/Rules |
| Domain foundations (3A–4G) | commerce…hr | Contracts only | No upward deps to apps |
| `@afh/infrastructure` | 5A | Runtime infra | Adapters |
| `@afh/application` | 5B | Application runtime | Composition root |
| `*-application` (6A–6G) | Application services | No HTTP/SQL/infra | Policy via pipeline |

### Illegal upward deps

| Check | Result |
|-------|--------|
| Domain → application / infrastructure | **None** |
| Foundation → `*-application` | **None** |
| `*-application` → Express/HTTP packages | **None** |
| `*-application` → `@afh/infrastructure` | **None** |

---

## 3. Architecture invariants (spot-check)

| Law | Finding |
|-----|---------|
| **Policy = sole authorization** | **HOLD.** Handlers return `authorize()` specs; pipeline `AuthorizationBehavior` calls `PolicyEngine`. |
| **Workflow = lifecycle SSoT** | **MOSTLY HOLD.** Lifecycle entities use Workflow start/transition. Soft notes below. |
| **Rules = calculation only** | **HOLD.** Apps invoke RulesEngine; no local scoring/pricing/tax/dispatch engines. |
| **Approval = human gates** | **HOLD.** Apps `submit` only; never decide. |
| **Outbox = sole publish** | **HOLD.** Apps enqueue OutboxStore only. |
| **No SQL / HTTP in apps** | **HOLD.** |

### Soft notes (not hard FAIL)

| Area | Issue |
|------|-------|
| Projects resource assign/release | Sets operational status without Workflow transition |
| Procurement supplier create | Initial `draft` without `workflow.start` |
| Inventory storage location create | Hardcodes `active` |
| Inventory stock movement | Movement `completed` as operational field |

These do not block Phase 7A.

---

## 4. Application module completeness (6A–6G)

| App | Package | Factory | Docs |
|-----|---------|---------|------|
| Sales | `@afh/sales-application` | `createSalesApplication()` | phase-6a |
| Procurement | `@afh/procurement-application` | `createProcurementApplication()` | phase-6b |
| Inventory | `@afh/inventory-application` | `createInventoryApplication()` | phase-6c |
| Finance | `@afh/finance-application` | `createFinanceApplication()` | phase-6d |
| Projects | `@afh/projects-application` | `createProjectApplication()` | phase-6e |
| Service | `@afh/service-application` | `createServiceApplication()` | phase-6f |
| CRM | `@afh/crm-application` | `createCrmApplication()` | phase-6g |

---

## 5. Gaps / risks before Phase 7A

| Topic | Implication |
|-------|-------------|
| Repository interfaces only | Host must inject fakes/in-memory or real adapters |
| In-memory infrastructure defaults | Fine for local/API smoke; not production |
| Auth principal flow | 7A must authenticate → set `userId`/`principal` on context |
| No centralized host composition yet | 7A needs one composition root registering all apps |
| CMS/HR/Manufacturing apps not built | Foundations only — out of 6A–6G scope |

---

## 6. Recommendation

**Proceed to Phase 7A.**

Keep HTTP thin: authenticate → principal → `commands.dispatch` / `queries.dispatch`. Do not reintroduce authz, rules, workflow, or event publish in controllers. Track soft status-projection notes as optional follow-up before production persistence hardening.
