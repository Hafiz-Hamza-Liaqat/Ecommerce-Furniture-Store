/**
 * Thin workflow / approval operator query handlers — delegate to engines.
 */

import type { QueryHandler } from "@afh/application";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  ApprovalActionRecord,
  ApprovalDefinitionRecord,
  ApprovalRequestRecord,
  WorkflowAssignmentRecord,
  WorkflowDefinitionRecord,
  WorkflowInstanceRecord,
  WorkflowTransitionRecord,
} from "@afh/platform";
import {
  ApprovalPolicyActions,
  ApprovalQueryTypes,
  WorkflowPolicyActions,
  WorkflowQueryTypes,
} from "../constants.js";
import type {
  GetApprovalDefinitionPayload,
  GetApprovalRequestPayload,
  GetWorkflowDefinitionPayload,
  GetWorkflowInstancePayload,
  ListApprovalDefinitionsPayload,
  ListApprovalHistoryPayload,
  ListApprovalRequestsPayload,
  ListAvailableTransitionsPayload,
  ListWorkflowDefinitionsPayload,
  ListWorkflowInstancesPayload,
  ListWorkflowTasksPayload,
} from "../queries/queries.js";
import {
  getApprovalDefinitionValidator,
  getApprovalRequestValidator,
  getWorkflowDefinitionValidator,
  getWorkflowInstanceValidator,
  listApprovalDefinitionsValidator,
  listApprovalHistoryValidator,
  listApprovalRequestsValidator,
  listAvailableTransitionsValidator,
  listWorkflowDefinitionsValidator,
  listWorkflowInstancesValidator,
  listWorkflowTasksValidator,
} from "../validators/validators.js";
import {
  approvalOrFail,
  companyResource,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

export function createGetWorkflowDefinitionHandler(): QueryHandler<
  GetWorkflowDefinitionPayload,
  WorkflowDefinitionRecord
> {
  return {
    queryType: WorkflowQueryTypes.GetDefinition,
    authorize(query) {
      return companyResource(
        "workflow_definition",
        WorkflowPolicyActions.DefinitionRead,
        query.payload.companyId,
        query.payload.definitionId ?? query.payload.code ?? null,
      );
    },
    validate() {
      return getWorkflowDefinitionValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const found = query.payload.definitionId?.trim()
        ? await wf.value.getDefinition(query.payload.definitionId)
        : await wf.value.getDefinitionByCode(
            scope.value,
            query.payload.code!,
            query.payload.version,
          );
      if (!found.ok) return found;
      if (
        !found.value ||
        (found.value.companyId !== null &&
          found.value.companyId !== scope.value)
      ) {
        return fail(
          new NotFoundError("Workflow definition not found", {
            code: "workflow_definition_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createListWorkflowDefinitionsHandler(): QueryHandler<
  ListWorkflowDefinitionsPayload,
  readonly WorkflowDefinitionRecord[]
> {
  return {
    queryType: WorkflowQueryTypes.ListDefinitions,
    authorize(query) {
      return companyResource(
        "workflow_definition",
        WorkflowPolicyActions.DefinitionRead,
        query.payload.companyId,
        null,
      );
    },
    validate() {
      return listWorkflowDefinitionsValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;
      return wf.value.listDefinitions({
        companyId: scope.value,
        activeOnly: query.payload.activeOnly ?? true,
      });
    },
  };
}

export function createGetWorkflowInstanceHandler(): QueryHandler<
  GetWorkflowInstancePayload,
  WorkflowInstanceRecord
> {
  return {
    queryType: WorkflowQueryTypes.GetInstance,
    authorize(query) {
      return companyResource(
        "workflow_instance",
        WorkflowPolicyActions.InstanceRead,
        query.payload.companyId,
        query.payload.instanceId,
      );
    },
    validate() {
      return getWorkflowInstanceValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const found = await wf.value.getInstance(query.payload.instanceId);
      if (!found.ok) return found;
      if (!found.value || found.value.companyId !== scope.value) {
        return fail(
          new NotFoundError("Workflow instance not found", {
            code: "workflow_instance_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createListWorkflowInstancesHandler(): QueryHandler<
  ListWorkflowInstancesPayload,
  readonly WorkflowInstanceRecord[]
> {
  return {
    queryType: WorkflowQueryTypes.ListInstances,
    authorize(query) {
      return companyResource(
        "workflow_instance",
        WorkflowPolicyActions.InstanceRead,
        query.payload.companyId,
        null,
      );
    },
    validate() {
      return listWorkflowInstancesValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const filter: {
        companyId: string;
        subjectType?: string;
        subjectId?: string;
        instanceStatus?: WorkflowInstanceRecord["instanceStatus"];
      } = { companyId: scope.value };
      if (query.payload.subjectType) {
        filter.subjectType = query.payload.subjectType;
      }
      if (query.payload.subjectId) {
        filter.subjectId = query.payload.subjectId;
      }
      if (query.payload.instanceStatus) {
        filter.instanceStatus = query.payload.instanceStatus;
      }
      return wf.value.listInstances(filter);
    },
  };
}

export function createListAvailableTransitionsHandler(): QueryHandler<
  ListAvailableTransitionsPayload,
  readonly WorkflowTransitionRecord[]
> {
  return {
    queryType: WorkflowQueryTypes.ListAvailableTransitions,
    authorize(query) {
      return companyResource(
        "workflow_instance",
        WorkflowPolicyActions.InstanceRead,
        query.payload.companyId,
        query.payload.instanceId,
      );
    },
    validate() {
      return listAvailableTransitionsValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const existing = await wf.value.getInstance(query.payload.instanceId);
      if (!existing.ok) return existing;
      if (!existing.value || existing.value.companyId !== scope.value) {
        return fail(
          new NotFoundError("Workflow instance not found", {
            code: "workflow_instance_not_found",
          }),
        );
      }
      return wf.value.listAvailableTransitions(query.payload.instanceId);
    },
  };
}

export function createListWorkflowTasksHandler(): QueryHandler<
  ListWorkflowTasksPayload,
  readonly WorkflowAssignmentRecord[]
> {
  return {
    queryType: WorkflowQueryTypes.ListTasks,
    authorize(query) {
      return companyResource(
        "workflow_task",
        WorkflowPolicyActions.TaskRead,
        query.payload.companyId,
        query.payload.instanceId,
      );
    },
    validate() {
      return listWorkflowTasksValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const existing = await wf.value.getInstance(query.payload.instanceId);
      if (!existing.ok) return existing;
      if (!existing.value || existing.value.companyId !== scope.value) {
        return fail(
          new NotFoundError("Workflow instance not found", {
            code: "workflow_instance_not_found",
          }),
        );
      }
      return wf.value.listAssignments(query.payload.instanceId);
    },
  };
}

export function createGetApprovalDefinitionHandler(): QueryHandler<
  GetApprovalDefinitionPayload,
  ApprovalDefinitionRecord
> {
  return {
    queryType: ApprovalQueryTypes.GetDefinition,
    authorize(query) {
      return companyResource(
        "approval_definition",
        ApprovalPolicyActions.DefinitionRead,
        query.payload.companyId,
        query.payload.type,
      );
    },
    validate() {
      return getApprovalDefinitionValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const approval = approvalOrFail(ctx);
      if (!approval.ok) return approval;

      const found = await approval.value.getDefinitionByType(
        scope.value,
        query.payload.type,
      );
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Approval definition not found", {
            code: "approval_definition_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createListApprovalDefinitionsHandler(): QueryHandler<
  ListApprovalDefinitionsPayload,
  readonly ApprovalDefinitionRecord[]
> {
  return {
    queryType: ApprovalQueryTypes.ListDefinitions,
    authorize(query) {
      return companyResource(
        "approval_definition",
        ApprovalPolicyActions.DefinitionRead,
        query.payload.companyId,
        null,
      );
    },
    validate() {
      return listApprovalDefinitionsValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const approval = approvalOrFail(ctx);
      if (!approval.ok) return approval;
      return approval.value.listDefinitions({ companyId: scope.value });
    },
  };
}

export function createGetApprovalRequestHandler(): QueryHandler<
  GetApprovalRequestPayload,
  ApprovalRequestRecord
> {
  return {
    queryType: ApprovalQueryTypes.GetRequest,
    authorize(query) {
      return companyResource(
        "approval_request",
        ApprovalPolicyActions.RequestRead,
        query.payload.companyId,
        query.payload.requestId,
      );
    },
    validate() {
      return getApprovalRequestValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const approval = approvalOrFail(ctx);
      if (!approval.ok) return approval;

      const found = await approval.value.getRequest(query.payload.requestId);
      if (!found.ok) return found;
      if (!found.value || found.value.companyId !== scope.value) {
        return fail(
          new NotFoundError("Approval request not found", {
            code: "approval_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createListApprovalRequestsHandler(): QueryHandler<
  ListApprovalRequestsPayload,
  readonly ApprovalRequestRecord[]
> {
  return {
    queryType: ApprovalQueryTypes.ListRequests,
    authorize(query) {
      return companyResource(
        "approval_request",
        ApprovalPolicyActions.RequestRead,
        query.payload.companyId,
        null,
      );
    },
    validate() {
      return listApprovalRequestsValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const approval = approvalOrFail(ctx);
      if (!approval.ok) return approval;

      const filter: {
        companyId: string;
        type?: string;
        openOnly?: boolean;
      } = {
        companyId: scope.value,
        openOnly: query.payload.openOnly ?? false,
      };
      if (query.payload.type) {
        filter.type = query.payload.type;
      }
      return approval.value.listRequests(filter);
    },
  };
}

export function createListApprovalHistoryHandler(): QueryHandler<
  ListApprovalHistoryPayload,
  readonly ApprovalActionRecord[]
> {
  return {
    queryType: ApprovalQueryTypes.ListHistory,
    authorize(query) {
      return companyResource(
        "approval_request",
        ApprovalPolicyActions.RequestRead,
        query.payload.companyId,
        query.payload.requestId,
      );
    },
    validate() {
      return listApprovalHistoryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const approval = approvalOrFail(ctx);
      if (!approval.ok) return approval;

      const existing = await approval.value.getRequest(query.payload.requestId);
      if (!existing.ok) return existing;
      if (!existing.value || existing.value.companyId !== scope.value) {
        return fail(
          new NotFoundError("Approval request not found", {
            code: "approval_not_found",
          }),
        );
      }
      return approval.value.listHistory(query.payload.requestId);
    },
  };
}
