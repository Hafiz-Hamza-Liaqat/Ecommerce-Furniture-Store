import type { CommandHandler } from "@afh/application";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  InventoryItem,
  InventoryItemStatus,
  StorageLocation,
  Warehouse,
  WarehouseStatus,
} from "@afh/inventory";
import { InventoryEventTypes } from "@afh/inventory";
import {
  InventoryCommandTypes,
  InventoryPolicyActions,
  InventorySubjectTypes,
  InventoryWorkflowCodes,
} from "../constants.js";
import type {
  CreateInventoryItemPayload,
  CreateStorageLocationPayload,
  CreateWarehousePayload,
  UpdateInventoryItemPayload,
} from "../commands/commands.js";
import {
  createInventoryItemCommandValidator,
  createStorageLocationCommandValidator,
  createWarehouseCommandValidator,
  updateInventoryItemCommandValidator,
} from "../validators/validators.js";
import type { InventoryHandlerDeps } from "./deps.js";
import {
  buildInventoryEvent,
  commandCausationId,
  companyResource,
  loadRecordForAuthorization,
  enqueueDomainEvent,
  newEntityId,
  recordInventoryAudit,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

function mapItemStatus(projection: string): InventoryItemStatus {
  const known: InventoryItemStatus[] = [
    "draft",
    "active",
    "inactive",
    "discontinued",
    "archived",
  ];
  return (known.includes(projection as InventoryItemStatus)
    ? projection
    : "draft") as InventoryItemStatus;
}

function mapWarehouseStatus(projection: string): WarehouseStatus {
  const known: WarehouseStatus[] = ["draft", "active", "inactive", "closed"];
  return (known.includes(projection as WarehouseStatus)
    ? projection
    : "draft") as WarehouseStatus;
}

export function createCreateInventoryItemHandler(
  deps: InventoryHandlerDeps,
): CommandHandler<CreateInventoryItemPayload, { inventoryItemId: string }> {
  return {
    commandType: InventoryCommandTypes.CreateInventoryItem,
    authorize(command) {
      return companyResource(
        "inventory_item",
        InventoryPolicyActions.ItemCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createInventoryItemCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: InventoryWorkflowCodes.InventoryItem,
        subjectType: InventorySubjectTypes.InventoryItem,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const item: InventoryItem = {
        id,
        companyId: scope.value,
        code: p.code,
        name: p.name,
        skuRef: {
          sku: p.sku,
          productId: p.productId ?? null,
          variantId: p.variantId ?? null,
        },
        status: mapItemStatus(started.value.statusProjection),
        classification: p.classification,
        itemType: p.itemType,
        defaultUnitCode: p.defaultUnitCode ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.items.save(item);
      if (!saved.ok) return saved;

      const event = buildInventoryEvent({
        eventType: InventoryEventTypes.InventoryItemCreated,
        aggregateType: "inventory_item",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { inventoryItemId: id, companyId: scope.value },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordInventoryAudit(deps.audit, ctx, {
        action: InventoryCommandTypes.CreateInventoryItem,
        entityType: "inventory_item",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ inventoryItemId: id });
    },
  };
}

export function createUpdateInventoryItemHandler(
  deps: InventoryHandlerDeps,
): CommandHandler<UpdateInventoryItemPayload, { inventoryItemId: string }> {
  return {
    commandType: InventoryCommandTypes.UpdateInventoryItem,
    authorize(command) {
      return companyResource(
        "inventory_item",
        InventoryPolicyActions.ItemUpdate,
        command.payload.companyId,
        command.payload.inventoryItemId,
      );
    },
    validate() {
      return updateInventoryItemCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.items.findById({
        companyId: scope.value,
        id: command.payload.inventoryItemId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Inventory item not found", {
            code: "inventory_item_not_found",
          }),
        );
      }

      const p = command.payload;
      let status = existing.value.status;

      if (p.transitionCode && p.workflowInstanceId) {
        const wf = workflowOrFail(ctx);
        if (!wf.ok) return wf;
        const transitioned = await wf.value.transition({
          instanceId: p.workflowInstanceId,
          transitionCode: p.transitionCode,
          actorUserId: ctx.userId,
        });
        if (!transitioned.ok) return transitioned;
        status = mapItemStatus(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const updated: InventoryItem = {
        ...existing.value,
        code: p.code ?? existing.value.code,
        name: p.name ?? existing.value.name,
        skuRef: {
          sku: p.sku ?? existing.value.skuRef.sku,
          productId:
            p.productId !== undefined
              ? p.productId
              : existing.value.skuRef.productId,
          variantId:
            p.variantId !== undefined
              ? p.variantId
              : existing.value.skuRef.variantId,
        },
        classification: p.classification ?? existing.value.classification,
        itemType: p.itemType ?? existing.value.itemType,
        defaultUnitCode:
          p.defaultUnitCode !== undefined
            ? p.defaultUnitCode
            : existing.value.defaultUnitCode,
        status,
        updatedAt: now,
      };

      const saved = await deps.items.save(updated);
      if (!saved.ok) return saved;

      await recordInventoryAudit(deps.audit, ctx, {
        action: InventoryCommandTypes.UpdateInventoryItem,
        entityType: "inventory_item",
        entityId: updated.id,
        outcome: "success",
        details: { transitionCode: p.transitionCode ?? null },
      });

      return ok({ inventoryItemId: updated.id });
    },
  };
}

export function createCreateWarehouseHandler(
  deps: InventoryHandlerDeps,
): CommandHandler<CreateWarehousePayload, { warehouseId: string }> {
  return {
    commandType: InventoryCommandTypes.CreateWarehouse,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "warehouse",
        InventoryPolicyActions.WarehouseCreate,
        p.companyId,
        null,
        {
          branchId: p.branchId ?? null,
          attributes: { addressId: p.addressId ?? null },
        },
      );
    },
    validate() {
      return createWarehouseCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: InventoryWorkflowCodes.Warehouse,
        subjectType: InventorySubjectTypes.Warehouse,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const warehouse: Warehouse = {
        id,
        companyId: scope.value,
        code: p.code,
        name: p.name,
        warehouseType: p.warehouseType,
        status: mapWarehouseStatus(started.value.statusProjection),
        branchId: p.branchId ?? null,
        addressId: p.addressId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.warehouses.save(warehouse);
      if (!saved.ok) return saved;

      const event = buildInventoryEvent({
        eventType: InventoryEventTypes.WarehouseCreated,
        aggregateType: "warehouse",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { warehouseId: id, companyId: scope.value },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordInventoryAudit(deps.audit, ctx, {
        action: InventoryCommandTypes.CreateWarehouse,
        entityType: "warehouse",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ warehouseId: id });
    },
  };
}

export function createCreateStorageLocationHandler(
  deps: InventoryHandlerDeps,
): CommandHandler<CreateStorageLocationPayload, { locationId: string }> {
  return {
    commandType: InventoryCommandTypes.CreateStorageLocation,
    async authorize(command) {
      const p = command.payload;
      const warehouse = await loadRecordForAuthorization(() =>
        deps.warehouses.findById({ companyId: p.companyId, id: p.warehouseId }),
      );
      return companyResource(
        "storage_location",
        InventoryPolicyActions.LocationCreate,
        p.companyId,
        null,
        {
          branchId: warehouse?.branchId ?? null,
          attributes: {
            warehouseId: p.warehouseId,
            parentId: p.parentId ?? null,
          },
        },
      );
    },
    validate() {
      return createStorageLocationCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const warehouse = await deps.warehouses.findById({
        companyId: scope.value,
        id: command.payload.warehouseId,
      });
      if (!warehouse.ok) return warehouse;
      if (!warehouse.value) {
        return fail(
          new NotFoundError("Warehouse not found", {
            code: "warehouse_not_found",
          }),
        );
      }

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const location: StorageLocation = {
        id,
        companyId: scope.value,
        warehouseId: p.warehouseId,
        parentId: p.parentId ?? null,
        kind: p.kind,
        code: p.code,
        name: p.name,
        status: "active",
        path: p.path,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.locations.save(location);
      if (!saved.ok) return saved;

      await recordInventoryAudit(deps.audit, ctx, {
        action: InventoryCommandTypes.CreateStorageLocation,
        entityType: "storage_location",
        entityId: id,
        outcome: "success",
        details: { warehouseId: p.warehouseId },
      });

      return ok({ locationId: id });
    },
  };
}
