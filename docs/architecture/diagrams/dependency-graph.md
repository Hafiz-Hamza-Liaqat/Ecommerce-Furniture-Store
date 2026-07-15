# Architecture Dependency Graph

```mermaid
flowchart TB
  A[Phase 0A Foundation and Laws]
  B[Phase 0B Data Architecture ERD]
  C[Phase 0C Domain and Service Architecture]
  D[Phase 0D Event Bus Integration Saga]
  E[Phase 0E Security]
  F[Phase 0F Observability]
  IMP[Implementation Phases]

  A --> B
  B --> C
  C --> D
  D --> E
  E --> F
  F --> IMP
```

## Kernel interaction (logical)

```mermaid
flowchart LR
  Domains[Domain Services]
  Policy[Policy Engine]
  WF[Workflow Engine]
  Rules[Rules Engine]
  Appr[Approval Engine]
  Bus[Event Bus]
  DAM[DAM]
  Rep[Reporting]
  Notif[Notifications]

  Domains --> Policy
  Domains --> WF
  Domains --> Rules
  Domains --> Appr
  Domains --> DAM
  Domains -->|outbox events| Bus
  Bus --> Notif
  Bus --> Rep
  Domains -->|metric definitions| Rep
```

## Related

- [Master Index](../README.md)
- [Phase 0C Service Boundaries](../01-domain/phase-0c-enterprise-domain-service-architecture.md)
- [Phase 0D Integration](../02-integration/phase-0d-event-bus-integration-saga.md)
