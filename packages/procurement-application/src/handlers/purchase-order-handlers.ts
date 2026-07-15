import type { ApplicationContext, CommandHandler } from "@afh/application";
import type {
  DiscountReference,
  PriceReference,
  TaxReference,
} from "@afh/commerce";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderStatus,
} from "@afh/procurement";
import { ProcurementEventTypes } from "@afh/procurement";
import {
  ProcurementApprovalTypes,
  ProcurementCommandTypes,
  ProcurementPolicyActions,
  ProcurementRuleSetCodes,
  ProcurementSubjectTypes,
  ProcurementWorkflowCodes,
} from "../constants.js";
import type {
  CancelPurchaseOrderPayload,
  CreatePurchaseOrderPayload,
  IssuePurchaseOrderPayload,
  PurchaseOrderLineIntent,
} from "../commands/commands.js";
import {
  cancelPurchaseOrderCommandValidator,
  createPurchaseOrderCommandValidator,
  issuePurchaseOrderCommandValidator,
} from "../validators/validators.js";
import type { ProcurementHandlerDeps } from "./deps.js";
import {
  approvalOrNull,
  buildProcurementEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  invokeProcurementRules,
  newEntityId,
  recordProcurementAudit,
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

function mapOrderStatus(projection: string): PurchaseOrderStatus {
  const known: PurchaseOrderStatus[] = [
    "draft",
    "issued",
    "partially_received",
    "received",
    "closed",
    "cancelled",
  ];
  return (known.includes(projection as PurchaseOrderStatus)
    ? projection
    : "draft") as PurchaseOrderStatus;
}

async function evaluatePurchaseOrderRules(
  ctx: ApplicationContext,
  companyId: string,
  supplierId: string,
  lines: readonly PurchaseOrderLineIntent[],
) {
  const eligibility = await invokeProcurementRules(
    ctx,
    ProcurementRuleSetCodes.SupplierEligibility,
    { companyId, supplierId },
  );
  if (!eligibility.ok) return eligibility;

  const limits = await invokeProcurementRules(
    ctx,
    ProcurementRuleSetCodes.PurchasingLimits,
    { companyId, supplierId, lines },
  );
  if (!limits.ok) return limits;

  const thresholds = await invokeProcurementRules(
    ctx,
    ProcurementRuleSetCodes.ApprovalThresholds,
    { companyId, supplierId, lines },
  );
  if (!thresholds.ok) return thresholds;

  const financial = await invokeProcurementRules(
    ctx,
    ProcurementRuleSetCodes.FinancialPolicy,
    { companyId, supplierId, lines },
  );
  if (!financial.ok) return financial;

  return ok({
    financialActions: financial.value?.actions ?? [],
  });
}

export function createCreatePurchaseOrderHandler(
  deps: ProcurementHandlerDeps,
): CommandHandler<CreatePurchaseOrderPayload, { purchaseOrderId: string }> {
  return {
    commandType: ProcurementCommandTypes.CreatePurchaseOrder,
    authorize(command) {
      return companyResource(
        "purchase_order",
        ProcurementPolicyActions.PurchaseOrderCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createPurchaseOrderCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const supplier = await deps.suppliers.findById({
        companyId: scope.value,
        id: command.payload.supplierId,
      });
      if (!supplier.ok) return supplier;
      if (!supplier.value) {
        return fail(
          new NotFoundError("Supplier not found", {
            code: "supplier_not_found",
          }),
        );
      }

      const p = command.payload;
      const rules = await evaluatePurchaseOrderRules(
        ctx,
        scope.value,
        p.supplierId,
        p.lines,
      );
      if (!rules.ok) return rules;

      const purchaseOrderId = newEntityId();
      const now = ctx.clock.now().toISOString();

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: ProcurementWorkflowCodes.PurchaseOrder,
        subjectType: ProcurementSubjectTypes.PurchaseOrder,
        subjectId: purchaseOrderId,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const order: PurchaseOrder = {
        id: purchaseOrderId,
        companyId: scope.value,
        number: p.number,
        status: mapOrderStatus(started.value.statusProjection),
        supplierId: p.supplierId,
        requisitionId: p.requisitionId ?? null,
        projectId: p.projectId ?? null,
        warehouseId: p.warehouseId ?? null,
        currencyCode: p.currencyCode,
        deliveryTerms: p.deliveryTerms
          ? {
              termsCode: p.deliveryTerms.termsCode ?? null,
              notes: p.deliveryTerms.notes ?? null,
              expectedDeliveryAt: p.deliveryTerms.expectedDeliveryAt ?? null,
            }
          : null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.purchaseOrders.save(order);
      if (!saved.ok) return saved;

      for (let i = 0; i < p.lines.length; i++) {
        const intent = p.lines[i]!;
        const lineNumber = i + 1;
        const refs = refsFromActions(rules.value.financialActions, lineNumber);
        const line: PurchaseOrderLine = {
          id: newEntityId(),
          purchaseOrderId,
          companyId: scope.value,
          lineNumber,
          productId: intent.productId ?? null,
          variantId: intent.variantId ?? null,
          inventoryItemId: intent.inventoryItemId ?? null,
          description: intent.description,
          quantity: intent.quantity,
          unitCode: intent.unitCode ?? null,
          priceRef: refs.priceRef,
          discountRef: refs.discountRef,
          taxRef: refs.taxRef,
        };
        const savedLine = await deps.purchaseOrders.saveLine(line);
        if (!savedLine.ok) return savedLine;
      }

      const event = buildProcurementEvent({
        eventType: ProcurementEventTypes.PurchaseOrderCreated,
        aggregateType: "purchase_order",
        aggregateId: purchaseOrderId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          purchaseOrderId,
          companyId: scope.value,
          supplierId: p.supplierId,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordProcurementAudit(deps.audit, ctx, {
        action: ProcurementCommandTypes.CreatePurchaseOrder,
        entityType: "purchase_order",
        entityId: purchaseOrderId,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ purchaseOrderId });
    },
  };
}

export function createIssuePurchaseOrderHandler(
  deps: ProcurementHandlerDeps,
): CommandHandler<
  IssuePurchaseOrderPayload,
  {
    purchaseOrderId: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: ProcurementCommandTypes.IssuePurchaseOrder,
    authorize(command) {
      return companyResource(
        "purchase_order",
        ProcurementPolicyActions.PurchaseOrderIssue,
        command.payload.companyId,
        command.payload.purchaseOrderId,
      );
    },
    validate() {
      return issuePurchaseOrderCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.purchaseOrders.findById({
        companyId: scope.value,
        id: command.payload.purchaseOrderId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Purchase order not found", {
            code: "purchase_order_not_found",
          }),
        );
      }
      if (existing.value.status !== "draft") {
        return fail(
          new ConflictError("Only draft purchase orders can be issued", {
            code: "purchase_order_not_draft",
          }),
        );
      }

      const thresholds = await invokeProcurementRules(
        ctx,
        ProcurementRuleSetCodes.ApprovalThresholds,
        {
          companyId: scope.value,
          purchaseOrderId: existing.value.id,
          supplierId: existing.value.supplierId,
        },
      );
      if (!thresholds.ok) return thresholds;

      const p = command.payload;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError("ApprovalEngine required for PO issue", {
              code: "approval_not_wired",
            }),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: ProcurementApprovalTypes.PurchaseOrderIssue,
          subjectType: ProcurementSubjectTypes.PurchaseOrder,
          subjectId: p.purchaseOrderId,
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordProcurementAudit(deps.audit, ctx, {
          action: ProcurementCommandTypes.IssuePurchaseOrder,
          entityType: "purchase_order",
          entityId: p.purchaseOrderId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          purchaseOrderId: p.purchaseOrderId,
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;
      if (!p.workflowInstanceId?.trim()) {
        return fail(
          new ConflictError(
            "workflowInstanceId is required to issue purchase order",
            { code: "workflow_instance_required" },
          ),
        );
      }

      const transitioned = await wf.value.transition({
        instanceId: p.workflowInstanceId,
        transitionCode: p.transitionCode ?? "issue",
        actorUserId: ctx.userId,
      });
      if (!transitioned.ok) return transitioned;

      const now = ctx.clock.now().toISOString();
      const order: PurchaseOrder = {
        ...existing.value,
        status: mapOrderStatus(transitioned.value.statusProjection),
        updatedAt: now,
      };

      const saved = await deps.purchaseOrders.save(order);
      if (!saved.ok) return saved;

      const event = buildProcurementEvent({
        eventType: ProcurementEventTypes.PurchaseOrderIssued,
        aggregateType: "purchase_order",
        aggregateId: order.id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          purchaseOrderId: order.id,
          companyId: scope.value,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordProcurementAudit(deps.audit, ctx, {
        action: ProcurementCommandTypes.IssuePurchaseOrder,
        entityType: "purchase_order",
        entityId: order.id,
        outcome: "success",
        details: { workflowInstanceId: p.workflowInstanceId },
      });

      return ok({
        purchaseOrderId: order.id,
        pendingApproval: false,
      });
    },
  };
}

export function createCancelPurchaseOrderHandler(
  deps: ProcurementHandlerDeps,
): CommandHandler<
  CancelPurchaseOrderPayload,
  {
    purchaseOrderId: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: ProcurementCommandTypes.CancelPurchaseOrder,
    authorize(command) {
      return companyResource(
        "purchase_order",
        ProcurementPolicyActions.PurchaseOrderCancel,
        command.payload.companyId,
        command.payload.purchaseOrderId,
      );
    },
    validate() {
      return cancelPurchaseOrderCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.purchaseOrders.findById({
        companyId: scope.value,
        id: command.payload.purchaseOrderId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Purchase order not found", {
            code: "purchase_order_not_found",
          }),
        );
      }
      if (existing.value.status === "cancelled") {
        return fail(
          new ConflictError("Purchase order already cancelled", {
            code: "purchase_order_already_cancelled",
          }),
        );
      }

      const p = command.payload;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError("ApprovalEngine required for PO cancel", {
              code: "approval_not_wired",
            }),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: ProcurementApprovalTypes.PurchaseOrderCancel,
          subjectType: ProcurementSubjectTypes.PurchaseOrder,
          subjectId: p.purchaseOrderId,
          payload: { reason: p.reason ?? null },
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordProcurementAudit(deps.audit, ctx, {
          action: ProcurementCommandTypes.CancelPurchaseOrder,
          entityType: "purchase_order",
          entityId: p.purchaseOrderId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
            reason: p.reason ?? null,
          },
        });

        return ok({
          purchaseOrderId: p.purchaseOrderId,
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;
      if (!p.workflowInstanceId?.trim()) {
        return fail(
          new ConflictError(
            "workflowInstanceId is required to cancel purchase order",
            { code: "workflow_instance_required" },
          ),
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
      const order: PurchaseOrder = {
        ...existing.value,
        status: mapOrderStatus(transitioned.value.statusProjection),
        updatedAt: now,
      };

      const saved = await deps.purchaseOrders.save(order);
      if (!saved.ok) return saved;

      await recordProcurementAudit(deps.audit, ctx, {
        action: ProcurementCommandTypes.CancelPurchaseOrder,
        entityType: "purchase_order",
        entityId: order.id,
        outcome: "success",
        details: {
          reason: p.reason ?? null,
          workflowInstanceId: p.workflowInstanceId,
        },
      });

      return ok({
        purchaseOrderId: order.id,
        pendingApproval: false,
      });
    },
  };
}
