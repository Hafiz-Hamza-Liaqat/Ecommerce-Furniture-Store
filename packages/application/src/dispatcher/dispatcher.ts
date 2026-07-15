/**
 * Command & Query dispatchers — application layer only (no transport).
 */

import type { Command, PlatformError, Query, Result } from "@afh/shared-kernel";
import type { ApplicationContext, ApplicationContextInput } from "../context/context.js";
import type { CommandPipeline, QueryPipeline } from "../pipeline/pipeline.js";
import type { PolicyEngine, PolicyPrincipal } from "@afh/identity";
import type {
  ApprovalEngine,
  RulesEngine,
  WorkflowEngine,
} from "@afh/platform";
import type { OutboxDispatcher } from "@afh/infrastructure";
import type { Clock, UnitOfWork } from "@afh/shared-kernel";

export type DispatcherDependencies = {
  readonly clock: Clock;
  readonly policyEngine: PolicyEngine;
  readonly unitOfWork: UnitOfWork;
  readonly workflow: WorkflowEngine | null;
  readonly approval: ApprovalEngine | null;
  readonly rules: RulesEngine | null;
  readonly outboxDispatcher: OutboxDispatcher | null;
  readonly resolvePrincipal?: (
    userId: string,
  ) => Promise<PolicyPrincipal | null>;
};

export class CommandDispatcher {
  constructor(
    private readonly pipeline: CommandPipeline,
    private readonly deps: DispatcherDependencies,
  ) {}

  async dispatch<TPayload, TResult = unknown>(
    command: Command<TPayload>,
    input: ApplicationContextInput,
  ): Promise<Result<TResult, PlatformError>> {
    const app = await this.#buildContext(input);
    return this.pipeline.execute(command, app);
  }

  async #buildContext(
    input: ApplicationContextInput,
  ): Promise<ApplicationContext> {
    let principal = input.principal ?? null;
    if (!principal && input.userId && this.deps.resolvePrincipal) {
      principal = await this.deps.resolvePrincipal(input.userId);
    }
    return {
      correlationId: input.correlationId,
      userId: input.userId ?? null,
      companyId: input.companyId ?? null,
      branchId: input.branchId ?? null,
      principal,
      metadata: input.metadata ?? {},
      clock: this.deps.clock,
      signal: input.signal ?? null,
      policyEngine: this.deps.policyEngine,
      workflow: this.deps.workflow,
      approval: this.deps.approval,
      rules: this.deps.rules,
      unitOfWork: this.deps.unitOfWork,
      outboxDispatcher: this.deps.outboxDispatcher,
    };
  }
}

export class QueryDispatcher {
  constructor(
    private readonly pipeline: QueryPipeline,
    private readonly deps: DispatcherDependencies,
  ) {}

  async dispatch<TPayload, TResult = unknown>(
    query: Query<TPayload>,
    input: ApplicationContextInput,
  ): Promise<Result<TResult, PlatformError>> {
    const app = await this.#buildContext(input);
    return this.pipeline.execute(query, app);
  }

  async #buildContext(
    input: ApplicationContextInput,
  ): Promise<ApplicationContext> {
    let principal = input.principal ?? null;
    if (!principal && input.userId && this.deps.resolvePrincipal) {
      principal = await this.deps.resolvePrincipal(input.userId);
    }
    return {
      correlationId: input.correlationId,
      userId: input.userId ?? null,
      companyId: input.companyId ?? null,
      branchId: input.branchId ?? null,
      principal,
      metadata: input.metadata ?? {},
      clock: this.deps.clock,
      signal: input.signal ?? null,
      policyEngine: this.deps.policyEngine,
      workflow: this.deps.workflow,
      approval: this.deps.approval,
      rules: this.deps.rules,
      unitOfWork: this.deps.unitOfWork,
      outboxDispatcher: null,
    };
  }
}
