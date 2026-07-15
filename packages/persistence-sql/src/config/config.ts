/**
 * SQL persistence configuration — provider-neutral surface.
 */

export type SqlPersistenceConfig = {
  readonly adapterName: "sqlite";
  /** File path or ":memory:" */
  readonly databasePath: string;
  readonly defaultOutboxBatchSize: number;
  readonly optimisticConcurrencyEnabled: boolean;
  readonly busyTimeoutMs: number;
};

export const DEFAULT_SQL_PERSISTENCE_CONFIG: SqlPersistenceConfig = {
  adapterName: "sqlite",
  databasePath: ":memory:",
  defaultOutboxBatchSize: 50,
  optimisticConcurrencyEnabled: true,
  busyTimeoutMs: 5000,
};
