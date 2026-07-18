/**
 * Operator CQRS validators — intent validation only.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type {
  AssignWorkflowTaskPayload,
  ClaimApprovalRequestPayload,
  DecideApprovalRequestPayload,
  DelegateApprovalRequestPayload,
  RegisterApprovalDefinitionPayload,
  RegisterWorkflowDefinitionPayload,
  SubmitApprovalRequestPayload,
  TransitionWorkflowInstancePayload,
} from "../commands/commands.js";
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

function requireField(
  field: string,
  value: string | null | undefined,
): ReturnType<typeof validationFail> | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const registerWorkflowDefinitionValidator: Validator<
  Command<RegisterWorkflowDefinitionPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("code", p.code) ??
      requireField("name", p.name) ??
      requireField("entityType", p.entityType) ??
      (p.stages.length === 0
        ? validationFail([
            {
              field: "stages",
              code: "required",
              message: "stages are required",
            },
          ])
        : null) ??
      validationOk()
    );
  },
};

export const transitionWorkflowInstanceValidator: Validator<
  Command<TransitionWorkflowInstancePayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("instanceId", p.instanceId) ??
      requireField("transitionCode", p.transitionCode) ??
      validationOk()
    );
  },
};

export const assignWorkflowTaskValidator: Validator<
  Command<AssignWorkflowTaskPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("instanceId", p.instanceId) ??
      requireField("stageId", p.stageId) ??
      validationOk()
    );
  },
};

export const registerApprovalDefinitionValidator: Validator<
  Command<RegisterApprovalDefinitionPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("type", p.type) ??
      requireField("name", p.name) ??
      validationOk()
    );
  },
};

export const submitApprovalRequestValidator: Validator<
  Command<SubmitApprovalRequestPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("type", p.type) ??
      requireField("subjectType", p.subjectType) ??
      requireField("subjectId", p.subjectId) ??
      validationOk()
    );
  },
};

export const claimApprovalRequestValidator: Validator<
  Command<ClaimApprovalRequestPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("requestId", p.requestId) ??
      validationOk()
    );
  },
};

export const decideApprovalRequestValidator: Validator<
  Command<DecideApprovalRequestPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("requestId", p.requestId);
    if (base) return base;
    if (
      p.decision !== "approved" &&
      p.decision !== "rejected" &&
      p.decision !== "changes_requested"
    ) {
      return validationFail([
        {
          field: "decision",
          code: "invalid",
          message: "decision must be approved, rejected, or changes_requested",
        },
      ]);
    }
    return validationOk();
  },
};

export const delegateApprovalRequestValidator: Validator<
  Command<DelegateApprovalRequestPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("requestId", p.requestId) ??
      requireField("toUserId", p.toUserId) ??
      validationOk()
    );
  },
};

export const getWorkflowDefinitionValidator: Validator<
  Query<GetWorkflowDefinitionPayload>
> = {
  validate(query) {
    const p = query.payload;
    const base = requireField("companyId", p.companyId);
    if (base) return base;
    if (!p.definitionId?.trim() && !p.code?.trim()) {
      return validationFail([
        {
          field: "definitionId",
          code: "required",
          message: "definitionId or code is required",
        },
      ]);
    }
    return validationOk();
  },
};

export const listWorkflowDefinitionsValidator: Validator<
  Query<ListWorkflowDefinitionsPayload>
> = {
  validate(query) {
    return requireField("companyId", query.payload.companyId) ?? validationOk();
  },
};

export const getWorkflowInstanceValidator: Validator<
  Query<GetWorkflowInstancePayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("instanceId", p.instanceId) ??
      validationOk()
    );
  },
};

export const listWorkflowInstancesValidator: Validator<
  Query<ListWorkflowInstancesPayload>
> = {
  validate(query) {
    return requireField("companyId", query.payload.companyId) ?? validationOk();
  },
};

export const listAvailableTransitionsValidator: Validator<
  Query<ListAvailableTransitionsPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("instanceId", p.instanceId) ??
      validationOk()
    );
  },
};

export const listWorkflowTasksValidator: Validator<
  Query<ListWorkflowTasksPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("instanceId", p.instanceId) ??
      validationOk()
    );
  },
};

export const getApprovalDefinitionValidator: Validator<
  Query<GetApprovalDefinitionPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("type", p.type) ??
      validationOk()
    );
  },
};

export const listApprovalDefinitionsValidator: Validator<
  Query<ListApprovalDefinitionsPayload>
> = {
  validate(query) {
    return requireField("companyId", query.payload.companyId) ?? validationOk();
  },
};

export const getApprovalRequestValidator: Validator<
  Query<GetApprovalRequestPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("requestId", p.requestId) ??
      validationOk()
    );
  },
};

export const listApprovalRequestsValidator: Validator<
  Query<ListApprovalRequestsPayload>
> = {
  validate(query) {
    return requireField("companyId", query.payload.companyId) ?? validationOk();
  },
};

export const listApprovalHistoryValidator: Validator<
  Query<ListApprovalHistoryPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("requestId", p.requestId) ??
      validationOk()
    );
  },
};
