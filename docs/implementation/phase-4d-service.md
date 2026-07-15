# Phase 4D — Service Management Domain Foundation

**Status:** Implemented  
**Package:** `@afh/service`  
**Depends on:** Phase 1A Shared Kernel  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable Service Management domain foundation: service requests, work orders/lines, appointments, technician/team assignment references, cross-domain references (customer, project, inventory, finance, DAM), event contracts, repository interfaces, structural validators, and `createServiceFoundation()`.

No scheduling engines, dispatch/assignment engines, inventory operations, billing, workflow definitions, Event Bus, persistence implementations, or HTTP.

## Package path

`packages/service`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Workflow = lifecycle SSoT | Status fields are metadata only |
| Identity owns employees | TechnicianReference uses employee/user ids |
| Projects own scheduling | Appointment is a model; no schedule engine |
| Inventory owns stock | Inventory item refs only |
| Finance owns billing | Invoice/payment refs only |
| DAM owns assets | Asset/attachment refs only |
| CRM/Commerce own customers | Opaque customer/contact/account ids |
| Policy = sole runtime authz | No authorization logic |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

Scheduling/dispatch/assignment engines, workflow/approval/rules implementations, inventory reservation/consumption, billing/payment processing, Event Bus, SQL/ORM, APIs/HTTP/UI, workers, notification delivery.

## Related architecture

- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0C Service Management](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
- [Phase 0D Integration](../architecture/02-integration/phase-0d-event-bus-integration-saga.md)
