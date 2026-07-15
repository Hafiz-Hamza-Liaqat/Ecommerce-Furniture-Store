# @afh/application

Enterprise **Application Layer Foundation** (Phase 5B).

Reusable runtime that coordinates commands, queries, policies, unit of work, outbox flush, and optional Workflow / Approval / Rules engines.

Depends on: `@afh/shared-kernel`, `@afh/infrastructure`, `@afh/identity`, `@afh/platform`

## Composition

```ts
import { createInfrastructureRuntime } from "@afh/infrastructure";
import { createApplicationRuntime } from "@afh/application";

const infrastructure = createInfrastructureRuntime();
const app = createApplicationRuntime({
  infrastructure,
  policyEngine, // from identity / platform — sole authz engine
  workflow,     // optional
  approval,     // optional
  rules,        // optional
});

// Register handlers from future business modules, then:
await app.commands.dispatch(command, {
  correlationId: "...",
  userId: "...",
  companyId: "...",
  principal,
});

await app.queries.dispatch(query, { correlationId: "...", principal });
```

## Pipeline stages

| Command | Query |
|---------|-------|
| Exception mapping | Exception mapping |
| Logging / metrics / tracing | Logging / metrics / tracing |
| Audit hook (optional) | Audit hook (optional) |
| Validation (Phase 1A) | Validation |
| Policy authorization (sole path) | Policy authorization |
| Outbox flush (after success) | — |
| Unit of Work | — |
| Handler invocation | Handler invocation |

## Ownership rules

| Concern | Rule |
|---------|------|
| Authorization | **PolicyEngine only** — no alternate path |
| Event publish | **OutboxDispatcher** after successful commands |
| Lifecycle | Workflow via context extension points |
| Human gates | Approval via context extension points |
| Calculations | Rules via context extension points |
| Transport | Not in this package |

## Out of scope

REST/HTTP/GraphQL, UI, business handlers, Sales/Inventory/CRM commands, SQL repositories, notification delivery.
