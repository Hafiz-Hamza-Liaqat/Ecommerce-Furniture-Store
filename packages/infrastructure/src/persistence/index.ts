export {
  createInMemoryPersistenceFoundation,
  BaseRepository,
  InMemoryAggregateDocumentStore,
  InMemoryDomainEventStore,
  InMemoryOutboxStore,
  InMemoryInboxStore,
  UnitOfWorkImpl,
  DEFAULT_PERSISTENCE_CONFIG,
} from "./persistence.js";
export type {
  PersistenceFoundation,
  CreatePersistenceFoundationOptions,
  AggregateDocumentStore,
  DomainEventStore,
  OutboxStore,
  InboxStore,
  DatabaseClient,
  PersistenceConfig,
} from "./persistence.js";
