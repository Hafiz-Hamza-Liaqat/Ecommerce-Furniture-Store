# Phase 7D — Enterprise Message Broker & Event Bus Providers

**Status:** Implemented  
**Package:** `@afh/messaging-broker`  
**Depends on:** Phase 0D Event Bus, Phase 5A Infrastructure, Phase 7B SQL (optional durable path)  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Production durable message broker behind the existing `EventBus` abstraction. Outbox remains the sole publish source. Inbox remains the sole consumer deduplication mechanism. Business modules and Application Runtime are unchanged.

## Package path

`packages/messaging-broker`

## Composition

```ts
const messaging = createMessagingRuntime({
  logger: infra.logger,
  metrics: infra.metrics,
  tracer: infra.tracer,
  inbox: infra.inbox,
  config: { brokerDatabasePath: "./data/broker.sqlite" },
  application: {
    // Optional: dispatch through Application Runtime without embedding domain logic here
    dispatch: async (envelope) => { /* host wiring */ return ok(undefined); },
  },
});

const infra = createInfrastructureRuntime({
  eventBus: messaging.eventBus,
  messagingAdapter: "broker",
  persistence: sql, // optional
});
```

| Selection | Bus |
|-----------|-----|
| `memory` (default) | `InMemoryEventBus` |
| `broker` | `BrokerEventBus` + durable SQLite broker |

## Deliverables

| Deliverable | Implementation |
|-------------|----------------|
| Message broker | `DurableMessageBroker` (publish / claim / ack / retry / DLQ) |
| Broker Event Bus | `BrokerEventBus` implements `EventBus` |
| Consumer runtime | `ConsumerRuntime` (claim, inbox dedupe, ack, retry, poison→DLQ) |
| Retry engine | `RetryEngine` exponential backoff + limits + metadata |
| Dead letter queue | `DurableDeadLetterQueue` + operator `replay()` |
| Correlation | Propagates `correlation_id` / `causation_id` / `event_id` / trace context from payload |
| Serialization | Existing `JsonSerializer` / serialization runtime |
| Health | Broker connectivity, publish, consumer, DLQ probes |
| Observability | publish / throughput / retry / lag / DLQ / latency metrics |
| Configuration | `MessagingConfig` / `bindMessagingConfig` |
| Infra composition | `eventBus?` + `messagingAdapter?: "memory" \| "broker"` |

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Outbox sole publish | Only `OutboxDispatcher` calls `eventBus.publish` |
| Inbox sole dedupe | `ConsumerRuntime` claims via `InboxRuntime` |
| Event Bus contracts | Same `EventBus` interface; additive envelope fields only |
| Business modules unchanged | Still enqueue Outbox only |
| Correlation preserved | Extracted from domain payload metadata into envelope |

## Explicit non-goals

Business workflows, domain logic, Policy/Approval/Rules, controllers, UI, notification delivery, SQL redesign, search, AI.

## Related

- [Phase 0D Event Bus](../architecture/02-integration/phase-0d-event-bus-integration-saga.md)
- [Phase 7B SQL Persistence](./phase-7b-sql-persistence.md)
- [Phase 7C Identity Providers](./phase-7c-identity-providers.md)
