import type {
  ApprovalActionRecord,
  ApprovalDefinitionRecord,
  ApprovalRequestRecord,
} from "./models.js";

export interface ApprovalStore {
  saveDefinition(definition: ApprovalDefinitionRecord): Promise<void>;
  getDefinitionByType(
    companyId: string | null,
    type: string,
  ): Promise<ApprovalDefinitionRecord | null>;

  saveRequest(request: ApprovalRequestRecord): Promise<void>;
  getRequest(id: string): Promise<ApprovalRequestRecord | null>;
  listOpenByType(
    companyId: string,
    type: string,
  ): Promise<readonly ApprovalRequestRecord[]>;
  listOpen(companyId: string): Promise<readonly ApprovalRequestRecord[]>;

  appendAction(action: ApprovalActionRecord): Promise<void>;
  listActions(
    requestId: string,
  ): Promise<readonly ApprovalActionRecord[]>;
}

export class InMemoryApprovalStore implements ApprovalStore {
  readonly definitions = new Map<string, ApprovalDefinitionRecord>();
  readonly requests = new Map<string, ApprovalRequestRecord>();
  readonly actions = new Map<string, ApprovalActionRecord[]>();

  async saveDefinition(definition: ApprovalDefinitionRecord): Promise<void> {
    this.definitions.set(definition.id, definition);
  }

  async getDefinitionByType(
    companyId: string | null,
    type: string,
  ): Promise<ApprovalDefinitionRecord | null> {
    return (
      [...this.definitions.values()].find(
        (d) =>
          d.type === type &&
          (d.companyId === companyId || d.companyId === null),
      ) ?? null
    );
  }

  async saveRequest(request: ApprovalRequestRecord): Promise<void> {
    this.requests.set(request.id, request);
  }

  async getRequest(id: string): Promise<ApprovalRequestRecord | null> {
    return this.requests.get(id) ?? null;
  }

  async listOpenByType(
    companyId: string,
    type: string,
  ): Promise<readonly ApprovalRequestRecord[]> {
    return [...this.requests.values()].filter(
      (r) =>
        r.companyId === companyId &&
        r.type === type &&
        (r.status === "submitted" || r.status === "under_review"),
    );
  }

  async listOpen(
    companyId: string,
  ): Promise<readonly ApprovalRequestRecord[]> {
    return [...this.requests.values()].filter(
      (r) =>
        r.companyId === companyId &&
        (r.status === "submitted" || r.status === "under_review"),
    );
  }

  async appendAction(action: ApprovalActionRecord): Promise<void> {
    const list = this.actions.get(action.approvalRequestId) ?? [];
    this.actions.set(action.approvalRequestId, [...list, action]);
  }

  async listActions(
    requestId: string,
  ): Promise<readonly ApprovalActionRecord[]> {
    return this.actions.get(requestId) ?? [];
  }
}
