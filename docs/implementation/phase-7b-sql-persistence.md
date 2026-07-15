# Phase 7B — Enterprise SQL Persistence & Repository Adapters

**Status:** Implemented  
**Package:** `@afh/persistence-sql`  
**Depends on:** Phase 1B Persistence, Phase 0B Data Architecture, Phases 1A–7A  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Production SQL persistence layer that replaces in-memory adapters without changing business behavior. Domain packages and application services keep the same repository interfaces. Transport and architecture pack are unchanged.

## Package path

`packages/persistence-sql`

## Composition

```ts
// SQL selected
const sql = createSqlPersistenceFoundation({
  config: { databasePath: "./data/afh.sqlite" },
});
const infra = createInfrastructureRuntime({
  persistence: sql,
  persistenceAdapter: "sql",
});

// Or one-shot helper (registers migration + transaction health probes)
const infraSql = createSqlInfrastructureRuntime({
  sql: { config: { databasePath: "./data/afh.sqlite" } },
});

// Identity
createIdentityFoundation({ store: sql.identityStore });

// Application modules — same interfaces as before
createSalesApplication({ ...sql.repositories.sales, outbox, audit });
```

In-memory remains the default when `persistence` is omitted.

## Deliverables

| Deliverable | Implementation |
|-------------|----------------|
| Database provider | `SqliteDatabaseClient` (`node:sqlite`) + pooling/busy timeout |
| Unit of Work | Existing `UnitOfWorkImpl` over SQL transactions |
| Aggregate store | `aggregate_documents` + optimistic version |
| Event store | `domain_events` append-only |
| Outbox | `outbox_messages` durable |
| Inbox | `inbox_processed` idempotency |
| Identity | `SqlIdentityStore` + `SqlSecurityAuditStore` |
| Domain repos | SQL adapters for Sales…Reporting (+ DAM) |
| Ledgers | Dedicated append-only stock/finance tables |
| Migrations | Phase 0B-aligned hybrid schema (v1) |
| Health | DB connectivity + migration + transaction probes |
| Observability | Uses existing infra metrics/logger when hosted |

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Repository interfaces preserved | Adapters implement domain interfaces only |
| No business logic in persistence | Mapping is structural JSON document / row I/O |
| Outbox sole publish | Store only; dispatcher unchanged |
| Inbox idempotency | Durable processed keys |
| Event store append-only | INSERT only |
| Optimistic concurrency | Version checks on aggregate_documents |
| Application services unchanged | Same injection shape |

## Explicit non-goals

Business logic, controllers, UI, Workflow/Rules/Policy/Approval changes, Event Bus redesign, search engine, notifications providers, caching, ORM lock-in beyond the SQL adapter package.

## Related

- [Phase 1B Persistence](./phase-1b-persistence.md)
- [Phase 7A API Transport](./phase-7a-api-transport.md)
- [Phase 0B Data Architecture](../architecture/01-domain/phase-0b-enterprise-data-architecture.md)
