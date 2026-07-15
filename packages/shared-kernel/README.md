# @afh/shared-kernel

Enterprise **Shared Kernel & Platform Foundation** (Phase 1A).

Architecture source of truth: [`docs/architecture/`](../../docs/architecture/README.md) (frozen 0A–0F).

## Purpose

Reusable, framework-agnostic platform primitives and contracts used by every bounded context.

**This package introduces zero business behavior.**

## Contents

| Area | Location |
|------|----------|
| Result model | `src/result` |
| Error model | `src/errors` |
| Identifiers | `src/identifiers` |
| Time / Clock | `src/time` |
| Paging & query criteria | `src/paging` |
| Configuration & secrets contracts | `src/configuration` |
| Validation contracts | `src/validation` |
| Domain event base contracts | `src/events` |
| Command / Query contracts | `src/messaging` |
| Repository & Unit of Work interfaces | `src/persistence` |
| Logging contracts | `src/logging` |
| Metrics contracts | `src/metrics` |
| Tracing contracts | `src/tracing` |
| Serialization contracts | `src/serialization` |
| Shared constants | `src/constants` |

## Explicitly out of scope (Phase 1A)

Identity, auth, domains, Workflow, Approval, Rules, Policy, Event Bus, Outbox/Inbox, persistence implementations, HTTP/GraphQL, messaging workers, UI.

## Usage

```ts
import { ok, fail, CorrelationId, SystemUtcClock } from "@afh/shared-kernel";
```

Domain and infrastructure packages depend on these contracts; they do not redefine Result, errors, or clocks.

## Scripts

```bash
npm install
npm run typecheck -w @afh/shared-kernel
npm run lint -w @afh/shared-kernel
npm run build -w @afh/shared-kernel
```

## Architecture compliance

- Architecture Laws 0A respected (no duplicate engines; contracts only for events/CQRS/persistence)
- Observability contracts align with 0F (Logger, Metrics, Tracer) without vendor lock-in
- Event metadata aligns with 0D envelope fields without implementing the bus
- Error categories align with 0C error model
