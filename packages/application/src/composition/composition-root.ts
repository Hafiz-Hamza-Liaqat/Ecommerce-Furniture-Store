/**
 * Application runtime composition root.
 * Wires infrastructure, policy, optional platform engines, handlers, pipelines, dispatchers.
 * No business use cases.
 */

import type {
  ApprovalEngine,
  RulesEngine,
  WorkflowEngine,
} from "@afh/platform";
import type { PolicyEngine, PolicyPrincipal } from "@afh/identity";
import type { InfrastructureRuntime } from "@afh/infrastructure";
import { HandlerRegistry } from "../handlers/handlers.js";
import {
  AuditBehavior,
  AuthorizationBehavior,
  ExceptionMappingBehavior,
  LoggingBehavior,
  MetricsBehavior,
  OutboxFlushBehavior,
  TracingBehavior,
  TransactionBehavior,
  ValidationBehavior,
  type AuditHook,
  type CommandBehavior,
  type QueryBehavior,
} from "../pipeline/behaviors.js";
import { CommandPipeline, QueryPipeline } from "../pipeline/pipeline.js";
import {
  CommandDispatcher,
  QueryDispatcher,
  type DispatcherDependencies,
} from "../dispatcher/dispatcher.js";

export type ApplicationRuntime = {
  readonly infrastructure: InfrastructureRuntime;
  readonly policyEngine: PolicyEngine;
  readonly workflow: WorkflowEngine | null;
  readonly approval: ApprovalEngine | null;
  readonly rules: RulesEngine | null;
  readonly handlers: HandlerRegistry;
  readonly commandPipeline: CommandPipeline;
  readonly queryPipeline: QueryPipeline;
  readonly commands: CommandDispatcher;
  readonly queries: QueryDispatcher;
  dispose(): void;
};

export type CreateApplicationRuntimeOptions = {
  readonly infrastructure: InfrastructureRuntime;
  /** Sole runtime authorization engine (Phase 2A/2B) */
  readonly policyEngine: PolicyEngine;
  readonly workflow?: WorkflowEngine | null;
  readonly approval?: ApprovalEngine | null;
  readonly rules?: RulesEngine | null;
  readonly handlers?: HandlerRegistry;
  readonly resolvePrincipal?: (
    userId: string,
  ) => Promise<PolicyPrincipal | null>;
  readonly auditHook?: AuditHook;
  /** Replace default command behavior stack (advanced) */
  readonly commandBehaviors?: readonly CommandBehavior[];
  /** Replace default query behavior stack (advanced) */
  readonly queryBehaviors?: readonly QueryBehavior[];
};

function defaultCommandBehaviors(
  options: CreateApplicationRuntimeOptions,
): CommandBehavior[] {
  const infra = options.infrastructure;
  const behaviors: CommandBehavior[] = [
    new ExceptionMappingBehavior(),
    new LoggingBehavior(infra.logger),
    new MetricsBehavior(infra.metrics),
    new TracingBehavior(infra.tracer),
  ];
  if (options.auditHook) {
    behaviors.push(new AuditBehavior(options.auditHook));
  }
  behaviors.push(
    new ValidationBehavior(),
    new AuthorizationBehavior(options.policyEngine),
    new OutboxFlushBehavior(),
    new TransactionBehavior(infra.persistence.unitOfWork),
  );
  return behaviors;
}

function defaultQueryBehaviors(
  options: CreateApplicationRuntimeOptions,
): QueryBehavior[] {
  const infra = options.infrastructure;
  const behaviors: QueryBehavior[] = [
    new ExceptionMappingBehavior(),
    new LoggingBehavior(infra.logger),
    new MetricsBehavior(infra.metrics),
    new TracingBehavior(infra.tracer),
  ];
  if (options.auditHook) {
    behaviors.push(new AuditBehavior(options.auditHook));
  }
  behaviors.push(
    new ValidationBehavior(),
    new AuthorizationBehavior(options.policyEngine),
  );
  return behaviors;
}

/**
 * Creates the reusable Application Layer Foundation runtime.
 * Transport-agnostic. No HTTP, no business handlers.
 */
export function createApplicationRuntime(
  options: CreateApplicationRuntimeOptions,
): ApplicationRuntime {
  const infrastructure = options.infrastructure;
  const workflow = options.workflow ?? null;
  const approval = options.approval ?? null;
  const rules = options.rules ?? null;
  const handlers = options.handlers ?? new HandlerRegistry();

  const commandBehaviors =
    options.commandBehaviors ?? defaultCommandBehaviors(options);
  const queryBehaviors =
    options.queryBehaviors ?? defaultQueryBehaviors(options);

  const commandPipeline = new CommandPipeline(handlers, commandBehaviors);
  const queryPipeline = new QueryPipeline(handlers, queryBehaviors);

  const dispatcherDeps: DispatcherDependencies = {
    clock: infrastructure.clock,
    policyEngine: options.policyEngine,
    unitOfWork: infrastructure.persistence.unitOfWork,
    workflow,
    approval,
    rules,
    outboxDispatcher: infrastructure.outboxDispatcher,
    ...(options.resolvePrincipal
      ? { resolvePrincipal: options.resolvePrincipal }
      : {}),
  };

  const commands = new CommandDispatcher(commandPipeline, dispatcherDeps);
  const queries = new QueryDispatcher(queryPipeline, dispatcherDeps);

  infrastructure.logger.info("Application runtime initialized", {
    commandHandlers: handlers.listCommandTypes().length,
    queryHandlers: handlers.listQueryTypes().length,
    workflowWired: workflow !== null,
    approvalWired: approval !== null,
    rulesWired: rules !== null,
  });

  return {
    infrastructure,
    policyEngine: options.policyEngine,
    workflow,
    approval,
    rules,
    handlers,
    commandPipeline,
    queryPipeline,
    commands,
    queries,
    dispose() {
      infrastructure.logger.info("Application runtime disposed");
      infrastructure.dispose();
    },
  };
}
