/**
 * Shared helpers for finance application handlers.
 */

import type { ApplicationContext, AuthorizationSpec } from "@afh/application";
import { requireApproval, requireRules, requireWorkflow } from "@afh/application";
import type { Money } from "@afh/commerce";
import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  ApprovalEngine,
  RuleEvaluationResult,
  RulesEngine,
  WorkflowEngine,
} from "@afh/platform";
import type {
  Command,
  DomainEvent,
  PlatformError,
  Result,
} from "@afh/shared-kernel";
import {
  AggregateId,
  CausationId,
  CorrelationId,
  EventId,
  InfrastructureError,
  ValidationError,
  createEventMetadata,
  fail,
  ok,
} from "@afh/shared-kernel";
import type { MoneyIntent } from "../commands/commands.js";

export function newEntityId(): string {
  return crypto.randomUUID();
}

export function toMoney(intent: MoneyIntent): Result<Money, PlatformError> {
  try {
    const amountMinor = BigInt(intent.amountMinor);
    if (!intent.currencyCode.trim()) {
      return fail(
        new ValidationError("currencyCode is required", {
          code: "currency_required",
        }),
      );
    }
    return ok({ currencyCode: intent.currencyCode, amountMinor });
  } catch {
    return fail(
      new ValidationError("amountMinor must be an integer string", {
        code: "invalid_amount_minor",
      }),
    );
  }
}

/** Optional scope fields populated from the command/query payload (RC5.4). */
export type PolicyResourceScope = {
  readonly ownerUserId?: string | null;
  readonly organizationId?: string | null;
  readonly branchId?: string | null;
  readonly attributes?: Readonly<Record<string, unknown>>;
};

/**
 * Build an AuthorizationSpec for a company-scoped resource.
 * RC5.4: populate owner/org/branch/attributes from the payload when present.
 * Persisted-record re-authorization remains RC5.5.
 */
export function companyResource(
  type: string,
  action: string,
  companyId: string,
  id: string | null = null,
  scope: PolicyResourceScope = {},
): AuthorizationSpec {
  return {
    action,
    resource: {
      type,
      id,
      companyId,
      ownerUserId: scope.ownerUserId ?? null,
      organizationId: scope.organizationId ?? null,
      branchId: scope.branchId ?? null,
      ...(scope.attributes !== undefined
        ? { attributes: scope.attributes }
        : {}),
    },
  };
}

export function requireCompanyId(
  ctx: ApplicationContext,
  payloadCompanyId: string,
): Result<string, PlatformError> {
  if (!payloadCompanyId.trim()) {
    return fail(
      new ValidationError("companyId is required", { code: "company_required" }),
    );
  }
  if (ctx.companyId && ctx.companyId !== payloadCompanyId) {
    return fail(
      new ValidationError("companyId does not match execution scope", {
        code: "company_scope_mismatch",
      }),
    );
  }
  return ok(payloadCompanyId);
}

export async function enqueueDomainEvent(
  outbox: OutboxStore,
  event: DomainEvent,
): Promise<Result<void, PlatformError>> {
  return outbox.enqueue({
    id: newEntityId(),
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

export function buildFinanceEvent<TPayload>(input: {
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly companyId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly clock: ApplicationContext["clock"];
  readonly payload: TPayload;
  readonly sensitivity?: "internal" | "financial" | "pii";
}): DomainEvent<TPayload> {
  return {
    metadata: createEventMetadata({
      eventId: EventId.from(newEntityId()),
      eventType: input.eventType,
      eventVersion: 1,
      occurredAt: input.clock.now(),
      correlationId: CorrelationId.from(input.correlationId),
      causationId: CausationId.from(input.causationId),
      aggregateType: input.aggregateType,
      aggregateId: AggregateId.from(input.aggregateId),
      companyId: input.companyId,
      sensitivity: input.sensitivity ?? "financial",
    }),
    payload: input.payload,
  };
}

export async function recordFinanceAudit(
  audit: SecurityAuditService,
  ctx: ApplicationContext,
  input: {
    readonly action: string;
    readonly entityType: string;
    readonly entityId: string | null;
    readonly outcome: "success" | "failure";
    readonly details?: Readonly<Record<string, unknown>>;
  },
): Promise<void> {
  await audit.record({
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    outcome: input.outcome,
    details: input.details ?? {},
    correlationId: ctx.correlationId,
  });
}

export function workflowOrFail(
  ctx: ApplicationContext,
): Result<WorkflowEngine, PlatformError> {
  try {
    return ok(requireWorkflow(ctx));
  } catch {
    return fail(
      new InfrastructureError(
        "WorkflowEngine is required for lifecycle changes",
        { code: "workflow_not_wired" },
      ),
    );
  }
}

export function rulesOrNull(ctx: ApplicationContext): RulesEngine | null {
  return ctx.rules;
}

export function approvalOrNull(ctx: ApplicationContext): ApprovalEngine | null {
  return ctx.approval;
}

export async function invokeFinanceRules(
  ctx: ApplicationContext,
  ruleSetCode: string,
  context: Readonly<Record<string, unknown>>,
): Promise<Result<RuleEvaluationResult | null, PlatformError>> {
  if (!ctx.rules) {
    return ok(null);
  }
  const engine = requireRules(ctx);
  const result = await engine.evaluate({
    companyId:
      (context.companyId as string | null | undefined) ?? ctx.companyId,
    ruleSetCode,
    context,
    audit: true,
  });
  if (!result.ok) {
    if (result.error.code === "rule_set_not_found") {
      return ok(null);
    }
    return result;
  }
  if (!result.value.allowed) {
    return fail(
      new ValidationError("Finance rules evaluation denied", {
        code: "finance_rules_denied",
        details: {
          ruleSetCode,
          matchedRuleIds: result.value.matchedRuleIds,
        },
      }),
    );
  }
  return ok(result.value);
}

export function commandCausationId(command: Command): string {
  return command.commandId.value;
}

export { requireApproval };
