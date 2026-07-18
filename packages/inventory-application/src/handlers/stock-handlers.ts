import type { CommandHandler } from "@afh/application";
import { authorizationDenied } from "@afh/application";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  fail,
  ok,
} from "@afh/shared-kernel";
import { InventoryEventTypes } from "@afh/inventory";
import {
  InventoryApprovalTypes,
  InventoryCommandTypes,
  InventoryPolicyActions,
  InventoryRuleSetCodes,
  InventorySubjectTypes,
} from "../constants.js";
import type {
  AdjustStockPayload,
  ReceiveStockPayload,
  ReleaseReservationPayload,
  ReserveStockPayload,
  TransferStockPayload,
} from "../commands/commands.js";
import {
  adjustStockCommandValidator,
  receiveStockCommandValidator,
  releaseReservationCommandValidator,
  reserveStockCommandValidator,
  transferStockCommandValidator,
} from "../validators/validators.js";
import type { InventoryHandlerDeps } from "./deps.js";
import {
  applyProjection,
  loadOrCreatePosition,
  persistMovementAndLedger,
} from "./stock-ops.js";
import {
  approvalOrNull,
  buildInventoryEvent,
  commandCausationId,
  companyResource,
  loadRecordForAuthorization,
  enqueueDomainEvent,
  invokeInventoryRules,
  newEntityId,
  recordInventoryAudit,
  requireApproval,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

export function createReceiveStockHandler(
  deps: InventoryHandlerDeps,
): CommandHandler<
  ReceiveStockPayload,
  { movementId: string; ledgerId: string }
> {
  return {
    commandType: InventoryCommandTypes.ReceiveStock,
    async authorize(command) {
      const p = command.payload;
      const warehouse = await loadRecordForAuthorization(() =>
        deps.warehouses.findById({ companyId: p.companyId, id: p.warehouseId }),
      );
      return companyResource(
        "stock",
        InventoryPolicyActions.StockReceive,
        p.companyId,
        null,
        {
          branchId: warehouse?.branchId ?? null,
          attributes: {
            inventoryItemId: p.inventoryItemId ?? null,
            warehouseId: p.warehouseId ?? null,
            locationId: p.locationId ?? null,
            subjectId: p.subjectId ?? null,
          },
        },
      );
    },
    validate() {
      return receiveStockCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const rules = await invokeInventoryRules(
        ctx,
        InventoryRuleSetCodes.AllocationStrategy,
        {
          companyId: scope.value,
          inventoryItemId: p.inventoryItemId,
          warehouseId: p.warehouseId,
          quantity: p.quantity,
          kind: "receipt",
        },
      );
      if (!rules.ok) return rules;

      const now = ctx.clock.now().toISOString();
      const occurredAt = p.occurredAt ?? now;
      const locationId = p.locationId ?? null;

      const position = await loadOrCreatePosition(deps, {
        companyId: scope.value,
        inventoryItemId: p.inventoryItemId,
        warehouseId: p.warehouseId,
        locationId,
        unitCode: p.unitCode ?? null,
        batchId: p.batchId ?? null,
        lotId: p.lotId ?? null,
        now,
      });
      if (!position.ok) return position;

      const persisted = await persistMovementAndLedger(deps, ctx, {
        companyId: scope.value,
        kind: "receipt",
        inventoryItemId: p.inventoryItemId,
        quantity: p.quantity,
        unitCode: p.unitCode ?? null,
        fromWarehouseId: null,
        toWarehouseId: p.warehouseId,
        fromLocationId: null,
        toLocationId: locationId,
        batchId: p.batchId ?? null,
        lotId: p.lotId ?? null,
        serialNumberId: p.serialNumberId ?? null,
        subjectType: p.subjectType ?? null,
        subjectId: p.subjectId ?? null,
        warehouseIdForLedger: p.warehouseId,
        locationIdForLedger: locationId,
        quantityDelta: p.quantity,
        bucket: "on_hand",
        position: position.value,
        projection: {
          onHand: p.quantity,
          available: p.quantity,
        },
        occurredAt,
      });
      if (!persisted.ok) return persisted;

      await recordInventoryAudit(deps.audit, ctx, {
        action: InventoryCommandTypes.ReceiveStock,
        entityType: "inventory_movement",
        entityId: persisted.value.movementId,
        outcome: "success",
        details: {
          inventoryItemId: p.inventoryItemId,
          warehouseId: p.warehouseId,
          quantity: p.quantity,
        },
      });

      return ok(persisted.value);
    },
  };
}

export function createAdjustStockHandler(
  deps: InventoryHandlerDeps,
): CommandHandler<
  AdjustStockPayload,
  {
    movementId?: string;
    ledgerId?: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: InventoryCommandTypes.AdjustStock,
    async authorize(command) {
      const p = command.payload;
      const warehouse = await loadRecordForAuthorization(() =>
        deps.warehouses.findById({ companyId: p.companyId, id: p.warehouseId }),
      );
      return companyResource(
        "stock",
        InventoryPolicyActions.StockAdjust,
        p.companyId,
        null,
        {
          branchId: warehouse?.branchId ?? null,
          attributes: {
            inventoryItemId: p.inventoryItemId ?? null,
            warehouseId: p.warehouseId ?? null,
            locationId: p.locationId ?? null,
            subjectId: p.subjectId ?? null,
          },
        },
      );
    },
    validate() {
      return adjustStockCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const rules = await invokeInventoryRules(
        ctx,
        InventoryRuleSetCodes.AdjustmentPolicy,
        {
          companyId: scope.value,
          inventoryItemId: p.inventoryItemId,
          warehouseId: p.warehouseId,
          quantityDelta: p.quantityDelta,
          reason: p.reason ?? null,
        },
      );
      if (!rules.ok) return rules;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError("ApprovalEngine required for stock adjustment", {
              code: "approval_not_wired",
            }),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: InventoryApprovalTypes.StockAdjustment,
          subjectType: InventorySubjectTypes.StockMovement,
          subjectId: p.inventoryItemId,
          payload: {
            warehouseId: p.warehouseId,
            quantityDelta: p.quantityDelta,
            reason: p.reason ?? null,
          },
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordInventoryAudit(deps.audit, ctx, {
          action: InventoryCommandTypes.AdjustStock,
          entityType: "inventory_item",
          entityId: p.inventoryItemId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const now = ctx.clock.now().toISOString();
      const locationId = p.locationId ?? null;
      const position = await loadOrCreatePosition(deps, {
        companyId: scope.value,
        inventoryItemId: p.inventoryItemId,
        warehouseId: p.warehouseId,
        locationId,
        unitCode: p.unitCode ?? null,
        batchId: p.batchId ?? null,
        lotId: p.lotId ?? null,
        now,
      });
      if (!position.ok) return position;

      const bucket = p.bucket ?? "on_hand";
      const projection =
        bucket === "damaged"
          ? { damaged: p.quantityDelta }
          : bucket === "returned"
            ? { returned: p.quantityDelta }
            : { onHand: p.quantityDelta, available: p.quantityDelta };

      const persisted = await persistMovementAndLedger(deps, ctx, {
        companyId: scope.value,
        kind: "adjustment",
        inventoryItemId: p.inventoryItemId,
        quantity: Math.abs(p.quantityDelta),
        unitCode: p.unitCode ?? null,
        fromWarehouseId: p.quantityDelta < 0 ? p.warehouseId : null,
        toWarehouseId: p.quantityDelta > 0 ? p.warehouseId : null,
        fromLocationId: p.quantityDelta < 0 ? locationId : null,
        toLocationId: p.quantityDelta > 0 ? locationId : null,
        batchId: p.batchId ?? null,
        lotId: p.lotId ?? null,
        serialNumberId: p.serialNumberId ?? null,
        subjectType: p.subjectType ?? null,
        subjectId: p.subjectId ?? null,
        warehouseIdForLedger: p.warehouseId,
        locationIdForLedger: locationId,
        quantityDelta: p.quantityDelta,
        bucket,
        position: position.value,
        projection,
        occurredAt: now,
      });
      if (!persisted.ok) return persisted;

      const event = buildInventoryEvent({
        eventType: InventoryEventTypes.StockAdjusted,
        aggregateType: "inventory_item",
        aggregateId: p.inventoryItemId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          inventoryItemId: p.inventoryItemId,
          companyId: scope.value,
          warehouseId: p.warehouseId,
          quantityDelta: p.quantityDelta,
          movementId: persisted.value.movementId,
          correlationId: ctx.correlationId,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordInventoryAudit(deps.audit, ctx, {
        action: InventoryCommandTypes.AdjustStock,
        entityType: "inventory_movement",
        entityId: persisted.value.movementId,
        outcome: "success",
        details: { quantityDelta: p.quantityDelta, reason: p.reason ?? null },
      });

      return ok({
        movementId: persisted.value.movementId,
        ledgerId: persisted.value.ledgerId,
        pendingApproval: false,
      });
    },
  };
}

export function createReserveStockHandler(
  deps: InventoryHandlerDeps,
): CommandHandler<
  ReserveStockPayload,
  { movementId: string; ledgerId: string }
> {
  return {
    commandType: InventoryCommandTypes.ReserveStock,
    async authorize(command) {
      const p = command.payload;
      const warehouse = await loadRecordForAuthorization(() =>
        deps.warehouses.findById({ companyId: p.companyId, id: p.warehouseId }),
      );
      return companyResource(
        "stock",
        InventoryPolicyActions.StockReserve,
        p.companyId,
        null,
        {
          branchId: warehouse?.branchId ?? null,
          attributes: {
            inventoryItemId: p.inventoryItemId ?? null,
            warehouseId: p.warehouseId ?? null,
            locationId: p.locationId ?? null,
            subjectId: p.subjectId ?? null,
          },
        },
      );
    },
    validate() {
      return reserveStockCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const rules = await invokeInventoryRules(
        ctx,
        InventoryRuleSetCodes.ReservationPolicy,
        {
          companyId: scope.value,
          inventoryItemId: p.inventoryItemId,
          warehouseId: p.warehouseId,
          quantity: p.quantity,
          subjectType: p.subjectType,
          subjectId: p.subjectId,
        },
      );
      if (!rules.ok) return rules;

      const now = ctx.clock.now().toISOString();
      const locationId = p.locationId ?? null;
      const position = await loadOrCreatePosition(deps, {
        companyId: scope.value,
        inventoryItemId: p.inventoryItemId,
        warehouseId: p.warehouseId,
        locationId,
        unitCode: p.unitCode ?? null,
        batchId: null,
        lotId: null,
        now,
      });
      if (!position.ok) return position;

      if (position.value.available < p.quantity) {
        return fail(
          new ValidationError("Insufficient available stock to reserve", {
            code: "insufficient_stock",
          }),
        );
      }

      const persisted = await persistMovementAndLedger(deps, ctx, {
        companyId: scope.value,
        kind: "reservation",
        inventoryItemId: p.inventoryItemId,
        quantity: p.quantity,
        unitCode: p.unitCode ?? null,
        fromWarehouseId: p.warehouseId,
        toWarehouseId: p.warehouseId,
        fromLocationId: locationId,
        toLocationId: locationId,
        batchId: null,
        lotId: null,
        serialNumberId: null,
        subjectType: p.subjectType,
        subjectId: p.subjectId,
        warehouseIdForLedger: p.warehouseId,
        locationIdForLedger: locationId,
        quantityDelta: 0,
        bucket: "reserved",
        position: position.value,
        projection: {
          reserved: p.quantity,
          available: -p.quantity,
        },
        occurredAt: now,
      });
      if (!persisted.ok) return persisted;

      const event = buildInventoryEvent({
        eventType: InventoryEventTypes.StockReserved,
        aggregateType: "inventory_item",
        aggregateId: p.inventoryItemId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          inventoryItemId: p.inventoryItemId,
          companyId: scope.value,
          warehouseId: p.warehouseId,
          quantity: p.quantity,
          movementId: persisted.value.movementId,
          correlationId: ctx.correlationId,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordInventoryAudit(deps.audit, ctx, {
        action: InventoryCommandTypes.ReserveStock,
        entityType: "inventory_movement",
        entityId: persisted.value.movementId,
        outcome: "success",
        details: {
          subjectType: p.subjectType,
          subjectId: p.subjectId,
          quantity: p.quantity,
        },
      });

      return ok(persisted.value);
    },
  };
}

export function createReleaseReservationHandler(
  deps: InventoryHandlerDeps,
): CommandHandler<
  ReleaseReservationPayload,
  { movementId: string; ledgerId: string }
> {
  return {
    commandType: InventoryCommandTypes.ReleaseReservation,
    async authorize(command) {
      const p = command.payload;
      const warehouse = await loadRecordForAuthorization(() =>
        deps.warehouses.findById({ companyId: p.companyId, id: p.warehouseId }),
      );
      return companyResource(
        "stock",
        InventoryPolicyActions.StockRelease,
        p.companyId,
        null,
        {
          branchId: warehouse?.branchId ?? null,
          attributes: {
            inventoryItemId: p.inventoryItemId ?? null,
            warehouseId: p.warehouseId ?? null,
            locationId: p.locationId ?? null,
            subjectId: p.subjectId ?? null,
          },
        },
      );
    },
    validate() {
      return releaseReservationCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const rules = await invokeInventoryRules(
        ctx,
        InventoryRuleSetCodes.ReservationPolicy,
        {
          companyId: scope.value,
          inventoryItemId: p.inventoryItemId,
          warehouseId: p.warehouseId,
          quantity: p.quantity,
          kind: "release",
          priorMovementId: p.movementId ?? null,
        },
      );
      if (!rules.ok) return rules;

      const now = ctx.clock.now().toISOString();
      const locationId = p.locationId ?? null;
      const position = await loadOrCreatePosition(deps, {
        companyId: scope.value,
        inventoryItemId: p.inventoryItemId,
        warehouseId: p.warehouseId,
        locationId,
        unitCode: p.unitCode ?? null,
        batchId: null,
        lotId: null,
        now,
      });
      if (!position.ok) return position;

      const persisted = await persistMovementAndLedger(deps, ctx, {
        companyId: scope.value,
        kind: "release",
        inventoryItemId: p.inventoryItemId,
        quantity: p.quantity,
        unitCode: p.unitCode ?? null,
        fromWarehouseId: p.warehouseId,
        toWarehouseId: p.warehouseId,
        fromLocationId: locationId,
        toLocationId: locationId,
        batchId: null,
        lotId: null,
        serialNumberId: null,
        subjectType: p.subjectType ?? null,
        subjectId: p.subjectId ?? null,
        warehouseIdForLedger: p.warehouseId,
        locationIdForLedger: locationId,
        quantityDelta: 0,
        bucket: "reserved",
        position: position.value,
        projection: {
          reserved: -p.quantity,
          available: p.quantity,
        },
        occurredAt: now,
      });
      if (!persisted.ok) return persisted;

      const event = buildInventoryEvent({
        eventType: InventoryEventTypes.StockReleased,
        aggregateType: "inventory_item",
        aggregateId: p.inventoryItemId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          inventoryItemId: p.inventoryItemId,
          companyId: scope.value,
          warehouseId: p.warehouseId,
          quantity: p.quantity,
          movementId: persisted.value.movementId,
          correlationId: ctx.correlationId,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordInventoryAudit(deps.audit, ctx, {
        action: InventoryCommandTypes.ReleaseReservation,
        entityType: "inventory_movement",
        entityId: persisted.value.movementId,
        outcome: "success",
        details: { quantity: p.quantity, priorMovementId: p.movementId ?? null },
      });

      return ok(persisted.value);
    },
  };
}

export function createTransferStockHandler(
  deps: InventoryHandlerDeps,
): CommandHandler<
  TransferStockPayload,
  {
    movementId?: string;
    fromLedgerId?: string;
    toLedgerId?: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: InventoryCommandTypes.TransferStock,
    async authorize(command) {
      const p = command.payload;
      const fromWarehouse = await loadRecordForAuthorization(() =>
        deps.warehouses.findById({
          companyId: p.companyId,
          id: p.fromWarehouseId,
        }),
      );
      const toWarehouse = await loadRecordForAuthorization(() =>
        deps.warehouses.findById({
          companyId: p.companyId,
          id: p.toWarehouseId,
        }),
      );
      // Single-branch PolicyResource: source branch drives authorize(); RC7.4
      // destination branch is evaluated again in handle() before mutations.
      return companyResource(
        "stock",
        InventoryPolicyActions.StockTransfer,
        p.companyId,
        null,
        {
          branchId: fromWarehouse?.branchId ?? null,
          attributes: {
            fromBranchId: fromWarehouse?.branchId ?? null,
            toBranchId: toWarehouse?.branchId ?? null,
            inventoryItemId: p.inventoryItemId ?? null,
            fromWarehouseId: p.fromWarehouseId ?? null,
            toWarehouseId: p.toWarehouseId ?? null,
            fromLocationId: p.fromLocationId ?? null,
            toLocationId: p.toLocationId ?? null,
            subjectId: p.subjectId ?? null,
          },
        },
      );
    },
    validate() {
      return transferStockCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const rules = await invokeInventoryRules(
        ctx,
        InventoryRuleSetCodes.TransferPolicy,
        {
          companyId: scope.value,
          inventoryItemId: p.inventoryItemId,
          quantity: p.quantity,
          fromWarehouseId: p.fromWarehouseId,
          toWarehouseId: p.toWarehouseId,
        },
      );
      if (!rules.ok) return rules;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError("ApprovalEngine required for stock transfer", {
              code: "approval_not_wired",
            }),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: InventoryApprovalTypes.StockTransfer,
          subjectType: InventorySubjectTypes.StockMovement,
          subjectId: p.inventoryItemId,
          payload: {
            fromWarehouseId: p.fromWarehouseId,
            toWarehouseId: p.toWarehouseId,
            quantity: p.quantity,
          },
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordInventoryAudit(deps.audit, ctx, {
          action: InventoryCommandTypes.TransferStock,
          entityType: "inventory_item",
          entityId: p.inventoryItemId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const fromWarehouseResult = await deps.warehouses.findById({
        companyId: scope.value,
        id: p.fromWarehouseId,
      });
      if (!fromWarehouseResult.ok) return fromWarehouseResult;
      if (!fromWarehouseResult.value) {
        return fail(
          new NotFoundError("Source warehouse not found", {
            code: "warehouse_not_found",
          }),
        );
      }

      const toWarehouseResult = await deps.warehouses.findById({
        companyId: scope.value,
        id: p.toWarehouseId,
      });
      if (!toWarehouseResult.ok) return toWarehouseResult;
      if (!toWarehouseResult.value) {
        return fail(
          new NotFoundError("Destination warehouse not found", {
            code: "warehouse_not_found",
          }),
        );
      }

      const fromWarehouse = fromWarehouseResult.value;
      const toWarehouse = toWarehouseResult.value;

      const destDecision = await ctx.policyEngine.evaluate(
        ctx.principal!,
        InventoryPolicyActions.StockTransfer,
        {
          type: "stock",
          id: null,
          companyId: scope.value,
          ownerUserId: null,
          organizationId: null,
          branchId: toWarehouse.branchId ?? null,
          attributes: {
            fromBranchId: fromWarehouse.branchId ?? null,
            toBranchId: toWarehouse.branchId ?? null,
            inventoryItemId: p.inventoryItemId ?? null,
            fromWarehouseId: p.fromWarehouseId ?? null,
            toWarehouseId: p.toWarehouseId ?? null,
            fromLocationId: p.fromLocationId ?? null,
            toLocationId: p.toLocationId ?? null,
            subjectId: p.subjectId ?? null,
          },
        },
        { correlationId: ctx.correlationId },
      );
      if (!destDecision.allowed) {
        return fail(
          authorizationDenied(destDecision.reasonCode, destDecision.message),
        );
      }

      if (p.workflowInstanceId && p.transitionCode) {
        const wf = workflowOrFail(ctx);
        if (!wf.ok) return wf;
        const transitioned = await wf.value.transition({
          instanceId: p.workflowInstanceId,
          transitionCode: p.transitionCode,
          actorUserId: ctx.userId,
        });
        if (!transitioned.ok) return transitioned;
      }

      const now = ctx.clock.now().toISOString();
      const fromLocationId = p.fromLocationId ?? null;
      const toLocationId = p.toLocationId ?? null;

      const fromPosition = await loadOrCreatePosition(deps, {
        companyId: scope.value,
        inventoryItemId: p.inventoryItemId,
        warehouseId: p.fromWarehouseId,
        locationId: fromLocationId,
        unitCode: p.unitCode ?? null,
        batchId: p.batchId ?? null,
        lotId: p.lotId ?? null,
        now,
      });
      if (!fromPosition.ok) return fromPosition;

      if (fromPosition.value.available < p.quantity) {
        return fail(
          new ValidationError("Insufficient available stock to transfer", {
            code: "insufficient_stock",
          }),
        );
      }

      const toPosition = await loadOrCreatePosition(deps, {
        companyId: scope.value,
        inventoryItemId: p.inventoryItemId,
        warehouseId: p.toWarehouseId,
        locationId: toLocationId,
        unitCode: p.unitCode ?? null,
        batchId: p.batchId ?? null,
        lotId: p.lotId ?? null,
        now,
      });
      if (!toPosition.ok) return toPosition;

      const fromPersisted = await persistMovementAndLedger(deps, ctx, {
        companyId: scope.value,
        kind: "transfer",
        inventoryItemId: p.inventoryItemId,
        quantity: p.quantity,
        unitCode: p.unitCode ?? null,
        fromWarehouseId: p.fromWarehouseId,
        toWarehouseId: p.toWarehouseId,
        fromLocationId,
        toLocationId,
        batchId: p.batchId ?? null,
        lotId: p.lotId ?? null,
        serialNumberId: p.serialNumberId ?? null,
        subjectType: p.subjectType ?? null,
        subjectId: p.subjectId ?? null,
        warehouseIdForLedger: p.fromWarehouseId,
        locationIdForLedger: fromLocationId,
        quantityDelta: -p.quantity,
        bucket: "on_hand",
        position: fromPosition.value,
        projection: {
          onHand: -p.quantity,
          available: -p.quantity,
        },
        occurredAt: now,
      });
      if (!fromPersisted.ok) return fromPersisted;

      // Destination ledger + projection (same movement id)
      const toLedgerId = newEntityId();
      const toLedger = await deps.ledger.append({
        id: toLedgerId,
        companyId: scope.value,
        inventoryItemId: p.inventoryItemId,
        warehouseId: p.toWarehouseId,
        locationId: toLocationId,
        movementId: fromPersisted.value.movementId,
        movementKind: "transfer",
        quantityDelta: p.quantity,
        unitCode: p.unitCode ?? null,
        bucket: "on_hand",
        batchId: p.batchId ?? null,
        lotId: p.lotId ?? null,
        serialNumberId: p.serialNumberId ?? null,
        occurredAt: now,
        recordedAt: now,
        correlationId: ctx.correlationId,
        causationId: null,
        subjectType: p.subjectType ?? null,
        subjectId: p.subjectId ?? null,
      });
      if (!toLedger.ok) return toLedger;

      const savedTo = await deps.stock.save(
        applyProjection(
          toPosition.value,
          { onHand: p.quantity, available: p.quantity },
          now,
        ),
      );
      if (!savedTo.ok) return savedTo;

      await recordInventoryAudit(deps.audit, ctx, {
        action: InventoryCommandTypes.TransferStock,
        entityType: "inventory_movement",
        entityId: fromPersisted.value.movementId,
        outcome: "success",
        details: {
          fromWarehouseId: p.fromWarehouseId,
          toWarehouseId: p.toWarehouseId,
          quantity: p.quantity,
        },
      });

      return ok({
        movementId: fromPersisted.value.movementId,
        fromLedgerId: fromPersisted.value.ledgerId,
        toLedgerId,
        pendingApproval: false,
      });
    },
  };
}
