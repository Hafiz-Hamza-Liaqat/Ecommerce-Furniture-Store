# Phase 6B — Procurement Application Services

**Status:** Implemented  
**Package:** `@afh/procurement-application`  
**Depends on:** Phase 4B Procurement, Phase 5B Application Runtime, Phase 6A pattern  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Second executable business application module. Procurement command and query handlers register into the Phase 5B `HandlerRegistry` and orchestrate:

- Procurement repository interfaces (`@afh/procurement`)
- Policy authorization (sole path via pipeline)
- Workflow lifecycle start/transition for requisitions and purchase orders
- Rules evaluation for supplier eligibility, purchasing limits, approval thresholds, financial policy refs
- Approval submission for configured submit/issue/cancel gates
- Outbox persistence of domain events (where contracts exist)
- Security audit records

Cross-domain coordination is by reference only (projectId, warehouseId, commerce price/tax refs). No Inventory reservation or Finance posting.

No HTTP, SQL, UI, or transport adapters.

## Package path

`packages/procurement-application`

## Composition

```ts
const procurement = createProcurementApplication({
  suppliers, requisitions, purchaseOrders, outbox, audit,
});
const app = createApplicationRuntime({ ..., handlers: procurement.handlers });
```

Handlers from Sales and Procurement can share one `HandlerRegistry`.

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Policy = sole authorization | Every handler provides `authorize()` |
| Workflow = lifecycle SSoT | PR/PO create start workflow; submit/issue/cancel transition |
| Rules = evaluation engine | Eligibility/limits/thresholds/financial via RulesEngine |
| Approval = human decisions | Submit/issue/cancel may submit Approval; no decide logic |
| Outbox = sole publish path | Events enqueued to OutboxStore |
| Inventory / Finance / DAM / Projects | ID references only |
| Pattern parity with Phase 6A | Same composition, handler factories, pipeline integration |

## Host prerequisites

Register workflow definitions `purchase_requisition_v1` and `purchase_order_v1`, optional rule sets (`procurement.supplier_eligibility`, `procurement.purchasing_limits`, `procurement.approval_thresholds`, `procurement.financial_policy`), approval types for submit/issue/cancel, and Policy permissions (`supplier.*`, `requisition.*`, `po.*`).

## Explicit non-goals

REST/GraphQL, controllers, UI, SQL/ORM, Event Bus consumers, notification delivery, search, reporting, AI, GRN receiving, inventory reservation, financial posting, supplier payments.

## Related

- [Phase 4B Procurement](./phase-4b-procurement.md)
- [Phase 6A Sales Application](./phase-6a-sales-application.md)
- [Phase 5B Application Runtime](./phase-5b-application-runtime.md)
- [Phase 0C Domain Services](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
