/**
 * SQL WorkflowStore — durable adapter for existing WorkflowStore interface (RC6.4).
 * Engines and interfaces unchanged; composition injects this store when SQL is enabled.
 */

import type {
  WorkflowAssignmentRecord,
  WorkflowDefinitionRecord,
  WorkflowHistoryRecord,
  WorkflowInstanceRecord,
  WorkflowInstanceStatus,
  WorkflowStageRecord,
  WorkflowStore,
  WorkflowTransitionRecord,
} from "@afh/platform";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";

type DefinitionRow = {
  id: string;
  company_id: string | null;
  code: string;
  name: string;
  version: number;
  entity_type: string;
  is_active: number;
  created_at: string;
};

type StageRow = {
  id: string;
  workflow_definition_id: string;
  code: string;
  name: string;
  sort_order: number;
  sla_hours: number | null;
  is_terminal: number;
  is_initial: number;
};

type TransitionRow = {
  id: string;
  workflow_definition_id: string;
  code: string;
  from_stage_id: string;
  to_stage_id: string;
  guard_rule_set_code: string | null;
  requires_approval_type: string | null;
};

type InstanceRow = {
  id: string;
  company_id: string;
  workflow_definition_id: string;
  subject_type: string;
  subject_id: string;
  current_stage_id: string;
  status_projection: string;
  instance_status: string;
  started_at: string;
  completed_at: string | null;
  stage_entered_at: string;
};

type HistoryRow = {
  id: string;
  instance_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  transition_code: string | null;
  actor_user_id: string | null;
  comment: string | null;
  created_at: string;
};

type AssignmentRow = {
  id: string;
  instance_id: string;
  stage_id: string;
  team_id: string | null;
  user_id: string | null;
  assigned_at: string;
};

function mapDefinition(row: DefinitionRow): WorkflowDefinitionRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    code: row.code,
    name: row.name,
    version: row.version,
    entityType: row.entity_type,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

function mapStage(row: StageRow): WorkflowStageRecord {
  return {
    id: row.id,
    workflowDefinitionId: row.workflow_definition_id,
    code: row.code,
    name: row.name,
    sortOrder: row.sort_order,
    slaHours: row.sla_hours,
    isTerminal: row.is_terminal === 1,
    isInitial: row.is_initial === 1,
  };
}

function mapTransition(row: TransitionRow): WorkflowTransitionRecord {
  return {
    id: row.id,
    workflowDefinitionId: row.workflow_definition_id,
    code: row.code,
    fromStageId: row.from_stage_id,
    toStageId: row.to_stage_id,
    guardRuleSetCode: row.guard_rule_set_code,
    requiresApprovalType: row.requires_approval_type,
  };
}

function mapInstance(row: InstanceRow): WorkflowInstanceRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    workflowDefinitionId: row.workflow_definition_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    currentStageId: row.current_stage_id,
    statusProjection: row.status_projection,
    instanceStatus: row.instance_status as WorkflowInstanceStatus,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    stageEnteredAt: row.stage_entered_at,
  };
}

