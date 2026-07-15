# Phase 6A — Sales Application Services

**Status:** Implemented  
**Package:** `@afh/sales-application`  
**Depends on:** Phase 4A Sales, Phase 5B Application Runtime, Identity/Platform/Persistence contracts  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

First executable business application module. Sales command and query handlers register into the Phase 5B `HandlerRegistry` and orchestrate:

- Sales repository interfaces (`@afh/sales`)
- Policy authorization (sole path via pipeline)
- Workflow lifecycle start/transition
- Rules evaluation for pricing / discount / tax / credit references
- Approval submission for configured cancel gates
- Outbox persistence of domain events
- Security audit records

No HTTP, SQL, UI, or transport adapters.

## Package path

`packages/sales-application`

## Composition

`createSalesApplication()` registers all Sales handlers. Host wires:

```ts
const sales = createSalesApplication({ opportunities, quotes, orders, outbox, audit });
const app = createApplicationRuntime({ ..., handlers: sales.handlers });
```

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Policy = sole authorization | Every handler provides `authorize()`; pipeline evaluates PolicyEngine |
| Workflow = lifecycle SSoT | Creates/cancels start or transition workflow; status synced from projection |
| Rules = evaluation engine | Pricing/discount/tax/credit via `RulesEngine.evaluate`; no formulas in handlers |
| Approval = human decisions | Cancel may submit Approval request; no decide logic in handlers |
| Outbox = sole publish path | Events enqueued to `OutboxStore`; pipeline flushes dispatcher |
| No transport | In-process dispatchers only |

## Host prerequisites

Before runtime use, register:

- Workflow definitions: `sales_opportunity_v1`, `quote_v1`, `sales_order_fulfillment_v1`
- Rule sets (optional until needed): `sales.pricing`, `sales.discount_eligibility`, `sales.tax`, `sales.credit_check`
- Approval definition type `sales.order_cancel` when using cancel-with-approval
- Policy permissions matching `opportunity.*`, `quote.*`, `order.*`

## Explicit non-goals

REST/GraphQL/WebSockets, controllers, UI, SQL/ORM, Event Bus consumers, notification delivery, search indexing, reporting generation, AI integration, inventory reservation, payment processing.

## Related

- [Phase 4A Sales](./phase-4a-sales.md)
- [Phase 5B Application Runtime](./phase-5b-application-runtime.md)
- [Phase 0C Domain Services](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
