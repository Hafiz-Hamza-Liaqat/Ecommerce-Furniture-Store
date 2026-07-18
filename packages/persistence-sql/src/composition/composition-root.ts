/**
 * SQL persistence foundation composition root.
 */

import {
  StackTransactionContext,
  UnitOfWorkImpl,
  type PersistenceFoundation,
} from "@afh/persistence";
import {
  SystemUtcClock,
  type Clock,
} from "@afh/shared-kernel";
import {
  DEFAULT_SQL_PERSISTENCE_CONFIG,
  type SqlPersistenceConfig,
} from "../config/config.js";
import { SqliteDatabaseClient } from "../database/sqlite-client.js";
import {
  assertMigrationCompatibility,
  runMigrations,
} from "../migrations/migrations.js";
import { SqlAggregateDocumentStore } from "../stores/aggregate-store.js";
import { SqlDomainEventStore } from "../stores/event-store.js";
import { SqlOutboxStore } from "../stores/outbox-store.js";
import { SqlInboxStore } from "../stores/inbox-store.js";
import { SqlIdentityStore } from "../identity/sql-identity-store.js";
import { SqlSecurityAuditStore } from "../identity/sql-audit-store.js";
import { SqlWorkflowStore } from "../platform/sql-workflow-store.js";
import { SqlApprovalStore } from "../platform/sql-approval-store.js";
import {
  createSqlEnterpriseRepositories,
  type SqlDomainRepositories,
} from "./repositories-root.js";

export type SqlPersistenceFoundation = PersistenceFoundation & {
  readonly sqlClient: SqliteDatabaseClient;
  readonly identityStore: SqlIdentityStore;
  readonly securityAuditStore: SqlSecurityAuditStore;
  readonly workflowStore: SqlWorkflowStore;
  readonly approvalStore: SqlApprovalStore;
  readonly repositories: SqlDomainRepositories;
  readonly migrationCompatible: boolean;
  readonly busyTimeoutMs: number;
  dispose(): void;
};

export type CreateSqlPersistenceFoundationOptions = {
  readonly config?: Partial<SqlPersistenceConfig>;
  readonly clock?: Clock;
};

/**
 * Creates production SQL persistence foundation (SQLite via node:sqlite).
 * Runs migrations, wires UoW, stores, identity, and domain repositories.
 */
export function createSqlPersistenceFoundation(
  options: CreateSqlPersistenceFoundationOptions = {},
): SqlPersistenceFoundation {
  const config: SqlPersistenceConfig = {
    ...DEFAULT_SQL_PERSISTENCE_CONFIG,
    ...options.config,
  };
  const clock = options.clock ?? new SystemUtcClock();
  const sqlClient = new SqliteDatabaseClient(
    config.databasePath,
    config.busyTimeoutMs,
  );

  runMigrations(sqlClient);
  const migrationCompatible = assertMigrationCompatibility(sqlClient);

  const transactionContext = new StackTransactionContext();
  const unitOfWork = new UnitOfWorkImpl(sqlClient, transactionContext);
  const aggregateStore = new SqlAggregateDocumentStore(sqlClient);
  const domainEventStore = new SqlDomainEventStore(sqlClient, clock);
  const outboxStore = new SqlOutboxStore(sqlClient);
  const inboxStore = new SqlInboxStore(sqlClient);
  const identityStore = new SqlIdentityStore(sqlClient);
  const securityAuditStore = new SqlSecurityAuditStore(sqlClient);
  const workflowStore = new SqlWorkflowStore(sqlClient);
  const approvalStore = new SqlApprovalStore(sqlClient);
  const repositories = createSqlEnterpriseRepositories(sqlClient, clock);

  return {
    config: {
      adapterName: config.adapterName,
      defaultOutboxBatchSize: config.defaultOutboxBatchSize,
      optimisticConcurrencyEnabled: config.optimisticConcurrencyEnabled,
    },
    clock,
    database: sqlClient,
    transactionContext,
    unitOfWork,
    aggregateStore,
    domainEventStore,
    outboxStore,
    inboxStore,
    sqlClient,
    identityStore,
    securityAuditStore,
    workflowStore,
    approvalStore,
    repositories,
    migrationCompatible,
    busyTimeoutMs: config.busyTimeoutMs,
    dispose() {
      sqlClient.close();
    },
  };
}
