import type { ApplicationContext, CommandHandler } from "@afh/application";
import type {
  DiscountReference,
  PriceReference,
  TaxReference,
} from "@afh/commerce";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  SalesOrder,
  SalesOrderLine,
  SalesOrderStatus,
} from "@afh/sales";
import { SalesEventTypes } from "@afh/sales";
import {
  SalesApprovalTypes,
  SalesCommandTypes,
  SalesPolicyActions,
  SalesRuleSetCodes,
  SalesSubjectTypes,
  SalesWorkflowCodes,
} from "../constants.js";
import type {
  CancelSalesOrderPayload,
  CreateSalesOrderPayload,
  SalesOrderLineIntent,
} from "../commands/commands.js";
import {
  cancelSalesOrderCommandValidator,
  createSalesOrderCommandValidator,
} from "../validators/validators.js";
import type { SalesHandlerDeps } from "./deps.js";
import {
  approvalOrNull,
  buildSalesEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  invokeSalesRules,
  newEntityId,
  recordSalesAudit,
  requireApproval,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

type LineRefs = {
  readonly priceRef: PriceReference | null;
  readonly discountRef: DiscountReference | null;
  readonly taxRef: TaxReference | null;
};

function refsFromActions(
  actions: readonly Readonly<Record<string, unknown>>[],
  lineNumber: number,
): LineRefs {
  const matched =
    actions.find((a) => a.lineNumber === lineNumber) ?? actions[0];
  if (!matched) {
    return { priceRef: null, discountRef: null, taxRef: null };
  }
  return {
    priceRef: (matched.priceRef as PriceReference | null | undefined) ?? null,
    discountRef:
      (matched.discountRef as DiscountReference | null | undefined) ?? null,
    taxRef: (matched.taxRef as TaxReference | null | undefined) ?? null,
  };
}

function mapOrderStatus(projection: string): SalesOrderStatus {
  const known: SalesOrderStatus[] = [
    "draft",
    "placed",
    "confirmed",
    "fulfilling",
    "completed",
    "cancelled",
  ];
  return (known.includes(projection as SalesOrderStatus)
    ? projection
    : "draft") as SalesOrderStatus;
}

async function evaluateOrderRules(
  ctx: ApplicationContext,
  companyId: string,
  lines: readonly SalesOrderLineIntent[],
  customerId: string | null,
) {
  const pricing = await invokeSalesRules(ctx, SalesRuleSetCodes.Pricing, {
    companyId,
    lines,
  });
  if (!pricing.ok) return pricing;

  const discount = await invokeSalesRules(
    ctx,
    SalesRuleSetCodes.DiscountEligibility,
    { companyId, lines },
  );
  if (!discount.ok) return discount;

  const tax = await invokeSalesRules(ctx, SalesRuleSetCodes.Tax, {
    companyId,
    lines,
  });
  if (!tax.ok) return tax;

  const credit = await invokeSalesRules(ctx, SalesRuleSetCodes.CreditCheck, {
    companyId,
    customerId,
  });
  if (!credit.ok) return credit;

  return ok({
    pricingActions: pricing.value?.actions ?? [],
    discountActions: discount.value?.actions ?? [],
    taxActions: tax.value?.actions ?? [],
  });
}

export function createCreateSalesOrderHandler(
  deps: SalesHandlerDeps,
): CommandHandler<CreateSalesOrderPayload, { salesOrderId: string }> {
  return {
    commandType: SalesCommandTypes.CreateSalesOrder,
    authorize(command) {
      return companyResource(
        "order",
        SalesPolicyActions.OrderCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createSalesOrderCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const p = command.payload;
      const rules = await evaluateOrderRules(
        ctx,
        scope.value,
        p.lines,
        p.customerId ?? null,
      );
      if (!rules.ok) return rules;

      const salesOrderId = newEntityId();
      const now = ctx.clock.now().toISOString();

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: SalesWorkflowCodes.SalesOrder,
        subjectType: SalesSubjectTypes.SalesOrder,
        subjectId: salesOrderId,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const order: SalesOrder = {
        id: salesOrderId,
        companyId: scope.value,
        number: p.number,
        status: mapOrderStatus(started.value.statusProjection),
        customerId: p.customerId ?? null,
        organizationId: p.organizationId ?? null,
        quoteId: p.quoteId ?? null,
        opportunityId: p.opportunityId ?? null,
        projectId: p.projectId ?? null,
        salesRepUserId: p.salesRepUserId ?? ctx.userId,
        currencyCode: p.currencyCode,
        billingAddressId: p.billingAddressId ?? null,
        shippingAddressId: p.shippingAddressId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.orders.save(order);
      if (!saved.ok) return saved;

      for (let i = 0; i < p.lines.length; i++) {
        const intent = p.lines[i]!;
        const lineNumber = i + 1;
        const price = refsFromActions(rules.value.pricingActions, lineNumber);
        const discount = refsFromActions(
          rules.value.discountActions,
          lineNumber,
        );
        const tax = refsFromActions(rules.value.taxActions, lineNumber);
        const line: SalesOrderLine = {
          id: newEntityId(),
          salesOrderId,
          companyId: scope.value,
          lineNumber,
          productId: intent.productId ?? null,
          variantId: intent.variantId ?? null,
          inventoryItemId: intent.inventoryItemId ?? null,
          description: intent.description,
          quantity: intent.quantity,
          unitCode: intent.unitCode ?? null,
          priceRef: price.priceRef,
          discountRef: discount.discountRef,
          taxRef: tax.taxRef,
        };
        const savedLine = await deps.orders.saveLine(line);
        if (!savedLine.ok) return savedLine;
      }

      const event = buildSalesEvent({
        eventType: SalesEventTypes.OrderCreated,
        aggregateType: "sales_order",
        aggregateId: salesOrderId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          salesOrderId,
          companyId: scope.value,
          quoteId: p.quoteId ?? null,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordSalesAudit(deps.audit, ctx, {
        action: SalesCommandTypes.CreateSalesOrder,
        entityType: "sales_order",
        entityId: salesOrderId,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ salesOrderId });
    },
  };
}

export function createCancelSalesOrderHandler(
  deps: SalesHandlerDeps,
): CommandHandler<
  CancelSalesOrderPayload,
  {
    salesOrderId: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: SalesCommandTypes.CancelSalesOrder,
    authorize(command) {
      return companyResource(
        "order",
        SalesPolicyActions.OrderCancel,
        command.payload.companyId,
        command.payload.salesOrderId,
      );
    },
    validate() {
      return cancelSalesOrderCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.orders.findById({
        companyId: scope.value,
        id: command.payload.salesOrderId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Sales order not found", {
            code: "sales_order_not_found",
          }),
        );
      }
      if (existing.value.status === "cancelled") {
        return fail(
          new ConflictError("Sales order already cancelled", {
            code: "sales_order_already_cancelled",
          }),
        );
      }

      const p = command.payload;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError("ApprovalEngine required for order cancel", {
              code: "approval_not_wired",
            }),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: SalesApprovalTypes.OrderCancel,
          subjectType: SalesSubjectTypes.SalesOrder,
          subjectId: p.salesOrderId,
          payload: { reason: p.reason ?? null },
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordSalesAudit(deps.audit, ctx, {
          action: SalesCommandTypes.CancelSalesOrder,
          entityType: "sales_order",
          entityId: p.salesOrderId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
            reason: p.reason ?? null,
          },
        });

        return ok({
          salesOrderId: p.salesOrderId,
          approvalRequestId: submitted.value.id,
          pendingApproval: true as const,
        });
      }

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      if (!p.workflowInstanceId?.trim()) {
        return fail(
          new ConflictError("workflowInstanceId is required to cancel order", {
            code: "workflow_instance_required",
          }),
        );
      }

      const transitioned = await wf.value.transition({
        instanceId: p.workflowInstanceId,
        transitionCode: p.transitionCode ?? "cancel",
        actorUserId: ctx.userId,
        comment: p.reason ?? null,
      });
      if (!transitioned.ok) return transitioned;

      const now = ctx.clock.now().toISOString();
      const order: SalesOrder = {
        ...existing.value,
        status: mapOrderStatus(transitioned.value.statusProjection),
        updatedAt: now,
      };

      const saved = await deps.orders.save(order);
      if (!saved.ok) return saved;

      const event = buildSalesEvent({
        eventType: SalesEventTypes.OrderCancelled,
        aggregateType: "sales_order",
        aggregateId: order.id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          salesOrderId: order.id,
          companyId: scope.value,
          reason: p.reason ?? null,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordSalesAudit(deps.audit, ctx, {
        action: SalesCommandTypes.CancelSalesOrder,
        entityType: "sales_order",
        entityId: order.id,
        outcome: "success",
        details: {
          reason: p.reason ?? null,
          workflowInstanceId: p.workflowInstanceId,
        },
      });

      return ok({
        salesOrderId: order.id,
        pendingApproval: false,
      });
    },
  };
}
