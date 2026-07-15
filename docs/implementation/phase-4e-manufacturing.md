# Phase 4E — Manufacturing Domain Foundation

**Status:** Implemented  
**Package:** `@afh/manufacturing`  
**Depends on:** Phase 1A Shared Kernel  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable Manufacturing domain foundation: bill of materials, production orders, work centers, operations, routings, quality references, cross-domain references, event contracts, repository interfaces, structural validators, and `createManufacturingFoundation()`.

No production planning, scheduling, material allocation, inventory consumption, costing, quality execution, workflow definitions, Event Bus, persistence implementations, or HTTP.

## Package path

`packages/manufacturing`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Workflow = lifecycle SSoT | Production order status is metadata only |
| Inventory owns stock | Inventory/warehouse refs only |
| Finance owns costing | Cost sheet references only |
| Projects / DAM / Procurement / Service | Opaque refs only |
| Policy = sole runtime authz | No authorization logic |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

Production planning, scheduling, capacity planning, material allocation, inventory consumption, cost accounting, quality execution, workflow/approval/rules implementations, Event Bus, SQL/ORM, APIs/HTTP/UI, workers.

## Related architecture

- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0C Manufacturing](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
- [Phase 0D Integration](../architecture/02-integration/phase-0d-event-bus-integration-saga.md)
