/**
 * Outbox-backed engine event sinks (RC6.5).
 * Produces notification-relevant domain events into the Outbox.
 * Does not deliver email/SMS/push — Notifications consumers remain later work.
 */

import {
  AggregateId,
  CausationId,
  CorrelationId,
  EventId,
  createEventMetadata,
  type Clock,
  type DomainEvent,
} from "@afh/shared-kernel";
import type { OutboxStore } from "@afh/persistence";
import { newId } from "../util/ids.js";
import type {
  ApprovalDecidedPayload,
  ApprovalEscalatedPayload,
  ApprovalSubmittedPayload,
  EngineEventType,
  RuleEvaluatedPayload,
  WorkflowCompletedPayload,
  WorkflowSlaBreachedPayload,
  WorkflowStartedPayload,
  WorkflowStatusProjectedPayload,
  WorkflowTransitionedPayload,
} from "./engine-events.js";
import type { WorkflowEventSink } from "../workflow/workflow-engine.js";
import type { ApprovalEventSink } from "../approval/approval-engine.js";
import type { RulesEventSink } from "../rules/rules-engine.js";

export type EngineOutboxSinks = {
  readonly workflow: WorkflowEventSink;
  readonly approval: ApprovalEventSink;
  readonly rules: RulesEventSink;
};

export type CreateEngineOutboxSinksOptions = {
  readonly outbox: OutboxStore;
  readonly clock: Clock;
};

function buildEvent<TPayload>(input: {
  readonly eventType: EngineEventType;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly companyId: string | null;
  readonly clock: Clock;
  readonly payload: TPayload;
}): DomainEvent<TPayload> {
  const eventId = newId("eevt");
  return {
    metadata: createEventMetadata({
      eventId: EventId.from(eventId),
      eventType: input.eventType,
      eventVersion: 1,
      occurredAt: input.clock.now(),
      correlationId: CorrelationId.from(eventId),
      causationId: CausationId.from(eventId),
      aggregateType: input.aggregateType,
      aggregateId: AggregateId.from(input.aggregateId),
      companyId: input.companyId,
      sensitivity: "internal",
    }),
    payload: input.payload,
  };
}

async function enqueue(
  outbox: OutboxStore,
  event: DomainEvent,
): Promise<void> {
  await outbox.enqueue({
    id: newId("outb"),
    companyId: event.metadata.companyId,
    eventId: event.metadata.eventId.value,
    topic: event.metadata.eventType,
    payloadJson: JSON.stringify({
      metadata: {
        ...event.metadata,
        eventId: event.metadata.eventId.value,
        correlationId: event.metadata.correlationId.value,
        causationId: event.metadata.causationId?.value ?? null,
        aggregateId: event.metadata.aggregateId.value,
        occurredAt: event.metadata.occurredAt.toISOString(),
      },
      payload: event.payload,
    }),
    createdAt: event.metadata.occurredAt.toISOString(),
  });
}

/**
 * Creates Workflow / Approval / Rules sinks that enqueue engine events.
 * Callers may still override individual sinks via createPlatformEngines options.
 */
export function createEngineOutboxSinks(
  options: CreateEngineOutboxSinksOptions,
): EngineOutboxSinks {
  const { outbox, clock } = options;

  const workflow: WorkflowEventSink = {
    async emitStarted(payload: WorkflowStartedPayload) {
      await enqueue(
        outbox,
        buildEvent({
          eventType: "workflow.started",
          aggregateType: "workflow_instance",
          aggregateId: payload.instanceId,
          companyId: null,
          clock,
          payload,
        }),
      );
    },
    async emitTransitioned(payload: WorkflowTransitionedPayload) {
      await enqueue(
        outbox,
        buildEvent({
          eventType: "workflow.transitioned",
          aggregateType: "workflow_instance",
          aggregateId: payload.instanceId,
          companyId: null,
          clock,
          payload,
        }),
      );
    },
    async emitCompleted(payload: WorkflowCompletedPayload) {
      await enqueue(
        outbox,
        buildEvent({
          eventType: "workflow.completed",
          aggregateType: "workflow_instance",
          aggregateId: payload.instanceId,
          companyId: null,
          clock,
          payload,
        }),
      );
    },
    async emitSlaBreached(payload: WorkflowSlaBreachedPayload) {
      await enqueue(
        outbox,
        buildEvent({
          eventType: "workflow.sla_breached",
          aggregateType: "workflow_instance",
          aggregateId: payload.instanceId,
          companyId: null,
          clock,
          payload,
        }),
      );
    },
    async emitStatusProjected(payload: WorkflowStatusProjectedPayload) {
      await enqueue(
        outbox,
        buildEvent({
          eventType: "workflow.status_projected",
          aggregateType: "workflow_instance",
          aggregateId: payload.instanceId,
          companyId: null,
          clock,
          payload,
        }),
      );
    },
  };

  const approval: ApprovalEventSink = {
    async emitSubmitted(payload: ApprovalSubmittedPayload) {
      await enqueue(
        outbox,
        buildEvent({
          eventType: "approval.submitted",
          aggregateType: "approval_request",
          aggregateId: payload.requestId,
          companyId: null,
          clock,
          payload,
        }),
      );
    },
    async emitDecided(payload: ApprovalDecidedPayload) {
      await enqueue(
        outbox,
        buildEvent({
          eventType: "approval.decided",
          aggregateType: "approval_request",
          aggregateId: payload.requestId,
          companyId: null,
          clock,
          payload,
        }),
      );
    },
    async emitEscalated(payload: ApprovalEscalatedPayload) {
      await enqueue(
        outbox,
        buildEvent({
          eventType: "approval.escalated",
          aggregateType: "approval_request",
          aggregateId: payload.requestId,
          companyId: null,
          clock,
          payload,
        }),
      );
    },
  };

  const rules: RulesEventSink = {
    async emitEvaluated(payload: RuleEvaluatedPayload) {
      await enqueue(
        outbox,
        buildEvent({
          eventType: "rule.evaluated",
          aggregateType: "rule_set",
          aggregateId: payload.ruleSetCode,
          companyId: null,
          clock,
          payload,
        }),
      );
    },
  };

  return { workflow, approval, rules };
}
