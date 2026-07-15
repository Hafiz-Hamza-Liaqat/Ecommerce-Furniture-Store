/**
 * Workflow Engine models — lifecycle SSoT (Phase 0A / 0C).
 */

export type WorkflowInstanceStatus = "running" | "completed" | "cancelled";

export type WorkflowDefinitionRecord = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly version: number;
  readonly entityType: string;
  readonly isActive: boolean;
  readonly createdAt: string;
};

export type WorkflowStageRecord = {
  readonly id: string;
  readonly workflowDefinitionId: string;
  readonly code: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly slaHours: number | null;
  readonly isTerminal: boolean;
  readonly isInitial: boolean;
};

export type WorkflowTransitionRecord = {
  readonly id: string;
  readonly workflowDefinitionId: string;
  readonly code: string;
  readonly fromStageId: string;
  readonly toStageId: string;
  /** Optional Rules Engine rule set code used as guard */
  readonly guardRuleSetCode: string | null;
  /** Optional approval type that must be approved before transition completes */
  readonly requiresApprovalType: string | null;
};

export type WorkflowInstanceRecord = {
  readonly id: string;
  readonly companyId: string;
  readonly workflowDefinitionId: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly currentStageId: string;
  /** Read-only projection of current stage code — SSoT is currentStageId */
  readonly statusProjection: string;
  readonly instanceStatus: WorkflowInstanceStatus;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly stageEnteredAt: string;
};

export type WorkflowHistoryRecord = {
  readonly id: string;
  readonly instanceId: string;
  readonly fromStageId: string | null;
  readonly toStageId: string;
  readonly transitionCode: string | null;
  readonly actorUserId: string | null;
  readonly comment: string | null;
  readonly createdAt: string;
};

export type WorkflowAssignmentRecord = {
  readonly id: string;
  readonly instanceId: string;
  readonly stageId: string;
  readonly teamId: string | null;
  readonly userId: string | null;
  readonly assignedAt: string;
};
