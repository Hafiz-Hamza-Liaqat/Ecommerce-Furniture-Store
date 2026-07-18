/**
 * Status projection foundation (RC6.5).
 * Workflow remains lifecycle SSoT; this records the read-only status projection
 * emitted by the engine for progression observability. Domain handlers may still
 * mirror status onto subject aggregates in the same command TX.
 */

import type {
  StatusProjectionUpdater,
  WorkflowEventSink,
} from "../workflow/workflow-engine.js";

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
