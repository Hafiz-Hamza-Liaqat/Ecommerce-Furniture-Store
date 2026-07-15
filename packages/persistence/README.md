# @afh/persistence

Enterprise **Persistence Foundation** (Phase 1B).

Depends on: [`@afh/shared-kernel`](../shared-kernel/README.md) (Phase 1A)  
Architecture: [`docs/architecture/`](../../docs/architecture/README.md) (frozen)

## Purpose

Reusable, domain-neutral persistence infrastructure for every bounded context.

**Zero business behavior.**

## Contents

| Area | Location |
|------|----------|
| Database abstractions + in-memory adapter | `src/database` |
| Unit of Work + transaction context | `src/transaction` |
| Optimistic concurrency | `src/concurrency` |
| Aggregate persistence records | `src/aggregate` |
| Base repository + document store | `src/repository` |
| Domain event store | `src/events` |
| Outbox store (no publisher) | `src/outbox` |
| Inbox store (no consumers) | `src/inbox` |
| Mapping abstractions | `src/mapping` |
| Persistence configuration | `src/configuration` |
| Composition root | `src/composition` |

## Explicitly out of scope

Identity, auth, domain repositories, Event Bus publisher/consumers, sagas, HTTP, ORM/SQL migrations, Workflow/Approval/Rules/Policy.

## Usage

```ts
import {
  createInMemoryPersistenceFoundation,
  BaseRepository,
} from "@afh/persistence";

const persistence = createInMemoryPersistenceFoundation();
await persistence.unitOfWork.execute(async () => {
  // domain-neutral transactional work
  return /* Result */;
});
```

Later SQL adapters implement `DatabaseClient` / store interfaces without changing UoW contracts.

## Scripts

```bash
npm install
npm run typecheck -w @afh/persistence
npm run lint -w @afh/persistence
npm run build -w @afh/persistence
```
