# Phase 5B — Enterprise Application Layer Foundation

**Status:** Implemented  
**Package:** `@afh/application`  
**Depends on:** Phase 1A Shared Kernel, Phase 2A/2B Identity & Platform, Phase 5A Infrastructure  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable Application Layer Foundation providing:

- Command execution pipeline (validation → policy → UoW → handler → audit → outbox flush)
- Query execution pipeline (validation → policy → handler)
- Handler contracts and registry (no domain handlers)
- Pipeline behaviors (validation, authorization, logging, metrics, tracing, transaction, exception mapping, outbox flush, audit)
- Application context (correlation, identity, company/branch scope, clock, cancellation, engines)
- Command/Query dispatchers (no transport routing)
- Extension points for Workflow, Approval, Rules
- Error mapping to canonical `Result` / `PlatformError`
- `createApplicationRuntime()` composition root

No HTTP, REST, GraphQL, UI, or business use cases.

## Package path

`packages/application`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Policy = sole runtime authorization | `AuthorizationBehavior` → `PolicyEngine.evaluate` only |
| Workflow = lifecycle SSoT | Wired optionally; `requireWorkflow(ctx)` extension |
| Approval = human decision engine | Wired optionally; `requireApproval(ctx)` extension |
| Rules = business evaluation engine | Wired optionally; `requireRules(ctx)` extension |
| Outbox = sole event publish path | `OutboxFlushBehavior` → `outboxDispatcher.dispatchOnce()` |
| No transport in application layer | Dispatchers are in-process only |

## Quality gates

- Architecture laws preserved
- No alternate authorization path
- No direct event publishing from handlers via this layer
- No transport-specific status codes
- No business commands, queries, or domain handlers

## Explicit non-goals

REST/GraphQL/WebSockets, authentication endpoints, Sales/Inventory/Procurement/CRM services, SQL repositories, search, notification delivery, AI providers.

## Related architecture

- [Phase 0A Architecture Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 5A Runtime Infrastructure](./phase-5a-runtime-infrastructure.md)
- [Phase 2A Identity](./phase-2a-identity.md)
- [Phase 2B Platform Engines](./phase-2b-platform-engines.md)
