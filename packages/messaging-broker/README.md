# @afh/messaging-broker

Enterprise **Message Broker & Event Bus Providers** (Phase 7D).

Durable SQLite-backed broker implementing the existing `EventBus` contract.
Business modules stay unaware of the broker and continue writing Outbox only.

## Composition

```ts
import { createInfrastructureRuntime } from "@afh/infrastructure";
import { createMessagingRuntime } from "@afh/messaging-broker";

const infraSeed = createInfrastructureRuntime({
  persistence: sql, // optional
  // eventBus defaults to in-memory until messaging is wired
});

const messaging = createMessagingRuntime({
  logger: infraSeed.logger,
  metrics: infraSeed.metrics,
  tracer: infraSeed.tracer,
  inbox: infraSeed.inbox,
  config: {
    brokerDatabasePath: "./data/broker.sqlite",
    brokerEndpoint: "local://durable-broker",
  },
});

const infra = createInfrastructureRuntime({
  persistence: sql,
  eventBus: messaging.eventBus, // production broker
  messagingAdapter: "broker",
});

for (const probe of messaging.healthProbes) {
  infra.health.register(probe);
}

// Outbox → broker (sole publish path)
await infra.outboxDispatcher.dispatchOnce();

// Consumer poll (inbox dedupe + handlers / Application Runtime hook)
await messaging.consumer.pollOnce();
```

## Adapter selection

| Selection | Event Bus |
|-----------|-----------|
| `memory` (default) | `InMemoryEventBus` |
| `broker` | `BrokerEventBus` over durable SQLite broker |

## Out of scope

Business workflows, domain logic, Policy/Approval/Rules, controllers, UI, notification delivery, SQL redesign.
