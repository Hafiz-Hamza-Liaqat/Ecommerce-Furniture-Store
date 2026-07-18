/**
 * Production schema migrations aligned with Phase 0B (logical) + Phase 1B stores.
 * Hybrid: normalized outbox/inbox/events/ledgers/identity + JSON aggregate documents.
 * RC6.4 adds Workflow / Approval engine tables (v2).
 */

import type { SqliteDatabaseClient } from "../database/sqlite-client.js";

export const MIGRATION_VERSION = 2;

const SCHEMA_MIGRATIONS_DDL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`;

const MIGRATION_SQL_V1 = `
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

/** RC6.4 — Workflow & Approval engine durability (Phase 0B §1.4–1.5). */
const MIGRATION_SQL_V2 = `
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL,
  entity_type TEXT NOT NULL,
  is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_def_company_code_version
  ON workflow_definitions(IFNULL(company_id, ''), code, version);
CREATE INDEX IF NOT EXISTS idx_workflow_def_code
  ON workflow_definitions(code, is_active);

CREATE TABLE IF NOT EXISTS workflow_stages (
  id TEXT PRIMARY KEY,
  workflow_definition_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  sla_hours INTEGER,
  is_terminal INTEGER NOT NULL,
  is_initial INTEGER NOT NULL,
  FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_stage_def_code
  ON workflow_stages(workflow_definition_id, code);
CREATE INDEX IF NOT EXISTS idx_workflow_stage_def
  ON workflow_stages(workflow_definition_id, sort_order);

CREATE TABLE IF NOT EXISTS workflow_transitions (
  id TEXT PRIMARY KEY,
  workflow_definition_id TEXT NOT NULL,
  code TEXT NOT NULL,
  from_stage_id TEXT NOT NULL,
  to_stage_id TEXT NOT NULL,
  guard_rule_set_code TEXT,
  requires_approval_type TEXT,
  FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_transition_edge
  ON workflow_transitions(workflow_definition_id, from_stage_id, to_stage_id, code);
CREATE INDEX IF NOT EXISTS idx_workflow_transition_def
  ON workflow_transitions(workflow_definition_id);

CREATE TABLE IF NOT EXISTS workflow_instances (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  workflow_definition_id TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  current_stage_id TEXT NOT NULL,
  status_projection TEXT NOT NULL,
  instance_status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  stage_entered_at TEXT NOT NULL,
  FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id)
);
CREATE INDEX IF NOT EXISTS idx_workflow_instance_company_status
  ON workflow_instances(company_id, instance_status);
CREATE INDEX IF NOT EXISTS idx_workflow_instance_subject
  ON workflow_instances(company_id, subject_type, subject_id);

CREATE TABLE IF NOT EXISTS workflow_instance_events (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  from_stage_id TEXT,
  to_stage_id TEXT NOT NULL,
  transition_code TEXT,
  actor_user_id TEXT,
  comment TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (instance_id) REFERENCES workflow_instances(id)
);
CREATE INDEX IF NOT EXISTS idx_workflow_instance_events
  ON workflow_instance_events(instance_id, created_at);

CREATE TABLE IF NOT EXISTS workflow_assignments (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  team_id TEXT,
  user_id TEXT,
  assigned_at TEXT NOT NULL,
  FOREIGN KEY (instance_id) REFERENCES workflow_instances(id)
);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_instance
  ON workflow_assignments(instance_id);

CREATE TABLE IF NOT EXISTS approval_definitions (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_approval_def_company_type
  ON approval_definitions(IFNULL(company_id, ''), type);
CREATE INDEX IF NOT EXISTS idx_approval_def_type
  ON approval_definitions(type);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  branch_id TEXT,
  type TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  submitted_by_user_id TEXT NOT NULL,
  reviewer_user_id TEXT,
  delegated_to_user_id TEXT,
  escalate_after_hours INTEGER,
  decision_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_company_status_type
  ON approval_requests(company_id, status, type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_subject
  ON approval_requests(subject_type, subject_id);

CREATE TABLE IF NOT EXISTS approval_actions (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id)
);
CREATE INDEX IF NOT EXISTS idx_approval_actions_request
  ON approval_actions(approval_request_id, created_at);
`;

const MIGRATIONS: readonly { readonly version: number; readonly sql: string }[] =
  [
    { version: 1, sql: MIGRATION_SQL_V1 },
    { version: 2, sql: MIGRATION_SQL_V2 },
  ];

export type MigrationResult = {
  readonly version: number;
  readonly applied: boolean;
};

export function runMigrations(client: SqliteDatabaseClient): MigrationResult {
  client.exec(SCHEMA_MIGRATIONS_DDL);
  let appliedAny = false;
  for (const migration of MIGRATIONS) {
    const existing = client.get<{ version: number }>(
      "SELECT version FROM schema_migrations WHERE version = ?",
      [migration.version],
    );
    if (existing) {
      continue;
    }
    client.exec(migration.sql);
    client.run(
      "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
      [migration.version, new Date().toISOString()],
    );
    appliedAny = true;
  }
  return { version: MIGRATION_VERSION, applied: appliedAny };
}

export function assertMigrationCompatibility(
  client: SqliteDatabaseClient,
): boolean {
  const row = client.get<{ version: number }>(
    "SELECT MAX(version) AS version FROM schema_migrations",
  );
  return (row?.version ?? 0) >= MIGRATION_VERSION;
}
