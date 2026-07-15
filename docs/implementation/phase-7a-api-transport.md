# Phase 7A — Enterprise API & Transport Foundation

**Status:** Implemented  
**Package:** `@afh/api`  
**Depends on:** Phases 0A–0F (frozen), 1A–6G, Phase 5B Application Runtime  
**Architecture:** Phases 0A–0F (unchanged / frozen)  
**Baseline audit:** [phase-6g-architecture-compliance-audit.md](./phase-6g-architecture-compliance-audit.md)

## Summary

Transport foundation that makes the ERP externally accessible while preserving every architecture law. The API host:

- Boots infrastructure, identity, platform engines, and application runtime
- Registers Sales, Procurement, Inventory, Finance, Projects, Service, and CRM application handlers into one `HandlerRegistry`
- Exposes thin HTTP routes that convert requests into Commands/Queries and dispatch through Application Runtime
- Authenticates via Identity sessions; **never** authorizes in controllers (Policy only)
- Maps Phase 1A `PlatformError` to transport responses (no second error hierarchy)
- Exposes liveness / readiness / startup / version health probes (Phase 0F)
- Provides OpenAPI metadata, API versioning contracts, rate-limit hooks, DAM upload routing, and streaming abstractions

No business logic, SQL, Event Bus changes, or architecture pack modifications.

## Package path

`packages/api`

## Composition

```ts
const host = createApiHost({
  repositories: {
    sales, procurement, inventory, finance, projects, service, crm, damAssets,
  },
  host: "0.0.0.0",
  port: 8080,
});
await host.start();
```

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Policy = sole authorization | Controllers authenticate only; `AuthorizationBehavior` enforces Policy |
| Workflow = lifecycle SSoT | Unchanged — handlers invoke Workflow inside runtime |
| Rules = calculation engine | Unchanged — handlers invoke Rules inside runtime |
| Approval = human decisions | Unchanged — handlers submit only |
| Outbox = sole publish path | Unchanged — apps enqueue Outbox; transport does not publish |
| Thin transport | Routes map DTOs → Command/Query → dispatch |
| No framework lock-in | Framework-agnostic contracts + optional Node HTTP adapter |

## Explicit non-goals

Sales/Inventory/Workflow/Approval/Rules logic, pricing/tax, SQL/ORM, UI, Event Bus changes, payment gateways, reporting/search/notification engines.

## Related

- [Phase 6G Architecture Compliance Audit](./phase-6g-architecture-compliance-audit.md)
- [Phase 5B Application Runtime](./phase-5b-application-runtime.md)
- [Phase 6G CRM Application](./phase-6g-crm-application.md)
- [Phase 0F Observability](../architecture/04-observability/phase-0f-observability-operations.md)
