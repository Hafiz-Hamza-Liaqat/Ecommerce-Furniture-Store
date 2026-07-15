# @afh/service-application

Enterprise **Service Management Application Services** (Phase 6F).

Sixth executable business module on the Phase 5B application runtime. Orchestrates `@afh/service` repositories through the shared pipeline — without HTTP or SQL.

Technician selection, dispatch, SLA evaluation, workload balancing, and appointment optimization remain in the **Rules Engine** — handlers only request evaluation.

## Composition

```ts
const service = createServiceApplication({
  serviceRequests, workOrders, appointments, technicianAssignments,
  outbox: infrastructure.persistence.outboxStore,
  audit,
  handlers, // optional shared registry
});

const app = createApplicationRuntime({ ..., handlers: service.handlers });
```

## Commands

Create/Update/Close Service Request · Assign/Reassign Technician · Schedule/Reschedule Appointment · Create/Update/Complete Work Order

## Queries

Service Request, Work Order, Appointment, Technician Assignment, Service History, Service Summary

## Ownership

| Concern | Owner |
|---------|-------|
| Authorization | Policy only |
| Lifecycle | Workflow |
| Dispatch / selection / SLA / workload | Rules Engine |
| Event publish | Outbox only |

## Out of scope

HTTP, SQL/ORM, UI, dispatch engines, scheduling engines, route optimization, Event Bus changes.
