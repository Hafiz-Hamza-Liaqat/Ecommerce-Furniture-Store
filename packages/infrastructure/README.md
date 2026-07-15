# @afh/infrastructure

Enterprise **Runtime Infrastructure Adapters** (Phase 5A).

Concrete implementations for Shared Kernel and Persistence contracts: database provider, outbox dispatcher, inbox idempotency, in-memory Event Bus transport, serialization, configuration, logging, metrics, tracing, and health probes.

Depends on: `@afh/shared-kernel`, `@afh/persistence`

## Composition

```ts
import { createInfrastructureRuntime } from "@afh/infrastructure";

const runtime = createInfrastructureRuntime({
  config: { serviceName: "afh-api", environment: "development" },
});

// Domains write outbox rows via persistence; dispatcher is the sole publisher path:
await runtime.outboxDispatcher.dispatchOnce();

const health = await runtime.health.checkAll();
runtime.dispose();
```

## Ownership rules

| Concern | Rule |
|---------|------|
| Event publish path | **Outbox → OutboxDispatcher → Event Bus** only |
| Inbox | Idempotency / dedupe for consumers (no business handlers) |
| Workflow / Policy / Rules / Approval | Untouched (remain in platform/identity) |
| Business services / HTTP | Not in this package |

## Default adapters

In-memory database, Event Bus, metrics, and tracer. SQL/broker adapters can replace `DatabaseProvider` and `EventBus` later without changing domain packages.

## Out of scope

Sales/Inventory/CRM/etc. services, REST/GraphQL, UI, workflow/approval/rules execution, search/reporting/notification engines, AI providers.
