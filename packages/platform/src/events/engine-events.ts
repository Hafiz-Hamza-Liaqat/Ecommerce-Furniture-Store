/**
 * Engine domain event contracts only — no Event Bus, publishers, or consumers.
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

export type ApprovalSubmittedPayload = {
  readonly requestId: string;
  readonly approvalType: string;
  readonly subjectType: string;
  readonly subjectId: string;
};

export type ApprovalDecidedPayload = {
  readonly requestId: string;
  readonly approvalType: string;
  readonly decision: "approved" | "rejected" | "changes_requested";
  readonly reviewerUserId: string;
  readonly subjectType: string;
  readonly subjectId: string;
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
  | "approval.submitted"
  | "approval.decided"
  | "rule.evaluated";

export type EngineDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: EngineEventType | string;
  };
};
