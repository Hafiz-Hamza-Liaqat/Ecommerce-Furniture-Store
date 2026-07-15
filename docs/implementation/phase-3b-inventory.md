# Phase 3B — Enterprise Inventory Foundation

**Status:** Implemented  
**Package:** `@afh/inventory`  
**Depends on:** Phase 1A Shared Kernel (Commerce refs by opaque id/SKU)  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable inventory-domain foundations: inventory items, warehouses, storage location hierarchy, stock quantity models, movement contracts, inventory ledger contracts, batch/lot and serial models, inventory event contracts, repository interfaces, structural validation, and `createInventoryFoundation()`.

No reservation/allocation engines, warehouse operations, picking, Event Bus, persistence implementations, HTTP, or business workflows.

## Package path

`packages/inventory`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Stock only via StockLedger | Ledger entry contracts + append-only repository interface; no direct stock mutation engine |
| Workflow = lifecycle SSoT | No inventory workflows; status fields are data only |
| Policy = sole runtime authz | No authorization logic |
| Rules = calculation engine | No stock/reservation rules content |
| Approval = decision engine | No approval definitions |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

Stock reservation engine, allocation, warehouse workflows, picking/packing/shipping, procurement, POs, sales orders, manufacturing, production orders, projects, services, payments, workflow/approval definitions, rules content, Event Bus, search, reporting, notifications, AI, HTTP/controllers/UI, SQL/ORM/migrations.

## Related architecture

- [Master Index](../architecture/README.md)
- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0B Data](../architecture/01-domain/phase-0b-enterprise-data-architecture.md)
- [Phase 0C Domain/Service](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
