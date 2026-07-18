/**
 * Workflow / Approval operator commands — intent only.
 */

import type { RegisterWorkflowInput } from "@afh/platform";
import {
  ApprovalCommandTypes,
  WorkflowCommandTypes,
} from "../constants.js";

export type RegisterWorkflowDefinitionPayload = {
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly version: number;
  readonly entityType: string;
  readonly stages: RegisterWorkflowInput["stages"];
  readonly transitions: RegisterWorkflowInput["transitions"];
};

export type TransitionWorkflowInstancePayload = {
  readonly companyId: string;
  readonly instanceId: string;
  readonly transitionCode: string;
  readonly comment?: string | null;
};

export type AssignWorkflowTaskPayload = {
  readonly companyId: string;
  readonly instanceId: string;
  readonly stageId: string;
  readonly teamId?: string | null;
  readonly userId?: string | null;
};

export type RegisterApprovalDefinitionPayload = {
  readonly companyId: string | null;
  readonly type: string;
  readonly name: string;
};

export type SubmitApprovalRequestPayload = {
  readonly companyId: string;
  readonly branchId?: string | null;
  readonly type: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly escalateAfterHours?: number | null;
};

export type ClaimApprovalRequestPayload = {
  readonly companyId: string;
  readonly requestId: string;
};

export type DecideApprovalRequestPayload = {
  readonly companyId: string;
  readonly requestId: string;
  readonly decision: "approved" | "rejected" | "changes_requested";
  readonly reason?: string | null;
};

export type DelegateApprovalRequestPayload = {
  readonly companyId: string;
  readonly requestId: string;
  readonly toUserId: string;
};

export {
  ApprovalCommandTypes,
  WorkflowCommandTypes,
};
