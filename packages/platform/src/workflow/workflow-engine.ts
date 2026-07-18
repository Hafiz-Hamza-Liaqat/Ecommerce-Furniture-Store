/**
 * Workflow Engine — single source of truth for subject lifecycle.
 */

import {
  ConflictError,
  NotFoundError,
  ValidationError,
  WorkflowViolationError,
  fail,
  isFail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { SecurityAuditService } from "@afh/identity";
import type { RulesEngine } from "../rules/rules-engine.js";
import { newId } from "../util/ids.js";
import type {
  WorkflowAssignmentRecord,
  WorkflowDefinitionRecord,
  WorkflowHistoryRecord,
  WorkflowInstanceRecord,
  WorkflowStageRecord,
  WorkflowTransitionRecord,
} from "./models.js";
import type { WorkflowStore } from "./workflow-store.js";
import type {
  WorkflowCompletedPayload,
  WorkflowSlaBreachedPayload,
  WorkflowStartedPayload,
  WorkflowStatusProjectedPayload,
  WorkflowTransitionedPayload,
} from "../events/engine-events.js";
import { isStageSlaBreached } from "./sla.js";

export type RegisterWorkflowInput = {
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly version: number;
  readonly entityType: string;
  readonly stages: readonly {
    readonly code: string;
    readonly name: string;
    readonly sortOrder: number;
    readonly slaHours?: number | null;
    readonly isTerminal?: boolean;
    readonly isInitial?: boolean;
  }[];
  readonly transitions: readonly {
    readonly code: string;
    readonly fromStageCode: string;
    readonly toStageCode: string;
    readonly guardRuleSetCode?: string | null;
    readonly requiresApprovalType?: string | null;
  }[];
};

export type StartWorkflowInput = {
  readonly companyId: string;
  readonly definitionCode: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly actorUserId?: string | null;
  readonly definitionVersion?: number;
};

export type TransitionWorkflowInput = {
  readonly instanceId: string;
  readonly transitionCode: string;
  readonly actorUserId?: string | null;
  readonly comment?: string | null;
  readonly guardContext?: Readonly<Record<string, unknown>>;
  readonly approvalSatisfied?: boolean;
};

export type WorkflowEventSink = {
  emitStarted?(payload: WorkflowStartedPayload): Promise<void>;
  emitTransitioned?(payload: WorkflowTransitionedPayload): Promise<void>;
  emitCompleted?(payload: WorkflowCompletedPayload): Promise<void>;
  emitSlaBreached?(payload: WorkflowSlaBreachedPayload): Promise<void>;
  emitStatusProjected?(payload: WorkflowStatusProjectedPayload): Promise<void>;
};

/**
 * Optional projection updater — domains register to sync read-only status fields.
 * Workflow remains SSoT; this never becomes a second lifecycle owner.
 */
export type StatusProjectionUpdater = (input: {
  readonly subjectType: string;
  readonly subjectId: string;
  readonly statusProjection: string;
  readonly instanceId: string;
}) => Promise<void>;

export class WorkflowEngine {
  constructor(
    private readonly store: WorkflowStore,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
    private readonly rules?: RulesEngine,
    private readonly events?: WorkflowEventSink,
    private readonly projectionUpdater?: StatusProjectionUpdater,
  ) {}

  async registerDefinition(
    input: RegisterWorkflowInput,
  ): Promise<Result<WorkflowDefinitionRecord, PlatformError>> {
    if (input.stages.length === 0) {
      return fail(
        new ValidationError("Workflow requires stages", {
          code: "workflow_stages_required",
        }),
      );
    }
    const initials = input.stages.filter((s) => s.isInitial);
    if (initials.length !== 1) {
      return fail(
        new ValidationError("Workflow requires exactly one initial stage", {
          code: "workflow_initial_stage",
        }),
      );
    }

    const existing = await this.store.getDefinitionByCode(
      input.companyId,
      input.code,
      input.version,
    );
    if (existing) {
      return fail(
        new ConflictError("Workflow definition version exists", {
          code: "workflow_definition_exists",
        }),
      );
    }

    const now = this.clock.now().toISOString();
    const definition: WorkflowDefinitionRecord = {
      id: newId("wdef"),
      companyId: input.companyId,
      code: input.code,
      name: input.name,
      version: input.version,
      entityType: input.entityType,
      isActive: true,
      createdAt: now,
    };
    await this.store.saveDefinition(definition);

    const stageIds = new Map<string, string>();
    for (const stage of input.stages) {
      const record: WorkflowStageRecord = {
        id: newId("wstg"),
        workflowDefinitionId: definition.id,
        code: stage.code,
        name: stage.name,
        sortOrder: stage.sortOrder,
        slaHours: stage.slaHours ?? null,
        isTerminal: stage.isTerminal ?? false,
        isInitial: stage.isInitial ?? false,
      };
      stageIds.set(stage.code, record.id);
      await this.store.saveStage(record);
    }

    for (const transition of input.transitions) {
      const fromStageId = stageIds.get(transition.fromStageCode);
      const toStageId = stageIds.get(transition.toStageCode);
      if (!fromStageId || !toStageId) {
        return fail(
          new ValidationError("Transition references unknown stage", {
            code: "workflow_transition_stage_missing",
          }),
        );
      }
      const record: WorkflowTransitionRecord = {
        id: newId("wtrn"),
        workflowDefinitionId: definition.id,
        code: transition.code,
        fromStageId,
        toStageId,
        guardRuleSetCode: transition.guardRuleSetCode ?? null,
        requiresApprovalType: transition.requiresApprovalType ?? null,
      };
      await this.store.saveTransition(record);
    }

    return ok(definition);
  }

  async start(
    input: StartWorkflowInput,
  ): Promise<Result<WorkflowInstanceRecord, PlatformError>> {
    const definition = await this.store.getDefinitionByCode(
      input.companyId,
      input.definitionCode,
      input.definitionVersion,
    );
    if (!definition) {
      return fail(
        new NotFoundError("Workflow definition not found", {
          code: "workflow_definition_not_found",
        }),
      );
    }

    const existing = await this.store.findRunningInstance(
      input.companyId,
      input.subjectType,
      input.subjectId,
      definition.id,
    );
    if (existing) {
      return fail(
        new ConflictError("Workflow already running for subject", {
          code: "workflow_already_running",
        }),
      );
    }

    const stages = await this.store.listStages(definition.id);
    const initial = stages.find((s) => s.isInitial);
    if (!initial) {
      return fail(
        new WorkflowViolationError("Definition has no initial stage", {
          code: "workflow_no_initial",
        }),
      );
    }

    const now = this.clock.now().toISOString();
    const instance: WorkflowInstanceRecord = {
      id: newId("winst"),
      companyId: input.companyId,
      workflowDefinitionId: definition.id,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      currentStageId: initial.id,
      statusProjection: initial.code,
      instanceStatus: "running",
      startedAt: now,
      completedAt: null,
      stageEnteredAt: now,
    };
    await this.store.saveInstance(instance);
    await this.store.appendHistory({
      id: newId("whist"),
      instanceId: instance.id,
      fromStageId: null,
      toStageId: initial.id,
      transitionCode: null,
      actorUserId: input.actorUserId ?? null,
      comment: "workflow_started",
      createdAt: now,
    });

    await this.projectionUpdater?.({
      subjectType: instance.subjectType,
      subjectId: instance.subjectId,
      statusProjection: instance.statusProjection,
      instanceId: instance.id,
    });

    await this.audit.record({
      companyId: input.companyId,
      actorUserId: input.actorUserId ?? null,
      action: "workflow.started",
      entityType: "workflow_instance",
      entityId: instance.id,
      outcome: "success",
      details: {
        definitionCode: definition.code,
        stage: initial.code,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
      },
    });

    await this.events?.emitStarted?.({
      instanceId: instance.id,
      definitionCode: definition.code,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      stageCode: initial.code,
    });

    return ok(instance);
  }

  async transition(
    input: TransitionWorkflowInput,
  ): Promise<Result<WorkflowInstanceRecord, PlatformError>> {
    const instance = await this.store.getInstance(input.instanceId);
    if (!instance) {
      return fail(
        new NotFoundError("Workflow instance not found", {
          code: "workflow_instance_not_found",
        }),
      );
    }
    if (instance.instanceStatus !== "running") {
      return fail(
        new WorkflowViolationError("Workflow is not running", {
          code: "workflow_not_running",
        }),
      );
    }

    const definition = await this.store.getDefinitionById(
      instance.workflowDefinitionId,
    );
    if (!definition) {
      return fail(
        new NotFoundError("Workflow definition not found", {
          code: "workflow_definition_not_found",
        }),
      );
    }

    const transitions = await this.store.listTransitions(definition.id);
    const transition = transitions.find(
      (t) =>
        t.code === input.transitionCode &&
        t.fromStageId === instance.currentStageId,
    );
    if (!transition) {
      return fail(
        new WorkflowViolationError("Illegal workflow transition", {
          code: "workflow_illegal_transition",
          details: {
            transitionCode: input.transitionCode,
            currentStageId: instance.currentStageId,
          },
        }),
      );
    }

    if (transition.requiresApprovalType && !input.approvalSatisfied) {
      return fail(
        new WorkflowViolationError("Approval required for transition", {
          code: "workflow_approval_required",
          details: { approvalType: transition.requiresApprovalType },
        }),
      );
    }

    if (transition.guardRuleSetCode) {
      if (!this.rules) {
        return fail(
          new WorkflowViolationError("Rules engine required for guard", {
            code: "workflow_guard_unavailable",
          }),
        );
      }
      const evaluation = await this.rules.evaluate({
        companyId: instance.companyId,
        ruleSetCode: transition.guardRuleSetCode,
        context: {
          ...(input.guardContext ?? {}),
          subjectType: instance.subjectType,
          subjectId: instance.subjectId,
          transitionCode: transition.code,
        },
      });
      if (isFail(evaluation)) {
        return evaluation;
      }
      if (!evaluation.value.allowed) {
        return fail(
          new WorkflowViolationError("Transition guard rejected", {
            code: "workflow_guard_rejected",
            details: { results: evaluation.value.actions },
          }),
        );
      }
    }

    const fromStage = await this.store.getStage(instance.currentStageId);
    const toStage = await this.store.getStage(transition.toStageId);
    if (!fromStage || !toStage) {
      return fail(
        new WorkflowViolationError("Stage missing", {
          code: "workflow_stage_missing",
        }),
      );
    }

    const now = this.clock.now().toISOString();
    const updated: WorkflowInstanceRecord = {
      ...instance,
      currentStageId: toStage.id,
      statusProjection: toStage.code,
      stageEnteredAt: now,
      instanceStatus: toStage.isTerminal ? "completed" : "running",
      completedAt: toStage.isTerminal ? now : null,
    };
    await this.store.saveInstance(updated);
    await this.store.appendHistory({
      id: newId("whist"),
      instanceId: instance.id,
      fromStageId: fromStage.id,
      toStageId: toStage.id,
      transitionCode: transition.code,
      actorUserId: input.actorUserId ?? null,
      comment: input.comment ?? null,
      createdAt: now,
    });

    await this.projectionUpdater?.({
      subjectType: updated.subjectType,
      subjectId: updated.subjectId,
      statusProjection: updated.statusProjection,
      instanceId: updated.id,
    });

    await this.audit.record({
      companyId: instance.companyId,
      actorUserId: input.actorUserId ?? null,
      action: "workflow.transitioned",
      entityType: "workflow_instance",
      entityId: instance.id,
      outcome: "success",
      details: {
        from: fromStage.code,
        to: toStage.code,
        transition: transition.code,
      },
    });

    await this.events?.emitTransitioned?.({
      instanceId: instance.id,
      definitionCode: definition.code,
      subjectType: instance.subjectType,
      subjectId: instance.subjectId,
      fromStageCode: fromStage.code,
      toStageCode: toStage.code,
      transitionCode: transition.code,
      actorUserId: input.actorUserId ?? null,
    });

    if (updated.instanceStatus === "completed") {
      await this.events?.emitCompleted?.({
        instanceId: instance.id,
        definitionCode: definition.code,
        subjectType: instance.subjectType,
        subjectId: instance.subjectId,
        terminalStageCode: toStage.code,
      });
      await this.audit.record({
        companyId: instance.companyId,
        actorUserId: input.actorUserId ?? null,
        action: "workflow.completed",
        entityType: "workflow_instance",
        entityId: instance.id,
        outcome: "success",
      });
    }

    return ok(updated);
  }

  async assign(input: {
    readonly instanceId: string;
    readonly stageId: string;
    readonly teamId?: string | null;
    readonly userId?: string | null;
  }): Promise<Result<WorkflowAssignmentRecord, PlatformError>> {
    const instance = await this.store.getInstance(input.instanceId);
    if (!instance) {
      return fail(
        new NotFoundError("Workflow instance not found", {
          code: "workflow_instance_not_found",
        }),
      );
    }
    const assignment: WorkflowAssignmentRecord = {
      id: newId("wasgn"),
      instanceId: input.instanceId,
      stageId: input.stageId,
      teamId: input.teamId ?? null,
      userId: input.userId ?? null,
      assignedAt: this.clock.now().toISOString(),
    };
    await this.store.saveAssignment(assignment);
    return ok(assignment);
  }

  /**
   * Returns instances whose current stage SLA has been exceeded.
   */
  async listTimedOutInstances(
    companyId: string,
  ): Promise<Result<readonly WorkflowInstanceRecord[], PlatformError>> {
    const running = await this.store.listRunningInstances(companyId);
    const now = this.clock.now();
    const timedOut: WorkflowInstanceRecord[] = [];
    for (const instance of running) {
      const stage = await this.store.getStage(instance.currentStageId);
      if (
        !stage ||
        !isStageSlaBreached(instance.stageEnteredAt, stage.slaHours, now)
      ) {
        continue;
      }
      timedOut.push(instance);
    }
    return ok(timedOut);
  }

  /**
   * SLA foundation scan — lists breached instances and emits notification events.
   * No worker/scheduler; callers invoke on a schedule in later slices.
   */
  async reportSlaBreaches(
    companyId: string,
  ): Promise<Result<readonly WorkflowInstanceRecord[], PlatformError>> {
    const timedOut = await this.listTimedOutInstances(companyId);
    if (isFail(timedOut)) return timedOut;

    for (const instance of timedOut.value) {
      const stage = await this.store.getStage(instance.currentStageId);
      const definition = await this.store.getDefinitionById(
        instance.workflowDefinitionId,
      );
      if (!stage?.slaHours || !definition) continue;
      await this.events?.emitSlaBreached?.({
        instanceId: instance.id,
        definitionCode: definition.code,
        subjectType: instance.subjectType,
        subjectId: instance.subjectId,
        stageCode: stage.code,
        slaHours: stage.slaHours,
        stageEnteredAt: instance.stageEnteredAt,
      });
      await this.audit.record({
        companyId: instance.companyId,
        actorUserId: null,
        action: "workflow.sla_breached",
        entityType: "workflow_instance",
        entityId: instance.id,
        outcome: "success",
        details: {
          stageCode: stage.code,
          slaHours: stage.slaHours,
        },
      });
    }
    return timedOut;
  }

  async getInstance(
    instanceId: string,
  ): Promise<Result<WorkflowInstanceRecord | null, PlatformError>> {
    return ok(await this.store.getInstance(instanceId));
  }

  async getDefinition(
    definitionId: string,
  ): Promise<Result<WorkflowDefinitionRecord | null, PlatformError>> {
    return ok(await this.store.getDefinitionById(definitionId));
  }

  async getDefinitionByCode(
    companyId: string | null,
    code: string,
    version?: number,
  ): Promise<Result<WorkflowDefinitionRecord | null, PlatformError>> {
    return ok(
      await this.store.getDefinitionByCode(companyId, code, version),
    );
  }

  async listDefinitions(filter?: {
    readonly companyId?: string | null;
    readonly activeOnly?: boolean;
  }): Promise<Result<readonly WorkflowDefinitionRecord[], PlatformError>> {
    return ok(await this.store.listDefinitions(filter));
  }

  async listInstances(filter: {
    readonly companyId: string;
    readonly subjectType?: string;
    readonly subjectId?: string;
    readonly instanceStatus?: WorkflowInstanceRecord["instanceStatus"];
  }): Promise<Result<readonly WorkflowInstanceRecord[], PlatformError>> {
    return ok(await this.store.listInstances(filter));
  }

  async listAvailableTransitions(
    instanceId: string,
  ): Promise<Result<readonly WorkflowTransitionRecord[], PlatformError>> {
    const instance = await this.store.getInstance(instanceId);
    if (!instance) {
      return fail(
        new NotFoundError("Workflow instance not found", {
          code: "workflow_instance_not_found",
        }),
      );
    }
    const transitions = await this.store.listTransitions(
      instance.workflowDefinitionId,
    );
    return ok(
      transitions.filter((t) => t.fromStageId === instance.currentStageId),
    );
  }

  async listAssignments(
    instanceId: string,
  ): Promise<Result<readonly WorkflowAssignmentRecord[], PlatformError>> {
    return ok(await this.store.listAssignments(instanceId));
  }

  async listHistory(
    instanceId: string,
  ): Promise<Result<readonly WorkflowHistoryRecord[], PlatformError>> {
    return ok(await this.store.listHistory(instanceId));
  }

  async listStages(
    definitionId: string,
  ): Promise<Result<readonly WorkflowStageRecord[], PlatformError>> {
    return ok(await this.store.listStages(definitionId));
  }
}
