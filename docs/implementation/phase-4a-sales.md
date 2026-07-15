# Phase 4A — Sales Domain Foundation

**Status:** Implemented  
**Package:** `@afh/sales`  
**Depends on:** Phase 1A Shared Kernel, Phase 3A Commerce (price/discount/tax refs)  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable Sales domain foundation: customer sales context references, opportunities, quotes/revisions/lines, sales orders/lines, shipment references, finance/project/DAM cross-domain references, sales event contracts, repository interfaces, structural validators, and `createSalesFoundation()`.

No pricing engines, inventory reservation, payment processing, workflow definitions, Event Bus, persistence implementations, or HTTP.

## Package path

`packages/sales`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Workflow = lifecycle SSoT | Quote/order/opportunity status are metadata only |
| Rules = calculation engine | Price/discount/tax are Commerce opaque refs |
| Finance owns money documents | Invoice/payment references only |
| Inventory owns stock | No reservation/allocation |
| DAM owns files | Asset id references only |
| Projects owns projects | Project id references only |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

Pricing/tax/discount engines, inventory reservation, stock allocation, payment gateways, invoice posting, workflow/approval/policy/rules implementations, Event Bus, SQL/ORM, APIs/HTTP/UI, workers, notification delivery.

## Related architecture

- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0C Sales](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
- [Phase 0D Integration](../architecture/02-integration/phase-0d-event-bus-integration-saga.md)
