/**
 * Thin workflow operator command handlers — delegate to WorkflowEngine.
 */

import type { CommandHandler } from "@afh/application";
import { NotFoundError, fail } from "@afh/shared-kernel";
import type {
  WorkflowAssignmentRecord,
  WorkflowDefinitionRecord,
  WorkflowInstanceRecord,
} from "@afh/platform";
import {
  WorkflowCommandTypes,
  WorkflowPolicyActions,
} from "../constants.js";
import type {
  AssignWorkflowTaskPayload,
  RegisterWorkflowDefinitionPayload,
  TransitionWorkflowInstancePayload,
} from "../commands/commands.js";
import {
  assignWorkflowTaskValidator,
  registerWorkflowDefinitionValidator,
  transitionWorkflowInstanceValidator,
} from "../validators/validators.js";
import {
  companyResource,
  requireCompanyId,
  requireOptionalCompanyId,
  workflowOrFail,
} from "../support/support.js";

export function createRegisterWorkflowDefinitionHandler(): CommandHandler<
  RegisterWorkflowDefinitionPayload,
  WorkflowDefinitionRecord
> {
  return {
    commandType: WorkflowCommandTypes.RegisterDefinition,
    authorize(command, ctx) {
      return companyResource(
        "workflow_definition",
        WorkflowPolicyActions.DefinitionCreate,
        command.payload.companyId ?? ctx.companyId ?? "global",
        null,
      );
    },
    validate() {
      return registerWorkflowDefinitionValidator;
    },
    async handle(command, ctx) {
      const scope = requireOptionalCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;
      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      return wf.value.registerDefinition({
        companyId: scope.value,
        code: command.payload.code,
        name: command.payload.name,
        version: command.payload.version,
        entityType: command.payload.entityType,
        stages: command.payload.stages,
        transitions: command.payload.transitions,
      });
    },
  };
}

export function createTransitionWorkflowInstanceHandler(): CommandHandler<
  TransitionWorkflowInstancePayload,
  WorkflowInstanceRecord
> {
  return {
    commandType: WorkflowCommandTypes.TransitionInstance,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "workflow_instance",
        WorkflowPolicyActions.InstanceTransition,
        p.companyId,
        p.instanceId,
      );
    },
    validate() {
      return transitionWorkflowInstanceValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;
      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const existing = await wf.value.getInstance(command.payload.instanceId);
      if (!existing.ok) return existing;
      if (!existing.value || existing.value.companyId !== scope.value) {
        return fail(
          new NotFoundError("Workflow instance not found", {
            code: "workflow_instance_not_found",
          }),
        );
      }

      return wf.value.transition({
        instanceId: command.payload.instanceId,
        transitionCode: command.payload.transitionCode,
        actorUserId: ctx.userId,
        comment: command.payload.comment ?? null,
      });
    },
  };
}

export function createAssignWorkflowTaskHandler(): CommandHandler<
  AssignWorkflowTaskPayload,
  WorkflowAssignmentRecord
> {
  return {
    commandType: WorkflowCommandTypes.AssignTask,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "workflow_task",
        WorkflowPolicyActions.TaskAssign,
        p.companyId,
        p.instanceId,
      );
    },
    validate() {
      return assignWorkflowTaskValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;
      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const existing = await wf.value.getInstance(command.payload.instanceId);
      if (!existing.ok) return existing;
      if (!existing.value || existing.value.companyId !== scope.value) {
        return fail(
          new NotFoundError("Workflow instance not found", {
            code: "workflow_instance_not_found",
          }),
        );
      }

      return wf.value.assign({
        instanceId: command.payload.instanceId,
        stageId: command.payload.stageId,
        teamId: command.payload.teamId ?? null,
        userId: command.payload.userId ?? null,
      });
    },
  };
}
