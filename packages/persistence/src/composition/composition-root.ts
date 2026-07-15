/**
 * Persistence composition root — wires foundation components.
 * No business repositories or services.
 */

import { SystemUtcClock, type Clock, type UnitOfWork } from "@afh/shared-kernel";
import type { DatabaseClient } from "../database/database.js";
import { InMemoryDatabaseClient } from "../database/in-memory-database.js";
import { InMemoryAggregateDocumentStore } from "../repository/in-memory-aggregate-document-store.js";
import type { AggregateDocumentStore } from "../repository/aggregate-document-store.js";
import { InMemoryDomainEventStore } from "../events/in-memory-domain-event-store.js";
import type { DomainEventStore } from "../events/domain-event-store.js";
import { InMemoryOutboxStore } from "../outbox/in-memory-outbox-store.js";
import type { OutboxStore } from "../outbox/outbox-store.js";
import { InMemoryInboxStore } from "../inbox/in-memory-inbox-store.js";
import type { InboxStore } from "../inbox/inbox-store.js";
import {
  StackTransactionContext,
  type TransactionContext,
} from "../transaction/transaction-context.js";
import { UnitOfWorkImpl } from "../transaction/unit-of-work.js";
import {
  DEFAULT_PERSISTENCE_CONFIG,
  StaticPersistenceConfigProvider,
  type PersistenceConfig,
  type PersistenceConfigProvider,
} from "../configuration/configuration.js";

export type PersistenceFoundation = {
  readonly config: PersistenceConfig;
  readonly clock: Clock;
  readonly database: DatabaseClient;
  readonly transactionContext: TransactionContext;
  readonly unitOfWork: UnitOfWork;
  readonly aggregateStore: AggregateDocumentStore;
  readonly domainEventStore: DomainEventStore;
  readonly outboxStore: OutboxStore;
  readonly inboxStore: InboxStore;
};

export type CreatePersistenceFoundationOptions = {
  readonly config?: PersistenceConfig;
  readonly clock?: Clock;
};

/**
 * Creates the default in-memory persistence foundation.
 * SQL/ORM adapters can replace DatabaseClient and stores in later phases
 * without changing UnitOfWork or repository base contracts.
 */
export function createInMemoryPersistenceFoundation(
  options: CreatePersistenceFoundationOptions = {},
): PersistenceFoundation {
  const config = options.config ?? DEFAULT_PERSISTENCE_CONFIG;
  const configProvider: PersistenceConfigProvider =
    new StaticPersistenceConfigProvider(config);
  const clock = options.clock ?? new SystemUtcClock();
  const database = new InMemoryDatabaseClient();
  const transactionContext = new StackTransactionContext();
  const unitOfWork = new UnitOfWorkImpl(database, transactionContext);
  const aggregateStore = new InMemoryAggregateDocumentStore();
  const domainEventStore = new InMemoryDomainEventStore(clock);
  const outboxStore = new InMemoryOutboxStore();
  const inboxStore = new InMemoryInboxStore();

  // Touch provider so configuration surface is exercised without side effects.
  void configProvider.get();

  return {
    config,
    clock,
    database,
    transactionContext,
    unitOfWork,
    aggregateStore,
    domainEventStore,
    outboxStore,
    inboxStore,
  };
}
