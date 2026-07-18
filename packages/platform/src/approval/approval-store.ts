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
  listDefinitions(filter?: {
    readonly companyId?: string | null;
  }): Promise<readonly ApprovalDefinitionRecord[]>;

  saveRequest(request: ApprovalRequestRecord): Promise<void>;
  getRequest(id: string): Promise<ApprovalRequestRecord | null>;
  listOpenByType(
    companyId: string,
    type: string,
  ): Promise<readonly ApprovalRequestRecord[]>;
  listOpen(companyId: string): Promise<readonly ApprovalRequestRecord[]>;
  listRequests(filter: {
    readonly companyId: string;
    readonly type?: string;
    readonly openOnly?: boolean;
  }): Promise<readonly ApprovalRequestRecord[]>;

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

  async listDefinitions(filter?: {
    readonly companyId?: string | null;
  }): Promise<readonly ApprovalDefinitionRecord[]> {
    return [...this.definitions.values()]
      .filter((d) => {
        if (filter?.companyId === undefined) {
          return true;
        }
        return d.companyId === filter.companyId || d.companyId === null;
      })
      .sort((a, b) => a.type.localeCompare(b.type));
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

  async listRequests(filter: {
    readonly companyId: string;
    readonly type?: string;
    readonly openOnly?: boolean;
  }): Promise<readonly ApprovalRequestRecord[]> {
    const openOnly = filter.openOnly ?? false;
    return [...this.requests.values()].filter((r) => {
      if (r.companyId !== filter.companyId) {
        return false;
      }
      if (filter.type !== undefined && r.type !== filter.type) {
        return false;
      }
      if (openOnly) {
        return r.status === "submitted" || r.status === "under_review";
      }
      return true;
    });
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
