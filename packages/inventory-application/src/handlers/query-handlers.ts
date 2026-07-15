import type { QueryHandler } from "@afh/application";
import type { PageRequest } from "@afh/shared-kernel";
import { NotFoundError, ValidationError, fail, ok } from "@afh/shared-kernel";
import type {
  Batch,
  InventoryItem,
  InventoryLedgerEntry,
  Lot,
  SerialNumber,
  StockPosition,
  StorageLocation,
  Warehouse,
} from "@afh/inventory";
import {
  InventoryPolicyActions,
  InventoryQueryTypes,
} from "../constants.js";
import type {
  GetBatchPayload,
  GetInventoryItemPayload,
  GetInventorySummaryPayload,
  GetLotPayload,
  GetSerialPayload,
  GetStockLedgerPayload,
  GetStockPayload,
  GetWarehousePayload,
  InventorySummary,
} from "../queries/queries.js";
import {
  getBatchQueryValidator,
  getInventoryItemQueryValidator,
  getInventorySummaryQueryValidator,
  getLotQueryValidator,
  getSerialQueryValidator,
  getStockLedgerQueryValidator,
  getStockQueryValidator,
  getWarehouseQueryValidator,
} from "../validators/validators.js";
import type { InventoryHandlerDeps } from "./deps.js";
import { companyResource, requireCompanyId } from "../support/support.js";

