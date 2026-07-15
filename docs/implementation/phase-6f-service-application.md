# Phase 6F — Service Management Application Services

**Status:** Implemented  
**Package:** `@afh/service-application`  
**Depends on:** Phase 4D Service, Phase 5B Application Runtime, Phase 6A–6E pattern  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Sixth executable business application module. Service command and query handlers register into the Phase 5B `HandlerRegistry` and orchestrate:

- Service repository interfaces (`@afh/service`)
- Policy authorization (sole path via pipeline)
- Workflow lifecycle for service requests, work orders, and appointments
- Rules evaluation for technician selection, dispatch, SLA, workload balancing, and appointment optimization (no inline engines)
- Approval submission for configured close/complete/assign gates
- Outbox persistence of domain events where contracts exist
- Security audit on every mutation

No HTTP, SQL, UI, dispatch engines, scheduling engines, or Event Bus changes.

## Package path

`packages/service-application`

## Composition

```ts
const serviceApp = createServiceApplication({
  serviceRequests, workOrders, appointments, technicianAssignments,
  outbox, audit, handlers,
});
```

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Policy = sole authorization | Every handler provides `authorize()` |
| Workflow = lifecycle SSoT | Service request/work order/appointment create start workflow; transitions for lifecycle |
| Rules = evaluation engine | Selection/dispatch/SLA/workload/appointment via RulesEngine |
| Approval = human decisions | Optional close/complete/assign gates; no decide logic |
| Outbox = sole publish path | Events enqueued to OutboxStore |
| Pattern parity with 6A–6E | Same composition and pipeline |

## Events used (existing foundation contracts)

| Command | Event |
|---------|-------|
| CreateServiceRequest | `service.request.created` |
| CreateWorkOrder | `service.work_order.created` |
| ScheduleAppointment / RescheduleAppointment | `service.appointment.scheduled` |
| AssignTechnician / ReassignTechnician | `service.technician.assigned_reference` |
| CloseServiceRequest | `service.request.completed` |
| Update Service Request / Update Work Order / Complete Work Order | Audit only (no foundation event yet) |

## Explicit non-goals

SQL/ORM, HTTP/REST/GraphQL, controllers, UI, dispatch/scheduling/route optimization engines, Event Bus/Workflow/Rules/Policy/Approval engine changes, reporting, search, notifications.

## Related

- [Phase 4D Service](./phase-4d-service.md)
- [Phase 6E Projects Application](./phase-6e-projects-application.md)
- [Phase 5B Application Runtime](./phase-5b-application-runtime.md)
