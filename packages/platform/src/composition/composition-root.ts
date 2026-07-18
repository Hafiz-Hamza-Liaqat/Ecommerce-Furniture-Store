/**
 * Platform engines composition root.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import type {
  OutboxStore,
  PersistenceFoundation,
} from "@afh/persistence";
import {
  type IdentityFoundation,
  type PolicyEngine,
  type SecurityAuditService,
} from "@afh/identity";
import {
  InMemoryWorkflowStore,
  type WorkflowStore,
} from "../workflow/workflow-store.js";
import { WorkflowEngine } from "../workflow/workflow-engine.js";
import type {
  StatusProjectionUpdater,
  WorkflowEventSink,
} from "../workflow/workflow-engine.js";
import {
  InMemoryStatusProjectionStore,
  createStatusProjectionUpdater,
  type StatusProjectionStore,
} from "../workflow/status-projection.js";
import {
  InMemoryApprovalStore,
  type ApprovalStore,
} from "../approval/approval-store.js";
import { ApprovalEngine } from "../approval/approval-engine.js";
import type {
  ApprovalEventSink,
  DelegationHook,
  EscalationHook,
} from "../approval/approval-engine.js";
import {
  createRulesApprovalAssignmentResolver,
  type ApprovalAssignmentResolver,
} from "../approval/assignment-resolver.js";
import { InMemoryRulesStore } from "../rules/rules-store.js";
import { RulesEngine } from "../rules/rules-engine.js";
import type { RulesEventSink } from "../rules/rules-engine.js";
import {
  EnhancedPolicyEngine,
  type PolicyContextEnricher,
  type AttributePredicate,
} from "../policy/enhanced-policy-engine.js";
import { createEngineOutboxSinks } from "../events/outbox-event-sink.js";

export type PlatformEngines = {
  readonly clock: Clock;
  readonly audit: SecurityAuditService;
  readonly workflow: WorkflowEngine;
  readonly approval: ApprovalEngine;
  readonly rules: RulesEngine;
  readonly policyEngine: PolicyEngine;
  /** RC6.5 — read-only status projection store (Workflow remains SSoT). */
  readonly statusProjections: StatusProjectionStore;
};

export type CreatePlatformEnginesOptions = {
  readonly identity: IdentityFoundation;
  readonly persistence?: PersistenceFoundation;
  readonly clock?: Clock;
  /**
   * Optional WorkflowStore injection (RC6.4). Defaults to InMemoryWorkflowStore
   * so existing tests and non-SQL compositions stay unchanged.
   */
  readonly workflowStore?: WorkflowStore;
  /**
   * Optional ApprovalStore injection (RC6.4). Defaults to InMemoryApprovalStore.
   */
  readonly approvalStore?: ApprovalStore;
  readonly workflowEvents?: WorkflowEventSink;
  readonly approvalEvents?: ApprovalEventSink;
  readonly rulesEvents?: RulesEventSink;
  readonly projectionUpdater?: StatusProjectionUpdater;
  readonly statusProjectionStore?: StatusProjectionStore;
  readonly escalationHook?: EscalationHook;
  readonly delegationHook?: DelegationHook;
  readonly assignmentResolver?: ApprovalAssignmentResolver;
  /**
   * Optional Outbox for notification event production (RC6.5).
   * When set (or when persistence.outboxStore is present), engines emit
   * workflow/approval events into the Outbox unless explicit sinks are passed.
   */
  readonly outboxStore?: OutboxStore;
  /**
   * When true (default if an outbox is available), wire outbox sinks for
   * notification event production unless explicit sinks are passed.
   */
  readonly enableOutboxEngineEvents?: boolean;
  readonly policyEnrichers?: readonly PolicyContextEnricher[];
  readonly requiredAttributes?: readonly AttributePredicate[];
};

export function createPlatformEngines(
  options: CreatePlatformEnginesOptions,
): PlatformEngines {
  const clock = options.clock ?? options.identity.clock ?? new SystemUtcClock();
  const audit = options.identity.audit;

  const outboxStore =
    options.outboxStore ?? options.persistence?.outboxStore;
  const enableOutbox = options.enableOutboxEngineEvents ?? Boolean(outboxStore);
  const outboxSinks =
    enableOutbox && outboxStore
      ? createEngineOutboxSinks({
          outbox: outboxStore,
          clock,
        })
      : null;

  const workflowEvents = options.workflowEvents ?? outboxSinks?.workflow;
  const approvalEvents = options.approvalEvents ?? outboxSinks?.approval;
  const rulesEvents = options.rulesEvents ?? outboxSinks?.rules;

  const rulesStore = new InMemoryRulesStore();
  const rules = new RulesEngine(rulesStore, clock, audit, rulesEvents);

  const statusProjections =
    options.statusProjectionStore ?? new InMemoryStatusProjectionStore();
  const projectionUpdater =
    options.projectionUpdater ??
    createStatusProjectionUpdater({
      store: statusProjections,
      clock,
      ...(workflowEvents ? { events: workflowEvents } : {}),
    });

  const assignmentResolver =
    options.assignmentResolver ??
    createRulesApprovalAssignmentResolver(rules);

  const workflowStore = options.workflowStore ?? new InMemoryWorkflowStore();
  const workflow = new WorkflowEngine(
    workflowStore,
    clock,
    audit,
    rules,
    workflowEvents,
    projectionUpdater,
  );

  const approvalStore = options.approvalStore ?? new InMemoryApprovalStore();
  const approval = new ApprovalEngine(
    approvalStore,
    clock,
    audit,
    approvalEvents,
    options.escalationHook,
    options.delegationHook,
    assignmentResolver,
  );

  const policyEngine = new EnhancedPolicyEngine(
    options.identity.policyEngine,
    options.policyEnrichers ?? [],
    options.requiredAttributes ?? [],
    audit,
  );

  return {
    clock,
    audit,
    workflow,
    approval,
    rules,
    policyEngine,
    statusProjections,
  };
}
