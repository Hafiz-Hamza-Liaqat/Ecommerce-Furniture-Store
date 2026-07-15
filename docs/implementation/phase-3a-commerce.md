# Phase 3A — Enterprise Commerce Foundation

**Status:** Implemented  
**Package:** `@afh/commerce`  
**Depends on:** Phase 1A Shared Kernel  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable commerce-domain foundations: customer, organization commerce models, address/contact, product/catalog, units & measurement, currency & money, pricing/tax **contracts**, commerce event **contracts**, repository **interfaces**, structural validation contracts, and `createCommerceFoundation()` composition root.

No Sales, Inventory, CRM, pricing/tax calculations, Event Bus, persistence implementations, HTTP, or business workflows.

## Package path

`packages/commerce`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Workflow = lifecycle SSoT | No status workflows; entity status fields are data only |
| Policy = sole runtime authz | No authorization logic |
| Rules = calculation engine | Pricing/tax are opaque references only |
| Approval = decision engine | No approval definitions |
| No Event Bus in foundation | Event type contracts only |
| No duplicate engines | Depends on shared-kernel; reuses identity org by id reference |

## Explicit non-goals

Sales, quotations, orders, cart, checkout, inventory, warehouses, procurement, purchase orders, manufacturing, CRM, projects, services, payments, refunds, workflow/approval definitions, rules content, Event Bus, search, reporting, notifications, AI, HTTP/controllers/UI, SQL/ORM/migrations.

## Related architecture

- [Master Index](../architecture/README.md)
- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0B Data](../architecture/01-domain/phase-0b-enterprise-data-architecture.md)
- [Phase 0C Domain/Service](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
