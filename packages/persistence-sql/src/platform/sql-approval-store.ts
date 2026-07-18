/**
 * SQL ApprovalStore — durable adapter for existing ApprovalStore interface (RC6.4).
 */

import type {
  ApprovalActionRecord,
  ApprovalDefinitionRecord,
  ApprovalRequestRecord,
  ApprovalStore,
} from "@afh/platform";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";

type DefinitionRow = {
  id: string;
  company_id: string | null;
  type: string;
  name: string;
  created_at: string;
};

type RequestRow = {
  id: string;
  company_id: string;
  branch_id: string | null;
  type: string;
  subject_type: string;
  subject_id: string;
  status: string;
  payload_json: string;
  submitted_by_user_id: string;
  reviewer_user_id: string | null;
  delegated_to_user_id: string | null;
  escalate_after_hours: number | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
};

type ActionRow = {
  id: string;
  approval_request_id: string;
  actor_user_id: string;
  action: string;
  comment: string | null;
  created_at: string;
};

function mapDefinition(row: DefinitionRow): ApprovalDefinitionRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    type: row.type,
    name: row.name,
    createdAt: row.created_at,
  };
}

function mapRequest(row: RequestRow): ApprovalRequestRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    type: row.type,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    status: row.status as ApprovalRequestRecord["status"],
    payload: JSON.parse(row.payload_json) as Readonly<Record<string, unknown>>,
    submittedByUserId: row.submitted_by_user_id,
    reviewerUserId: row.reviewer_user_id,
    delegatedToUserId: row.delegated_to_user_id,
    escalateAfterHours: row.escalate_after_hours,
    decisionReason: row.decision_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAction(row: ActionRow): ApprovalActionRecord {
  return {
    id: row.id,
    approvalRequestId: row.approval_request_id,
    actorUserId: row.actor_user_id,
    action: row.action as ApprovalActionRecord["action"],
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export class SqlApprovalStore implements ApprovalStore {
  constructor(private readonly client: SqliteDatabaseClient) {}

  async saveDefinition(definition: ApprovalDefinitionRecord): Promise<void> {
    this.client.run(
      `INSERT INTO approval_definitions
        (id, company_id, type, name, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         company_id = excluded.company_id,
         type = excluded.type,
         name = excluded.name,
         created_at = excluded.created_at`,
      [
        definition.id,
        definition.companyId,
        definition.type,
        definition.name,
        definition.createdAt,
      ],
    );
  }

  async getDefinitionByType(
    companyId: string | null,
    type: string,
  ): Promise<ApprovalDefinitionRecord | null> {
    const row = this.client.get<DefinitionRow>(
      `SELECT * FROM approval_definitions
       WHERE type = ?
         AND (company_id = ? OR company_id IS NULL)
       ORDER BY CASE WHEN company_id = ? THEN 0 ELSE 1 END
       LIMIT 1`,
      [type, companyId, companyId],
    );
    return row ? mapDefinition(row) : null;
  }

  async listDefinitions(filter?: {
    readonly companyId?: string | null;
  }): Promise<readonly ApprovalDefinitionRecord[]> {
    let sql = "SELECT * FROM approval_definitions WHERE 1 = 1";
    const params: unknown[] = [];
    if (filter?.companyId !== undefined) {
      sql += " AND (company_id = ? OR company_id IS NULL)";
      params.push(filter.companyId);
    }
    sql += " ORDER BY type ASC";
    return this.client.all<DefinitionRow>(sql, params).map(mapDefinition);
  }

  async saveRequest(request: ApprovalRequestRecord): Promise<void> {
    this.client.run(
      `INSERT INTO approval_requests
        (id, company_id, branch_id, type, subject_type, subject_id, status,
         payload_json, submitted_by_user_id, reviewer_user_id,
         delegated_to_user_id, escalate_after_hours, decision_reason,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         company_id = excluded.company_id,
         branch_id = excluded.branch_id,
         type = excluded.type,
         subject_type = excluded.subject_type,
         subject_id = excluded.subject_id,
         status = excluded.status,
         payload_json = excluded.payload_json,
         submitted_by_user_id = excluded.submitted_by_user_id,
         reviewer_user_id = excluded.reviewer_user_id,
         delegated_to_user_id = excluded.delegated_to_user_id,
         escalate_after_hours = excluded.escalate_after_hours,
         decision_reason = excluded.decision_reason,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      [
        request.id,
        request.companyId,
        request.branchId,
        request.type,
        request.subjectType,
        request.subjectId,
        request.status,
        JSON.stringify(request.payload),
        request.submittedByUserId,
        request.reviewerUserId,
        request.delegatedToUserId,
        request.escalateAfterHours,
        request.decisionReason,
        request.createdAt,
        request.updatedAt,
      ],
    );
  }

  async getRequest(id: string): Promise<ApprovalRequestRecord | null> {
    const row = this.client.get<RequestRow>(
      "SELECT * FROM approval_requests WHERE id = ?",
      [id],
    );
    return row ? mapRequest(row) : null;
  }

  async listOpenByType(
    companyId: string,
    type: string,
  ): Promise<readonly ApprovalRequestRecord[]> {
    return this.client
      .all<RequestRow>(
        `SELECT * FROM approval_requests
         WHERE company_id = ?
           AND type = ?
           AND status IN ('submitted', 'under_review')`,
        [companyId, type],
      )
      .map(mapRequest);
  }

  async listOpen(
    companyId: string,
  ): Promise<readonly ApprovalRequestRecord[]> {
    return this.client
      .all<RequestRow>(
        `SELECT * FROM approval_requests
         WHERE company_id = ?
           AND status IN ('submitted', 'under_review')`,
        [companyId],
      )
      .map(mapRequest);
  }

  async listRequests(filter: {
    readonly companyId: string;
    readonly type?: string;
    readonly openOnly?: boolean;
  }): Promise<readonly ApprovalRequestRecord[]> {
    let sql = "SELECT * FROM approval_requests WHERE company_id = ?";
    const params: unknown[] = [filter.companyId];
    if (filter.type !== undefined) {
      sql += " AND type = ?";
      params.push(filter.type);
    }
    if (filter.openOnly) {
      sql += " AND status IN ('submitted', 'under_review')";
    }
    return this.client.all<RequestRow>(sql, params).map(mapRequest);
  }

  async appendAction(action: ApprovalActionRecord): Promise<void> {
    this.client.run(
      `INSERT INTO approval_actions
        (id, approval_request_id, actor_user_id, action, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        action.id,
        action.approvalRequestId,
        action.actorUserId,
        action.action,
        action.comment,
        action.createdAt,
      ],
    );
  }

  async listActions(
    requestId: string,
  ): Promise<readonly ApprovalActionRecord[]> {
    return this.client
      .all<ActionRow>(
        `SELECT * FROM approval_actions
         WHERE approval_request_id = ?
         ORDER BY created_at ASC`,
        [requestId],
      )
      .map(mapAction);
  }
}
