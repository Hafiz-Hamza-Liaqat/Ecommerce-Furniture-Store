# Phase 4C — CRM Domain Foundation

**Status:** Implemented  
**Package:** `@afh/crm`  
**Depends on:** Phase 1A Shared Kernel, Phase 4A Sales (OpportunityReference)  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable CRM domain foundation: leads, contacts, accounts, activities, communication records, campaigns, cross-domain references, Sales opportunity reference (no duplication), CRM event contracts, repository interfaces, structural validators, and `createCrmFoundation()`.

No lead routing, campaign execution, notification delivery, workflow definitions, Event Bus, persistence implementations, or HTTP.

## Package path

`packages/crm`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Workflow = lifecycle SSoT | Lead status is metadata only |
| Identity owns users/orgs | Opaque user/org ids only |
| Sales owns opportunities | Re-exports `OpportunityReference` from `@afh/sales` |
| Notifications own delivery | `notificationId` references only |
| Reporting owns dashboards | Report definition references only |
| DAM owns files | Asset id references only |
| Policy = sole runtime authz | No authorization logic |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

Lead scoring/routing, sales automation, campaign execution, email/SMS/push, workflow/approval/rules implementations, Event Bus, SQL/ORM, APIs/HTTP/UI, workers.

## Related architecture

- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0C CRM](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
- [Phase 0D Integration](../architecture/02-integration/phase-0d-event-bus-integration-saga.md)
