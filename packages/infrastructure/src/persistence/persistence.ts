/**
 * Persistence adapters — re-export and wrap Phase 1B foundation.
 * No domain repositories.
 */

export {
  createInMemoryPersistenceFoundation,
  BaseRepository,
  InMemoryAggregateDocumentStore,
  InMemoryDomainEventStore,
  InMemoryOutboxStore,
  InMemoryInboxStore,
  UnitOfWorkImpl,
  DEFAULT_PERSISTENCE_CONFIG,
} from "@afh/persistence";

export type {
  PersistenceFoundation,
  CreatePersistenceFoundationOptions,
  AggregateDocumentStore,
  DomainEventStore,
  OutboxStore,
  InboxStore,
  DatabaseClient,
  PersistenceConfig,
} from "@afh/persistence";
