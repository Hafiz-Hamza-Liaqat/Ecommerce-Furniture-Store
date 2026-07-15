/**
 * Append-only security audit store.
 */

import type { SecurityAuditRecord, SecurityAuditStore } from "@afh/identity";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";

export class SqlSecurityAuditStore implements SecurityAuditStore {
  constructor(private readonly client: SqliteDatabaseClient) {}

  async append(record: SecurityAuditRecord): Promise<void> {
    this.client.run(
      `INSERT INTO security_audit_records (
        id, company_id, actor_user_id, action, entity_type, entity_id,
        outcome, details_json, correlation_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.companyId,
        record.actorUserId,
        record.action,
        record.entityType,
        record.entityId,
        record.outcome,
        JSON.stringify(record.details),
        record.correlationId,
        record.createdAt,
      ],
    );
  }
}
