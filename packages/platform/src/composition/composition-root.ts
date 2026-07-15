/**
 * Platform engines composition root.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import type { PersistenceFoundation } from "@afh/persistence";
import {
  type IdentityFoundation,
  type PolicyEngine,
  type SecurityAuditService,
} from "@afh/identity";
import { InMemoryWorkflowStore } from "../workflow/workflow-store.js";
import { WorkflowEngine } from "../workflow/workflow-engine.js";
import type {
  StatusProjectionUpdater,
  WorkflowEventSink,
} from "../workflow/workflow-engine.js";
import { InMemoryApprovalStore } from "../approval/approval-store.js";
import { ApprovalEngine } from "../approval/approval-engine.js";
import type {
  ApprovalEventSink,
  DelegationHook,
  EscalationHook,
} from "../approval/approval-engine.js";
import { InMemoryRulesStore } from "../rules/rules-store.js";
import { RulesEngine } from "../rules/rules-engine.js";
import type { RulesEventSink } from "../rules/rules-engine.js";
import {
  EnhancedPolicyEngine,
  type PolicyContextEnricher,
  type AttributePredicate,
} from "../policy/enhanced-policy-engine.js";

export type PlatformEngines = {
  readonly clock: Clock;
  readonly audit: SecurityAuditService;
  readonly workflow: WorkflowEngine;
  readonly approval: ApprovalEngine;
  readonly rules: RulesEngine;
  readonly policyEngine: PolicyEngine;
};

export type CreatePlatformEnginesOptions = {
  readonly identity: IdentityFoundation;
  readonly persistence?: PersistenceFoundation;
  readonly clock?: Clock;
  readonly workflowEvents?: WorkflowEventSink;
  readonly approvalEvents?: ApprovalEventSink;
  readonly rulesEvents?: RulesEventSink;
  readonly projectionUpdater?: StatusProjectionUpdater;
  readonly escalationHook?: EscalationHook;
  readonly delegationHook?: DelegationHook;
  readonly policyEnrichers?: readonly PolicyContextEnricher[];
  readonly requiredAttributes?: readonly AttributePredicate[];
};

export function createPlatformEngines(
  options: CreatePlatformEnginesOptions,
): PlatformEngines {
  const clock = options.clock ?? options.identity.clock ?? new SystemUtcClock();
  const audit = options.identity.audit;

  const rulesStore = new InMemoryRulesStore();
  const rules = new RulesEngine(
    rulesStore,
    clock,
    audit,
    options.rulesEvents,
  );

  const workflowStore = new InMemoryWorkflowStore();
  const workflow = new WorkflowEngine(
    workflowStore,
    clock,
    audit,
    rules,
    options.workflowEvents,
    options.projectionUpdater,
  );

  const approvalStore = new InMemoryApprovalStore();
  const approval = new ApprovalEngine(
    approvalStore,
    clock,
    audit,
    options.approvalEvents,
    options.escalationHook,
    options.delegationHook,
  );

  const policyEngine = new EnhancedPolicyEngine(
    options.identity.policyEngine,
    options.policyEnrichers ?? [],
    options.requiredAttributes ?? [],
    audit,
  );

  void options.persistence;

  return {
    clock,
    audit,
    workflow,
    approval,
    rules,
    policyEngine,
  };
}
