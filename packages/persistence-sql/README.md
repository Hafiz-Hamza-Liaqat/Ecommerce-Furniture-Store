# @afh/persistence-sql

Enterprise **SQL Persistence Adapters** (Phase 7B).

Replaces in-memory persistence with durable SQLite-backed stores (`node:sqlite`) while preserving every Phase 1B contract and all domain repository interfaces.

## Composition

```ts
const sql = createSqlPersistenceFoundation({
  config: { databasePath: "./data/afh.sqlite" },
});

const infra = createInfrastructureRuntime({ persistence: sql });

const identity = createIdentityFoundation({
  store: sql.identityStore,
  // inject SqlSecurityAuditStore via custom wiring if needed
});

const repos = sql.repositories; // sales, inventory, … + damAssets
```

## What is durable

| Store | Table(s) |
|-------|----------|
| Aggregates | `aggregate_documents` (JSON + optimistic version) |
| Domain events | `domain_events` (append-only) |
| Outbox | `outbox_messages` |
| Inbox | `inbox_processed` |
| Stock ledger | `stock_ledger_entries` |
| Financial ledger | `financial_ledger_entries` |
| Identity | `identity_records` |
| Security audit | `security_audit_records` |

## Adapter selection

Infrastructure continues to default to in-memory. Inject SQL via `createInfrastructureRuntime({ persistence: createSqlPersistenceFoundation(...) })`.

## Out of scope

Business logic, Event Bus publish, ORM, UI, Workflow/Rules/Policy changes.