export function createGetInventoryItemHandler(
  deps: InventoryHandlerDeps,
): QueryHandler<GetInventoryItemPayload, InventoryItem> {
  return {
    queryType: InventoryQueryTypes.GetInventoryItem,
    authorize(query) {
      return companyResource(
        "inventory_item",
        InventoryPolicyActions.ItemRead,
        query.payload.companyId,
        query.payload.inventoryItemId,
      );
    },
    validate() {
      return getInventoryItemQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.items.findById({
        companyId: scope.value,
        id: query.payload.inventoryItemId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Inventory item not found", {
            code: "inventory_item_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetWarehouseHandler(
  deps: InventoryHandlerDeps,
): QueryHandler<
  GetWarehousePayload,
  { warehouse: Warehouse; locations: readonly StorageLocation[] }
> {
  return {
    queryType: InventoryQueryTypes.GetWarehouse,
    authorize(query) {
      return companyResource(
        "warehouse",
        InventoryPolicyActions.WarehouseRead,
        query.payload.companyId,
        query.payload.warehouseId,
      );
    },
    validate() {
      return getWarehouseQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.warehouses.findById({
        companyId: scope.value,
        id: query.payload.warehouseId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Warehouse not found", {
            code: "warehouse_not_found",
          }),
        );
      }

      let locations: readonly StorageLocation[] = [];
      if (query.payload.includeLocations !== false) {
        const listed = await deps.locations.listByWarehouse(
          scope.value,
          found.value.id,
        );
        if (!listed.ok) return listed;
        locations = listed.value.items;
      }

      return ok({ warehouse: found.value, locations });
    },
  };
}

export function createGetStockHandler(
  deps: InventoryHandlerDeps,
): QueryHandler<
  GetStockPayload,
  { positions: readonly StockPosition[] }
> {
  return {
    queryType: InventoryQueryTypes.GetStock,
    authorize(query) {
      return companyResource(
        "stock",
        InventoryPolicyActions.StockRead,
        query.payload.companyId,
      );
    },
    validate() {
      return getStockQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const p = query.payload;
      if (p.warehouseId) {
        const found = await deps.stock.findPosition(
          scope.value,
          p.inventoryItemId,
          p.warehouseId,
          p.locationId ?? null,
        );
        if (!found.ok) return found;
        return ok({ positions: found.value ? [found.value] : [] });
      }

      const listed = await deps.stock.listByItem(
        scope.value,
        p.inventoryItemId,
      );
      if (!listed.ok) return listed;
      return ok({ positions: listed.value.items });
    },
  };
}

export function createGetStockLedgerHandler(
  deps: InventoryHandlerDeps,
): QueryHandler<
  GetStockLedgerPayload,
  { entries: readonly InventoryLedgerEntry[] }
> {
  return {
    queryType: InventoryQueryTypes.GetStockLedger,
    authorize(query) {
      return companyResource(
        "ledger",
        InventoryPolicyActions.LedgerRead,
        query.payload.companyId,
      );
    },
    validate() {
      return getStockLedgerQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const page: PageRequest | undefined = query.payload.page;
      const listed = await deps.ledger.listByItem(
        scope.value,
        query.payload.inventoryItemId,
        page,
      );
      if (!listed.ok) return listed;
      return ok({ entries: listed.value.items });
    },
  };
}

export function createGetBatchHandler(
  deps: InventoryHandlerDeps,
): QueryHandler<GetBatchPayload, Batch> {
  return {
    queryType: InventoryQueryTypes.GetBatch,
    authorize(query) {
      return companyResource(
        "batch",
        InventoryPolicyActions.BatchRead,
        query.payload.companyId,
        query.payload.batchId,
      );
    },
    validate() {
      return getBatchQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.batches.findById({
        companyId: scope.value,
        id: query.payload.batchId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Batch not found", { code: "batch_not_found" }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetLotHandler(
  deps: InventoryHandlerDeps,
): QueryHandler<GetLotPayload, Lot> {
  return {
    queryType: InventoryQueryTypes.GetLot,
    authorize(query) {
      return companyResource(
        "lot",
        InventoryPolicyActions.LotRead,
        query.payload.companyId,
        query.payload.lotId,
      );
    },
    validate() {
      return getLotQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.batches.findLotById({
        companyId: scope.value,
        id: query.payload.lotId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Lot not found", { code: "lot_not_found" }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetSerialHandler(
  deps: InventoryHandlerDeps,
): QueryHandler<GetSerialPayload, SerialNumber> {
  return {
    queryType: InventoryQueryTypes.GetSerial,
    authorize(query) {
      return companyResource(
        "serial",
        InventoryPolicyActions.SerialRead,
        query.payload.companyId,
        query.payload.serialNumberId ?? null,
      );
    },
    validate() {
      return getSerialQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const p = query.payload;
      if (p.serialNumberId) {
        const found = await deps.serials.findById({
          companyId: scope.value,
          id: p.serialNumberId,
        });
        if (!found.ok) return found;
        if (!found.value) {
          return fail(
            new NotFoundError("Serial number not found", {
              code: "serial_not_found",
            }),
          );
        }
        return ok(found.value);
      }

      if (!p.inventoryItemId || !p.serial) {
        return fail(
          new ValidationError("inventoryItemId and serial are required", {
            code: "serial_lookup_incomplete",
          }),
        );
      }

      const found = await deps.serials.findBySerial(
        scope.value,
        p.inventoryItemId,
        p.serial,
      );
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Serial number not found", {
            code: "serial_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetInventorySummaryHandler(
  deps: InventoryHandlerDeps,
): QueryHandler<GetInventorySummaryPayload, InventorySummary> {
  return {
    queryType: InventoryQueryTypes.GetInventorySummary,
    authorize(query) {
      return companyResource(
        "inventory",
        InventoryPolicyActions.SummaryRead,
        query.payload.companyId,
      );
    },
    validate() {
      return getInventorySummaryQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const page = { page: 1, pageSize: 500 };
      const items = await deps.items.listByCompany(scope.value, page);
      if (!items.ok) return items;
      const warehouses = await deps.warehouses.listByCompany(
        scope.value,
        page,
      );
      if (!warehouses.ok) return warehouses;

      const warehouseFilter = query.payload.warehouseId ?? null;
      const filteredWarehouses = warehouseFilter
        ? warehouses.value.items.filter((w) => w.id === warehouseFilter)
        : warehouses.value.items;

      // Sample movements from first page of items for open reservations / pending transfers
      const openReservationMovementIds: string[] = [];
      const pendingTransferMovementIds: string[] = [];
      for (const item of items.value.items.slice(0, 50)) {
        const movements = await deps.movements.listByItem(
          scope.value,
          item.id,
          page,
        );
        if (!movements.ok) return movements;
        for (const m of movements.value.items) {
          if (m.kind === "reservation" && m.status !== "cancelled") {
            if (
              !warehouseFilter ||
              m.fromWarehouseId === warehouseFilter ||
              m.toWarehouseId === warehouseFilter
            ) {
              openReservationMovementIds.push(m.id);
            }
          }
          if (m.kind === "transfer" && m.status === "pending") {
            if (
              !warehouseFilter ||
              m.fromWarehouseId === warehouseFilter ||
              m.toWarehouseId === warehouseFilter
            ) {
              pendingTransferMovementIds.push(m.id);
            }
          }
        }
      }

      return ok({
        companyId: scope.value,
        warehouseId: warehouseFilter,
        itemCount: items.value.items.length,
        warehouseCount: filteredWarehouses.length,
        openReservationMovementIds,
        pendingTransferMovementIds,
      });
    },
  };
}
