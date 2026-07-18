/**
 * Status projection (RC6.5 foundation, RC6.6 proof).
 *
 * Workflow Engine remains lifecycle SSoT (Law A.1 / ADR D04).
 * Entity `status` fields are read-only projections of
 * `WorkflowInstance.statusProjection`. This store is an observability mirror
 * updated only by the engine StatusProjectionUpdater — never a second owner.
 */

import type {
  StatusProjectionUpdater,
  WorkflowEventSink,
} from "../workflow/workflow-engine.js";
import type { WorkflowInstanceRecord } from "./models.js";

export type StatusProjectionRecord = {
  readonly subjectType: string;
  readonly subjectId: string;
  readonly statusProjection: string;
  readonly instanceId: string;
  readonly updatedAt: string;
};

export interface StatusProjectionStore {
  upsert(record: StatusProjectionRecord): Promise<void>;
  get(
    subjectType: string,
    subjectId: string,
  ): Promise<StatusProjectionRecord | null>;
}

export class InMemoryStatusProjectionStore implements StatusProjectionStore {
  private readonly records = new Map<string, StatusProjectionRecord>();

  #key(subjectType: string, subjectId: string): string {
    return `${subjectType}::${subjectId}`;
  }

  async upsert(record: StatusProjectionRecord): Promise<void> {
    this.records.set(this.#key(record.subjectType, record.subjectId), record);
  }

  async get(
    subjectType: string,
    subjectId: string,
  ): Promise<StatusProjectionRecord | null> {
    return this.records.get(this.#key(subjectType, subjectId)) ?? null;
  }
}

export type CreateStatusProjectionUpdaterOptions = {
  readonly store: StatusProjectionStore;
  readonly clock: { now(): Date };
  readonly events?: WorkflowEventSink;
};

/**
 * Engine StatusProjectionUpdater that persists projection rows and optionally
 * emits workflow.status_projected notification events.
 * Composition always injects this into WorkflowEngine so start/transition
 * consistently update projected status.
 */
export function createStatusProjectionUpdater(
  options: CreateStatusProjectionUpdaterOptions,
): StatusProjectionUpdater {
  return async (input) => {
    const updatedAt = options.clock.now().toISOString();
    await options.store.upsert({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      statusProjection: input.statusProjection,
      instanceId: input.instanceId,
      updatedAt,
    });
    await options.events?.emitStatusProjected?.({
      instanceId: input.instanceId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      statusProjection: input.statusProjection,
    });
  };
}

/**
 * Legal entity status is exactly the workflow stage projection (Law A.1).
 * Typed domain unions may narrow known codes; they must not invent stages.
 */
export function entityStatusFromWorkflowProjection(
  statusProjection: string,
): string {
  return statusProjection;
}

export function entityStatusMatchesProjection(
  entityStatus: string,
  statusProjection: string,
): boolean {
  return entityStatus === statusProjection;
}

export type StatusProjectionConsistency = {
  readonly ok: boolean;
  readonly workflowStatusProjection: string;
  readonly storeStatusProjection: string | null;
  readonly entityStatus: string | null;
  readonly reasons: readonly string[];
};

/**
 * Proves projection consistency: store (and optional entity status) must
 * equal the Workflow instance statusProjection. Divergence means a competing
 * lifecycle owner — forbidden by architecture.
 */
export function evaluateStatusProjectionConsistency(input: {
  readonly instance: Pick<
    WorkflowInstanceRecord,
    "id" | "statusProjection"
  >;
  readonly storeRecord: StatusProjectionRecord | null;
  readonly entityStatus?: string | null;
}): StatusProjectionConsistency {
  const reasons: string[] = [];
  const workflowStatusProjection = input.instance.statusProjection;
  const storeStatusProjection = input.storeRecord?.statusProjection ?? null;
  const entityStatus =
    input.entityStatus === undefined ? null : input.entityStatus;

  if (!input.storeRecord) {
    reasons.push("projection_store_missing");
  } else {
    if (input.storeRecord.instanceId !== input.instance.id) {
      reasons.push("projection_instance_mismatch");
    }
    if (storeStatusProjection !== workflowStatusProjection) {
      reasons.push("store_diverges_from_workflow");
    }
  }

  if (
    entityStatus !== null &&
    !entityStatusMatchesProjection(entityStatus, workflowStatusProjection)
  ) {
    reasons.push("entity_status_independent_of_workflow");
  }

  return {
    ok: reasons.length === 0,
    workflowStatusProjection,
    storeStatusProjection,
    entityStatus,
    reasons,
  };
}
