# Phase 4B — Procurement Domain Foundation

**Status:** Implemented  
**Package:** `@afh/procurement`  
**Depends on:** Phase 1A Shared Kernel, Phase 3A Commerce (price/discount/tax refs)  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable Procurement domain foundation: supplier context references, purchase requisitions/lines, purchase orders/lines, cross-domain references (GRN, invoice, payment, warehouse, project, DAM), procurement event contracts, repository interfaces, structural validators, and `createProcurementFoundation()`.

No purchasing workflows, approval definitions, inventory receipt processing, payment execution, Event Bus, persistence implementations, or HTTP.

## Package path

`packages/procurement`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Workflow = lifecycle SSoT | PR/PO status are metadata only |
| Finance owns invoices/payments | References only |
| Inventory owns stock/warehouses | GRN/warehouse references only |
| DAM owns files | Asset id references only |
| Projects own projects | Project id references only |
| Policy = sole runtime authz | No authorization logic |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

Procurement workflows, approval definitions, inventory receipt processing, GRN posting, payment execution, invoice lifecycle, pricing/tax engines, vendor onboarding, Event Bus, SQL/ORM, APIs/HTTP/UI, workers, notification delivery.

## Related architecture

- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0C Procurement](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
- [Phase 0D Integration](../architecture/02-integration/phase-0d-event-bus-integration-saga.md)
