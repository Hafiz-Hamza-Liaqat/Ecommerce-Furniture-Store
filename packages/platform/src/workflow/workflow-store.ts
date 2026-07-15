import type {
  WorkflowAssignmentRecord,
  WorkflowDefinitionRecord,
  WorkflowHistoryRecord,
  WorkflowInstanceRecord,
  WorkflowStageRecord,
  WorkflowTransitionRecord,
} from "./models.js";

export interface WorkflowStore {
  saveDefinition(definition: WorkflowDefinitionRecord): Promise<void>;
  getDefinitionById(id: string): Promise<WorkflowDefinitionRecord | null>;
  getDefinitionByCode(
    companyId: string | null,
    code: string,
    version?: number,
  ): Promise<WorkflowDefinitionRecord | null>;

  saveStage(stage: WorkflowStageRecord): Promise<void>;
  listStages(definitionId: string): Promise<readonly WorkflowStageRecord[]>;
  getStage(id: string): Promise<WorkflowStageRecord | null>;

  saveTransition(transition: WorkflowTransitionRecord): Promise<void>;
  listTransitions(
    definitionId: string,
  ): Promise<readonly WorkflowTransitionRecord[]>;

  saveInstance(instance: WorkflowInstanceRecord): Promise<void>;
  getInstance(id: string): Promise<WorkflowInstanceRecord | null>;
  findRunningInstance(
    companyId: string,
    subjectType: string,
    subjectId: string,
    definitionId: string,
  ): Promise<WorkflowInstanceRecord | null>;
  listRunningInstances(
    companyId: string,
  ): Promise<readonly WorkflowInstanceRecord[]>;

  appendHistory(entry: WorkflowHistoryRecord): Promise<void>;
  listHistory(
    instanceId: string,
  ): Promise<readonly WorkflowHistoryRecord[]>;

  saveAssignment(assignment: WorkflowAssignmentRecord): Promise<void>;
  listAssignments(
    instanceId: string,
  ): Promise<readonly WorkflowAssignmentRecord[]>;
}

export class InMemoryWorkflowStore implements WorkflowStore {
  readonly definitions = new Map<string, WorkflowDefinitionRecord>();
  readonly stages = new Map<string, WorkflowStageRecord>();
  readonly transitions = new Map<string, WorkflowTransitionRecord>();
  readonly instances = new Map<string, WorkflowInstanceRecord>();
  readonly history = new Map<string, WorkflowHistoryRecord[]>();
  readonly assignments = new Map<string, WorkflowAssignmentRecord[]>();

  async saveDefinition(definition: WorkflowDefinitionRecord): Promise<void> {
    this.definitions.set(definition.id, definition);
  }

  async getDefinitionById(
    id: string,
  ): Promise<WorkflowDefinitionRecord | null> {
    return this.definitions.get(id) ?? null;
  }

  async getDefinitionByCode(
    companyId: string | null,
    code: string,
    version?: number,
  ): Promise<WorkflowDefinitionRecord | null> {
    const matches = [...this.definitions.values()].filter(
      (d) =>
        d.code === code &&
        (d.companyId === companyId || d.companyId === null) &&
        d.isActive,
    );
    if (version !== undefined) {
      return matches.find((d) => d.version === version) ?? null;
    }
    return matches.sort((a, b) => b.version - a.version)[0] ?? null;
  }

  async saveStage(stage: WorkflowStageRecord): Promise<void> {
    this.stages.set(stage.id, stage);
  }

  async listStages(
    definitionId: string,
  ): Promise<readonly WorkflowStageRecord[]> {
    return [...this.stages.values()]
      .filter((s) => s.workflowDefinitionId === definitionId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getStage(id: string): Promise<WorkflowStageRecord | null> {
    return this.stages.get(id) ?? null;
  }

  async saveTransition(transition: WorkflowTransitionRecord): Promise<void> {
    this.transitions.set(transition.id, transition);
  }

  async listTransitions(
    definitionId: string,
  ): Promise<readonly WorkflowTransitionRecord[]> {
    return [...this.transitions.values()].filter(
      (t) => t.workflowDefinitionId === definitionId,
    );
  }

  async saveInstance(instance: WorkflowInstanceRecord): Promise<void> {
    this.instances.set(instance.id, instance);
  }

  async getInstance(id: string): Promise<WorkflowInstanceRecord | null> {
    return this.instances.get(id) ?? null;
  }

  async findRunningInstance(
    companyId: string,
    subjectType: string,
    subjectId: string,
    definitionId: string,
  ): Promise<WorkflowInstanceRecord | null> {
    return (
      [...this.instances.values()].find(
        (i) =>
          i.companyId === companyId &&
          i.subjectType === subjectType &&
          i.subjectId === subjectId &&
          i.workflowDefinitionId === definitionId &&
          i.instanceStatus === "running",
      ) ?? null
    );
  }

  async listRunningInstances(
    companyId: string,
  ): Promise<readonly WorkflowInstanceRecord[]> {
    return [...this.instances.values()].filter(
      (i) => i.companyId === companyId && i.instanceStatus === "running",
    );
  }

  async appendHistory(entry: WorkflowHistoryRecord): Promise<void> {
    const list = this.history.get(entry.instanceId) ?? [];
    this.history.set(entry.instanceId, [...list, entry]);
  }

  async listHistory(
    instanceId: string,
  ): Promise<readonly WorkflowHistoryRecord[]> {
    return this.history.get(instanceId) ?? [];
  }

  async saveAssignment(assignment: WorkflowAssignmentRecord): Promise<void> {
    const list = this.assignments.get(assignment.instanceId) ?? [];
    this.assignments.set(assignment.instanceId, [...list, assignment]);
  }

  async listAssignments(
    instanceId: string,
  ): Promise<readonly WorkflowAssignmentRecord[]> {
    return this.assignments.get(instanceId) ?? [];
  }
}
