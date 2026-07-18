/**
 * Engine domain event contracts only — no Event Bus, publishers, or consumers.
 * RC6.5 adds SLA breach, escalation, and status-projection payloads for
 * notification event production (delivery remains out of scope).
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type WorkflowStartedPayload = {
  readonly instanceId: string;
  readonly definitionCode: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly stageCode: string;
};

export type WorkflowTransitionedPayload = {
  readonly instanceId: string;
  readonly definitionCode: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly fromStageCode: string;
  readonly toStageCode: string;
  readonly transitionCode: string;
  readonly actorUserId: string | null;
};

export type WorkflowCompletedPayload = {
  readonly instanceId: string;
  readonly definitionCode: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly terminalStageCode: string;
};

export type WorkflowSlaBreachedPayload = {
  readonly instanceId: string;
  readonly definitionCode: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly stageCode: string;
  readonly slaHours: number;
  readonly stageEnteredAt: string;
};

export type WorkflowStatusProjectedPayload = {
  readonly instanceId: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly statusProjection: string;
};

export type ApprovalSubmittedPayload = {
  readonly requestId: string;
  readonly approvalType: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly reviewerUserId: string | null;
};

export type ApprovalDecidedPayload = {
  readonly requestId: string;
  readonly approvalType: string;
  readonly decision: "approved" | "rejected" | "changes_requested";
  readonly reviewerUserId: string;
  readonly subjectType: string;
  readonly subjectId: string;
};

export type ApprovalEscalatedPayload = {
  readonly requestId: string;
  readonly approvalType: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly escalateAfterHours: number;
  readonly reviewerUserId: string | null;
};

export type RuleEvaluatedPayload = {
  readonly ruleSetCode: string;
  readonly ruleSetVersion: number;
  readonly matchedRuleIds: readonly string[];
  readonly contextSummary: Readonly<Record<string, unknown>>;
};

export type EngineEventType =
  | "workflow.started"
  | "workflow.transitioned"
  | "workflow.completed"
  | "workflow.sla_breached"
  | "workflow.status_projected"
  | "approval.submitted"
  | "approval.decided"
  | "approval.escalated"
  | "rule.evaluated";

export type EngineDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: EngineEventType | string;
  };
};