function mapHistory(row: HistoryRow): WorkflowHistoryRecord {
  return {
    id: row.id,
    instanceId: row.instance_id,
    fromStageId: row.from_stage_id,
    toStageId: row.to_stage_id,
    transitionCode: row.transition_code,
    actorUserId: row.actor_user_id,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

function mapAssignment(row: AssignmentRow): WorkflowAssignmentRecord {
  return {
    id: row.id,
    instanceId: row.instance_id,
    stageId: row.stage_id,
    teamId: row.team_id,
    userId: row.user_id,
    assignedAt: row.assigned_at,
  };
}

export class SqlWorkflowStore implements WorkflowStore {
  constructor(private readonly client: SqliteDatabaseClient) {}

  async saveDefinition(definition: WorkflowDefinitionRecord): Promise<void> {
    this.client.run(
      `INSERT INTO workflow_definitions
        (id, company_id, code, name, version, entity_type, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         company_id = excluded.company_id,
         code = excluded.code,
         name = excluded.name,
         version = excluded.version,
         entity_type = excluded.entity_type,
         is_active = excluded.is_active,
         created_at = excluded.created_at`,
      [
        definition.id,
        definition.companyId,
        definition.code,
        definition.name,
        definition.version,
        definition.entityType,
        definition.isActive ? 1 : 0,
        definition.createdAt,
      ],
    );
  }

  async getDefinitionById(
    id: string,
  ): Promise<WorkflowDefinitionRecord | null> {
    const row = this.client.get<DefinitionRow>(
      "SELECT * FROM workflow_definitions WHERE id = ?",
      [id],
    );
    return row ? mapDefinition(row) : null;
  }

  async getDefinitionByCode(
    companyId: string | null,
    code: string,
    version?: number,
  ): Promise<WorkflowDefinitionRecord | null> {
    const rows = this.client.all<DefinitionRow>(
      `SELECT * FROM workflow_definitions
       WHERE code = ?
         AND is_active = 1
         AND (company_id IS ? OR company_id IS NULL)
       ORDER BY version DESC`,
      [code, companyId],
    );
    if (version !== undefined) {
      const match = rows.find((r) => r.version === version);
      return match ? mapDefinition(match) : null;
    }
    return rows[0] ? mapDefinition(rows[0]) : null;
  }

  async listDefinitions(filter?: {
    readonly companyId?: string | null;
    readonly activeOnly?: boolean;
  }): Promise<readonly WorkflowDefinitionRecord[]> {
    const activeOnly = filter?.activeOnly ?? true;
    let sql = "SELECT * FROM workflow_definitions WHERE 1 = 1";
    const params: unknown[] = [];
    if (activeOnly) {
      sql += " AND is_active = 1";
    }
    if (filter?.companyId !== undefined) {
      sql += " AND (company_id IS ? OR company_id IS NULL)";
      params.push(filter.companyId);
    }
    sql += " ORDER BY code ASC, version DESC";
    return this.client
      .all<DefinitionRow>(sql, params)
      .map(mapDefinition);
  }

  async saveStage(stage: WorkflowStageRecord): Promise<void> {
    this.client.run(
      `INSERT INTO workflow_stages
        (id, workflow_definition_id, code, name, sort_order, sla_hours, is_terminal, is_initial)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         workflow_definition_id = excluded.workflow_definition_id,
         code = excluded.code,
         name = excluded.name,
         sort_order = excluded.sort_order,
         sla_hours = excluded.sla_hours,
         is_terminal = excluded.is_terminal,
         is_initial = excluded.is_initial`,
      [
        stage.id,
        stage.workflowDefinitionId,
        stage.code,
        stage.name,
        stage.sortOrder,
        stage.slaHours,
        stage.isTerminal ? 1 : 0,
        stage.isInitial ? 1 : 0,
      ],
    );
  }

  async listStages(
    definitionId: string,
  ): Promise<readonly WorkflowStageRecord[]> {
    return this.client
      .all<StageRow>(
        `SELECT * FROM workflow_stages
         WHERE workflow_definition_id = ?
         ORDER BY sort_order ASC`,
        [definitionId],
      )
      .map(mapStage);
  }

  async getStage(id: string): Promise<WorkflowStageRecord | null> {
    const row = this.client.get<StageRow>(
      "SELECT * FROM workflow_stages WHERE id = ?",
      [id],
    );
    return row ? mapStage(row) : null;
  }

  async saveTransition(transition: WorkflowTransitionRecord): Promise<void> {
    this.client.run(
      `INSERT INTO workflow_transitions
        (id, workflow_definition_id, code, from_stage_id, to_stage_id,
         guard_rule_set_code, requires_approval_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         workflow_definition_id = excluded.workflow_definition_id,
         code = excluded.code,
         from_stage_id = excluded.from_stage_id,
         to_stage_id = excluded.to_stage_id,
         guard_rule_set_code = excluded.guard_rule_set_code,
         requires_approval_type = excluded.requires_approval_type`,
      [
        transition.id,
        transition.workflowDefinitionId,
        transition.code,
        transition.fromStageId,
        transition.toStageId,
        transition.guardRuleSetCode,
        transition.requiresApprovalType,
      ],
    );
  }

  async listTransitions(
    definitionId: string,
  ): Promise<readonly WorkflowTransitionRecord[]> {
    return this.client
      .all<TransitionRow>(
        "SELECT * FROM workflow_transitions WHERE workflow_definition_id = ?",
        [definitionId],
      )
      .map(mapTransition);
  }

  async saveInstance(instance: WorkflowInstanceRecord): Promise<void> {
    this.client.run(
      `INSERT INTO workflow_instances
        (id, company_id, workflow_definition_id, subject_type, subject_id,
         current_stage_id, status_projection, instance_status, started_at,
         completed_at, stage_entered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         company_id = excluded.company_id,
         workflow_definition_id = excluded.workflow_definition_id,
         subject_type = excluded.subject_type,
         subject_id = excluded.subject_id,
         current_stage_id = excluded.current_stage_id,
         status_projection = excluded.status_projection,
         instance_status = excluded.instance_status,
         started_at = excluded.started_at,
         completed_at = excluded.completed_at,
         stage_entered_at = excluded.stage_entered_at`,
      [
        instance.id,
        instance.companyId,
        instance.workflowDefinitionId,
        instance.subjectType,
        instance.subjectId,
        instance.currentStageId,
        instance.statusProjection,
        instance.instanceStatus,
        instance.startedAt,
        instance.completedAt,
        instance.stageEnteredAt,
      ],
    );
  }

  async getInstance(id: string): Promise<WorkflowInstanceRecord | null> {
    const row = this.client.get<InstanceRow>(
      "SELECT * FROM workflow_instances WHERE id = ?",
      [id],
    );
    return row ? mapInstance(row) : null;
  }

  async findRunningInstance(
    companyId: string,
    subjectType: string,
    subjectId: string,
    definitionId: string,
  ): Promise<WorkflowInstanceRecord | null> {
    const row = this.client.get<InstanceRow>(
      `SELECT * FROM workflow_instances
       WHERE company_id = ?
         AND subject_type = ?
         AND subject_id = ?
         AND workflow_definition_id = ?
         AND instance_status = 'running'
       LIMIT 1`,
      [companyId, subjectType, subjectId, definitionId],
    );
    return row ? mapInstance(row) : null;
  }

  async listRunningInstances(
    companyId: string,
  ): Promise<readonly WorkflowInstanceRecord[]> {
    return this.client
      .all<InstanceRow>(
        `SELECT * FROM workflow_instances
         WHERE company_id = ? AND instance_status = 'running'`,
        [companyId],
      )
      .map(mapInstance);
  }

  async listInstances(filter: {
    readonly companyId: string;
    readonly subjectType?: string;
    readonly subjectId?: string;
    readonly instanceStatus?: WorkflowInstanceStatus;
  }): Promise<readonly WorkflowInstanceRecord[]> {
    let sql = "SELECT * FROM workflow_instances WHERE company_id = ?";
    const params: unknown[] = [filter.companyId];
    if (filter.subjectType !== undefined) {
      sql += " AND subject_type = ?";
      params.push(filter.subjectType);
    }
    if (filter.subjectId !== undefined) {
      sql += " AND subject_id = ?";
      params.push(filter.subjectId);
    }
    if (filter.instanceStatus !== undefined) {
      sql += " AND instance_status = ?";
      params.push(filter.instanceStatus);
    }
    return this.client.all<InstanceRow>(sql, params).map(mapInstance);
  }

  async appendHistory(entry: WorkflowHistoryRecord): Promise<void> {
    this.client.run(
      `INSERT INTO workflow_instance_events
        (id, instance_id, from_stage_id, to_stage_id, transition_code,
         actor_user_id, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.instanceId,
        entry.fromStageId,
        entry.toStageId,
        entry.transitionCode,
        entry.actorUserId,
        entry.comment,
        entry.createdAt,
      ],
    );
  }

  async listHistory(
    instanceId: string,
  ): Promise<readonly WorkflowHistoryRecord[]> {
    return this.client
      .all<HistoryRow>(
        `SELECT * FROM workflow_instance_events
         WHERE instance_id = ?
         ORDER BY created_at ASC`,
        [instanceId],
      )
      .map(mapHistory);
  }

  async saveAssignment(assignment: WorkflowAssignmentRecord): Promise<void> {
    this.client.run(
      `INSERT INTO workflow_assignments
        (id, instance_id, stage_id, team_id, user_id, assigned_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         instance_id = excluded.instance_id,
         stage_id = excluded.stage_id,
         team_id = excluded.team_id,
         user_id = excluded.user_id,
         assigned_at = excluded.assigned_at`,
      [
        assignment.id,
        assignment.instanceId,
        assignment.stageId,
        assignment.teamId,
        assignment.userId,
        assignment.assignedAt,
      ],
    );
  }

  async listAssignments(
    instanceId: string,
  ): Promise<readonly WorkflowAssignmentRecord[]> {
    return this.client
      .all<AssignmentRow>(
        `SELECT * FROM workflow_assignments
         WHERE instance_id = ?
         ORDER BY assigned_at ASC`,
        [instanceId],
      )
      .map(mapAssignment);
  }
}
