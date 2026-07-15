/**
 * Application execution context — request-scoped runtime data.
 */

import type { Clock } from "@afh/shared-kernel";
import type {
  PolicyPrincipal,
  PolicyEngine,
} from "@afh/identity";
import type {
  ApprovalEngine,
  RulesEngine,
  WorkflowEngine,
} from "@afh/platform";
import type { OutboxDispatcher } from "@afh/infrastructure";
import type { UnitOfWork } from "@afh/shared-kernel";

export type ApplicationContext = {
  readonly correlationId: string;
  readonly userId: string | null;
  readonly companyId: string | null;
  readonly branchId: string | null;
  readonly principal: PolicyPrincipal | null;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly clock: Clock;
  readonly signal: AbortSignal | null;
  /** Optional engine hooks — never alternate authz paths */
  readonly policyEngine: PolicyEngine;
  readonly workflow: WorkflowEngine | null;
  readonly approval: ApprovalEngine | null;
  readonly rules: RulesEngine | null;
  readonly unitOfWork: UnitOfWork;
  readonly outboxDispatcher: OutboxDispatcher | null;
};

export type ApplicationContextInput = {
  readonly correlationId: string;
  readonly userId?: string | null;
  readonly companyId?: string | null;
  readonly branchId?: string | null;
  readonly principal?: PolicyPrincipal | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly signal?: AbortSignal | null;
};
