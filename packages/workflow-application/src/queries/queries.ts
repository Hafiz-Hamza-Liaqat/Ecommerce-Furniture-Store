/**
 * Workflow / Approval operator queries.
 */

import type { WorkflowInstanceStatus } from "@afh/platform";
import {
  ApprovalQueryTypes,
  WorkflowQueryTypes,
} from "../constants.js";

export type GetWorkflowDefinitionPayload = {
  readonly companyId: string;
  readonly definitionId?: string | null;
  readonly code?: string | null;
  readonly version?: number;
};

export type ListWorkflowDefinitionsPayload = {
  readonly companyId: string;
  readonly activeOnly?: boolean;
};

export type GetWorkflowInstancePayload = {
  readonly companyId: string;
  readonly instanceId: string;
};

export type ListWorkflowInstancesPayload = {
  readonly companyId: string;
  readonly subjectType?: string | null;
  readonly subjectId?: string | null;
  readonly instanceStatus?: WorkflowInstanceStatus | null;
};

export type ListAvailableTransitionsPayload = {
  readonly companyId: string;
  readonly instanceId: string;
};

export type ListWorkflowTasksPayload = {
  readonly companyId: string;
  readonly instanceId: string;
};

export type GetApprovalDefinitionPayload = {
  readonly companyId: string;
  readonly type: string;
};

export type ListApprovalDefinitionsPayload = {
  readonly companyId: string;
};

export type GetApprovalRequestPayload = {
  readonly companyId: string;
  readonly requestId: string;
};

export type ListApprovalRequestsPayload = {
  readonly companyId: string;
  readonly type?: string | null;
  readonly openOnly?: boolean;
};

export type ListApprovalHistoryPayload = {
  readonly companyId: string;
  readonly requestId: string;
};

export { ApprovalQueryTypes, WorkflowQueryTypes };
