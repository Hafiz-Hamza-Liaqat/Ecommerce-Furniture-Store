# Phase 3C — Enterprise Financial Foundation

**Status:** Implemented  
**Package:** `@afh/finance`  
**Depends on:** Phase 1A Shared Kernel, Phase 3A Commerce (Money/Currency/Tax reuse)  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable financial-domain foundations: money value objects (reused from Commerce) with precision/rounding references, financial accounts, ledger contracts, invoice/payment/credit models, tax profile/registration, financial event contracts, repository interfaces, structural validation, and `createFinancialFoundation()`.

No accounting engines, payment gateways, refunds, AR/AP, Event Bus, persistence implementations, HTTP, or financial workflows.

## Package path

`packages/finance`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Money append-only | Ledger entry contracts + append-only repository; no posting engine |
| Workflow = lifecycle SSoT | Invoice/payment status are data only; no workflows |
| Policy = sole runtime authz | No authorization logic |
| Rules = calculation engine | No tax/FX/pricing calculations |
| Approval = decision engine | No credit approval logic |
| No duplicate Money | Reuses `@afh/commerce` Money/Currency/ExchangeRateReference |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

Accounting engine, double-entry posting, payment gateways, refund processing, invoice workflow, AR/AP, procurement, sales orders, manufacturing, projects, services, workflow/approval definitions, rules content, Event Bus, search, reporting, notifications, AI, HTTP/controllers/UI, SQL/ORM/migrations.

## Related architecture

- [Master Index](../architecture/README.md)
- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0B Data](../architecture/01-domain/phase-0b-enterprise-data-architecture.md)
- [Phase 0C Domain/Service](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
