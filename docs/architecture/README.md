# Artisan Furnish Hub — Master Architecture Index

**Product:** Artisan Furnish Hub (Furniture Business Operating System)  
**Pack status:** FROZEN (Phases 0A–0F)  
**Mode:** Documentation only — implementation must not begin by altering this pack  

---

## Architecture Overview

Artisan Furnish Hub is an enterprise platform covering B2C commerce, B2B trade, CRM, ERP (inventory, production, procurement), partner networks (agents, designers, architects, civil engineers, contractors), service management, CMS, reporting, and reserved AI capabilities.

Architecture is organized as:

1. **Platform kernels** (Policy, RBAC, Workflow, Approval, Rules, DAM, Feature Flags, Event Bus, Search, Reporting, Settings, AI Gateway stubs)
2. **Domain services** with exclusive write ownership
3. **Event-driven integration** with Outbox/Inbox and sagas
4. **Security** with Policy Engine as sole runtime authorization
5. **Observability** without introducing duplicate business engines

---

## Document Hierarchy

```
docs/architecture/
├── README.md                          ← this index (entry point)
├── glossary.md
├── validation-report.md
├── 00-foundation/
│   ├── ARCHITECTURE-FREEZE.md
│   └── phase-0a-enterprise-architecture-laws.md
├── 01-domain/
│   ├── phase-0b-enterprise-data-architecture.md
│   └── phase-0c-enterprise-domain-service-architecture.md
├── 02-integration/
│   └── phase-0d-event-bus-integration-saga.md
├── 03-security/
│   └── phase-0e-enterprise-security-architecture.md
├── 04-observability/
│   └── phase-0f-observability-operations.md
├── decision-records/
│   └── ADR-INDEX.md
└── diagrams/
    └── dependency-graph.md
```

---

## Phase Dependency Order

```text
0A Foundation & Architecture Laws
 └─► 0B Enterprise Data Architecture (ERD)
      └─► 0C Domain & Service Architecture / API Contracts
           └─► 0D Event Bus, Integration & Saga Architecture
                └─► 0E Security, Identity, Authorization & Compliance
                     └─► 0F Observability, Monitoring & Operations
                          └─► IMPLEMENTATION (only after freeze)
```

---

## Dependency Graph

See [diagrams/dependency-graph.md](./diagrams/dependency-graph.md).

| Phase | Depends on | Unlocks |
|-------|------------|---------|
| 0A | — | All later phases |
| 0B | 0A | 0C–0F, persistence |
| 0C | 0A, 0B | 0D–0F, services |
| 0D | 0A–0C | 0E–0F, async integration |
| 0E | 0A–0D | 0F, secure implementation |
| 0F | 0A–0E | Production operations |

---

## Ownership Map (Kernels)

| Concern | Owner | Authoritative phase |
|---------|-------|---------------------|
| Business status / lifecycle | Workflow Engine | [0A](./00-foundation/phase-0a-enterprise-architecture-laws.md), [0C](./01-domain/phase-0c-enterprise-domain-service-architecture.md) |
| Runtime authorization | Policy Engine | [0A](./00-foundation/phase-0a-enterprise-architecture-laws.md), [0E](./03-security/phase-0e-enterprise-security-architecture.md) |
| Permission data | RBAC | [0A](./00-foundation/phase-0a-enterprise-architecture-laws.md), [0B](./01-domain/phase-0b-enterprise-data-architecture.md) |
| Business calculations | Rules Engine | [0A](./00-foundation/phase-0a-enterprise-architecture-laws.md), [0C](./01-domain/phase-0c-enterprise-domain-service-architecture.md) |
| Human gates | Approval Engine | [0A](./00-foundation/phase-0a-enterprise-architecture-laws.md), [0C](./01-domain/phase-0c-enterprise-domain-service-architecture.md) |
| Files / media | DAM | [0A](./00-foundation/phase-0a-enterprise-architecture-laws.md), [0B](./01-domain/phase-0b-enterprise-data-architecture.md) |
| Reports / dashboards / exports | Reporting Framework | [0A](./00-foundation/phase-0a-enterprise-architecture-laws.md), [0F](./04-observability/phase-0f-observability-operations.md) |
| Notifications dispatch | Event Bus consumers (Notifications) | [0A](./00-foundation/phase-0a-enterprise-architecture-laws.md), [0D](./02-integration/phase-0d-event-bus-integration-saga.md) |
| Stock quantity changes | Inventory / Stock Ledger | [0B](./01-domain/phase-0b-enterprise-data-architecture.md), [0C](./01-domain/phase-0c-enterprise-domain-service-architecture.md) |
| Cross-domain async | Event Bus + Outbox/Inbox | [0D](./02-integration/phase-0d-event-bus-integration-saga.md) |
| Telemetry pipelines | Platform Observability | [0F](./04-observability/phase-0f-observability-operations.md) |

---

## Frozen Architecture Laws (Summary Reference)

Authoritative full text: [Phase 0A](./00-foundation/phase-0a-enterprise-architecture-laws.md).

1. No domain bypasses kernels (notifications only via events).
2. Workflow is status SSoT; entity status is read-only projection.
3. Stock only via StockLedger.
4. Money is append-only where ledgers apply.
5. Files only via DAM.
6. Authorization only via Policy Engine.
7. Commercial calculations via Rules Engine.
8. Human gates via Approval Engine.
9. Side effects via Event Bus; handlers idempotent; outbox for critical paths.
10. New major capabilities behind Feature Flags.
11. Reports only via Reporting Framework.
12. Config via Settings Module.
13. Multi-branch by default.
14. `company_id` on tenant data.
15. Every implementation phase passes the NFR quality gate.

---

## Cross References

| Topic | Go to |
|-------|--------|
| Workflow | [0A](./00-foundation/phase-0a-enterprise-architecture-laws.md) · [0C](./01-domain/phase-0c-enterprise-domain-service-architecture.md) · [0D Sagas](./02-integration/phase-0d-event-bus-integration-saga.md) |
| Event Bus | [0D](./02-integration/phase-0d-event-bus-integration-saga.md) |
| Security / Policy | [0E](./03-security/phase-0e-enterprise-security-architecture.md) |
| Observability | [0F](./04-observability/phase-0f-observability-operations.md) |
| Data / ERD | [0B](./01-domain/phase-0b-enterprise-data-architecture.md) |
| Services / Commands | [0C](./01-domain/phase-0c-enterprise-domain-service-architecture.md) |
| Decisions | [ADR Index](./decision-records/ADR-INDEX.md) |
| Terms | [Glossary](./glossary.md) |
| Freeze rules | [ARCHITECTURE-FREEZE](./00-foundation/ARCHITECTURE-FREEZE.md) |
| Consistency proof | [Validation Report](./validation-report.md) |

---

## Implementation Gate

Implementation phases may begin **only after** this pack is committed and treated as frozen. See [ARCHITECTURE-FREEZE.md](./00-foundation/ARCHITECTURE-FREEZE.md).
