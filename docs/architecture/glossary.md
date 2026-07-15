# Enterprise Glossary

**Status:** Authoritative for Phases 0A–0F  
**Rule:** One definition per term. Implementation and docs must use these meanings.

| Term | Definition |
|------|------------|
| **Aggregate** | A cluster of domain objects treated as a single consistency boundary for writes; changes commit together. |
| **Aggregate Root** | The entry entity that enforces invariants for an aggregate. |
| **Approval Engine** | Shared kernel that runs human review lifecycles (submit → review → approve/reject/changes requested). |
| **Architecture Law** | Non-negotiable rule from Phase 0A that implementation must not violate. |
| **ABAC** | Attribute-based access control conditions evaluated by the Policy Engine (resource/context attributes). |
| **Bounded Context** | A domain boundary with its own model and exclusive write ownership (see Phase 0C services). |
| **Branch** | Logical operating site under a Company; may host multiple Locations. |
| **Causation ID** | Identifier of the parent command or event that directly caused the current event. |
| **Command** | An intent to change state, handled by an application service (Phase 0C). |
| **Company** | Tenant organization; every tenant-owned row carries `company_id`. |
| **Compensation** | Saga action that undoes or neutralizes a prior step after failure (without rewriting immutable history). |
| **Correlation ID** | End-to-end identifier for a business journey across requests, events, sagas, and audits. |
| **DAM** | Digital Asset Management — sole owner of files/media and metadata. |
| **Dead Letter Queue (DLQ)** | Holding area for messages that exhausted retries or are poison. |
| **Decision Register / ADR** | Record of Approved, Deferred, or Rejected architectural/business decisions. |
| **Domain Event** | Immutable fact that something happened in a domain; published via Outbox to the Event Bus. |
| **Employee** | Staff identity linked to a User; field trades are Employees on Teams, not separate RBAC roles. |
| **Event Bus** | Transport for asynchronous domain events; not a business decision engine. |
| **Feature Flag** | Runtime switch to enable/disable capabilities without redeploying architecture. |
| **Inbox** | Consumer-side deduplication store ensuring at-least-once delivery yields exactly-once logical effects. |
| **Location** | Physical place under a Branch (warehouse, showroom, workshop, office). |
| **Organization** | B2B or partner firm entity (buyer, shop, wholesaler, contractor firm, etc.). |
| **Outbox** | Transactional table written with business changes; relay publishes to the Event Bus (at-least-once). |
| **Partner** | Revenue or project partner identity (agent, designer, architect, civil engineer, contractor) via partner profile. |
| **Policy Engine** | Sole **runtime** authorization engine; evaluates principal + action + resource + context → Allow/Deny. |
| **Projection** | Read-optimized field or model derived from source of truth (e.g. entity `status` from Workflow stage). |
| **Query** | Read intent that does not change write-model state (may hit read models/search). |
| **RBAC** | Role-based access control **data** (roles, permissions, assignments); feeds Policy; not runtime gate by itself. |
| **Read Model** | Store optimized for queries (search index, dashboard snapshots); not authoritative for lifecycle. |
| **Reporting Framework** | Sole owner of reports, exports, schedules, shareable reports, dashboard definitions and widgets. |
| **Rules Engine** | Sole engine for configurable business calculations (price adjustments, MOQ, commission, warranty days, etc.). |
| **Saga** | Long-running cross-aggregate orchestration of commands/events with compensation; does not replace Workflow SSoT. |
| **Service Account** | Non-human principal for integrations, constrained by Policy. |
| **Stock Ledger** | Append-only record of inventory quantity changes; only legal path to change stock. |
| **Team** | Group of Employees (delivery, installation, carpenter, paint, polish, warehouse, etc.). |
| **Tenant** | Company boundary for data isolation. |
| **Trace ID** | Technical distributed-tracing identifier for a request path (complements Correlation ID). |
| **Workflow Engine** | Sole source of truth for business lifecycle stage of long-running subjects. |
| **Workflow Definition** | Versioned template of stages and transitions (early “status chains” are default definitions only). |
| **Workflow Instance** | Running process for a subject; `current_stage_id` is canonical status. |
| **Write Model** | Authoritative transactional model for an aggregate. |
| **Idempotency Key** | Client/command key ensuring retries do not duplicate business effects. |
| **KYC** | Know-your-customer / business verification documents; restricted classification. |
| **PII** | Personally identifiable information; protected per Phase 0E. |
| **NFR Quality Gate** | Non-functional acceptance criteria every implementation phase must pass (Phase 0A). |
| **Modular Monolith** | Preferred initial deployable shape with clear module boundaries (may extract later). |
| **Exactly-once logical** | Business effect applied once despite at-least-once transport, via Inbox + aggregate guards. |

---

## Related

- [Master Index](./README.md)
- [Phase 0A](./00-foundation/phase-0a-enterprise-architecture-laws.md)
- [ADR Index](./decision-records/ADR-INDEX.md)
