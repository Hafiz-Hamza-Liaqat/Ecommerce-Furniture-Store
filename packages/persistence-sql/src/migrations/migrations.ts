/**
 * Production schema migrations aligned with Phase 0B (logical) + Phase 1B stores.
 * Hybrid: normalized outbox/inbox/events/ledgers/identity + JSON aggregate documents.
 */

import type { SqliteDatabaseClient } from "../database/sqlite-client.js";

export const MIGRATION_VERSION = 1;

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS aggregate_documents (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  aggregate_type TEXT NOT NULL,
  parent_id TEXT,
  version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agg_company_type
  ON aggregate_documents(company_id, aggregate_type);
CREATE INDEX IF NOT EXISTS idx_agg_parent
  ON aggregate_documents(aggregate_type, parent_id);

CREATE TABLE IF NOT EXISTS domain_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_version INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  causation_id TEXT,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  company_id TEXT,
  sensitivity TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate
  ON domain_events(aggregate_type, aggregate_id, created_at);

CREATE TABLE IF NOT EXISTS outbox_messages (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  event_id TEXT,
  topic TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  created_at TEXT NOT NULL,
  published_at TEXT,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON outbox_messages(status, next_attempt_at, created_at);

CREATE TABLE IF NOT EXISTS inbox_processed (
  consumer_name TEXT NOT NULL,
  event_id TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  PRIMARY KEY (consumer_name, event_id)
);

CREATE TABLE IF NOT EXISTS stock_ledger_entries (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_company
  ON stock_ledger_entries(company_id, created_at);

CREATE TABLE IF NOT EXISTS financial_ledger_entries (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  ledger_id TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fin_ledger_company
  ON financial_ledger_entries(company_id, created_at);

CREATE TABLE IF NOT EXISTS identity_records (
  id TEXT PRIMARY KEY,
  record_type TEXT NOT NULL,
  lookup_key TEXT,
  company_id TEXT,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_identity_type_lookup
  ON identity_records(record_type, lookup_key);
CREATE INDEX IF NOT EXISTS idx_identity_company_type
  ON identity_records(company_id, record_type);

CREATE TABLE IF NOT EXISTS security_audit_records (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  outcome TEXT NOT NULL,
  details_json TEXT NOT NULL,
  correlation_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_security_audit_created
  ON security_audit_records(created_at);
`;

export type MigrationResult = {
  readonly version: number;
  readonly applied: boolean;
};

export function runMigrations(client: SqliteDatabaseClient): MigrationResult {
  client.exec(MIGRATION_SQL);
  const existing = client.get<{ version: number }>(
    "SELECT version FROM schema_migrations WHERE version = ?",
    [MIGRATION_VERSION],
  );
  if (existing) {
    return { version: MIGRATION_VERSION, applied: false };
  }
  client.run(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
    [MIGRATION_VERSION, new Date().toISOString()],
  );
  return { version: MIGRATION_VERSION, applied: true };
}

export function assertMigrationCompatibility(
  client: SqliteDatabaseClient,
): boolean {
  const row = client.get<{ version: number }>(
    "SELECT MAX(version) AS version FROM schema_migrations",
  );
  return (row?.version ?? 0) >= MIGRATION_VERSION;
}
