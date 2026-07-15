/**
 * Inventory application validators — intent only.
 * Reservation/allocation/costing remain in Rules.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type {
  AdjustStockPayload,
  CreateInventoryItemPayload,
  CreateStorageLocationPayload,
  CreateWarehousePayload,
  ReceiveStockPayload,
  ReleaseReservationPayload,
  ReserveStockPayload,
  TransferStockPayload,
  UpdateInventoryItemPayload,
} from "../commands/commands.js";
import type {
  GetBatchPayload,
  GetInventoryItemPayload,
  GetInventorySummaryPayload,
  GetLotPayload,
  GetSerialPayload,
  GetStockLedgerPayload,
  GetStockPayload,
  GetWarehousePayload,
} from "../queries/queries.js";

function requireField(
  field: string,
  value: string | null | undefined,
): ReturnType<typeof validationFail> | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const createInventoryItemCommandValidator: Validator<
  Command<CreateInventoryItemPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("code", p.code) ??
      requireField("name", p.name) ??
      requireField("sku", p.sku) ??
      requireField("classification", p.classification) ??
      requireField("itemType", p.itemType) ??
      validationOk()
    );
  },
};

export const updateInventoryItemCommandValidator: Validator<
  Command<UpdateInventoryItemPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("inventoryItemId", p.inventoryItemId);
    if (base) return base;
    if (p.transitionCode && !p.workflowInstanceId) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message: "workflowInstanceId is required when transitionCode is set",
        },
      ]);
    }
    return validationOk();
  },
};

export const createWarehouseCommandValidator: Validator<
  Command<CreateWarehousePayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("code", p.code) ??
      requireField("name", p.name) ??
      requireField("warehouseType", p.warehouseType) ??
      validationOk()
    );
  },
};

export const createStorageLocationCommandValidator: Validator<
  Command<CreateStorageLocationPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("warehouseId", p.warehouseId) ??
      requireField("kind", p.kind) ??
      requireField("code", p.code) ??
      requireField("name", p.name) ??
      requireField("path", p.path) ??
      validationOk()
    );
  },
};

export const receiveStockCommandValidator: Validator<
  Command<ReceiveStockPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("inventoryItemId", p.inventoryItemId) ??
      requireField("warehouseId", p.warehouseId);
    if (base) return base;
    if (!(p.quantity > 0)) {
      return validationFail([
        {
          field: "quantity",
          code: "invalid",
          message: "quantity must be > 0",
        },
      ]);
    }
    return validationOk();
  },
};

export const adjustStockCommandValidator: Validator<
  Command<AdjustStockPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("inventoryItemId", p.inventoryItemId) ??
      requireField("warehouseId", p.warehouseId);
    if (base) return base;
    if (p.quantityDelta === 0) {
      return validationFail([
        {
          field: "quantityDelta",
          code: "invalid",
          message: "quantityDelta must be non-zero",
        },
      ]);
    }
    return validationOk();
  },
};

export const reserveStockCommandValidator: Validator<
  Command<ReserveStockPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("inventoryItemId", p.inventoryItemId) ??
      requireField("warehouseId", p.warehouseId) ??
      requireField("subjectType", p.subjectType) ??
      requireField("subjectId", p.subjectId);
    if (base) return base;
    if (!(p.quantity > 0)) {
      return validationFail([
        {
          field: "quantity",
          code: "invalid",
          message: "quantity must be > 0",
        },
      ]);
    }
    return validationOk();
  },
};

export const releaseReservationCommandValidator: Validator<
  Command<ReleaseReservationPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("inventoryItemId", p.inventoryItemId) ??
      requireField("warehouseId", p.warehouseId);
    if (base) return base;
    if (!(p.quantity > 0)) {
      return validationFail([
        {
          field: "quantity",
          code: "invalid",
          message: "quantity must be > 0",
        },
      ]);
    }
    return validationOk();
  },
};

export const transferStockCommandValidator: Validator<
  Command<TransferStockPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("inventoryItemId", p.inventoryItemId) ??
      requireField("fromWarehouseId", p.fromWarehouseId) ??
      requireField("toWarehouseId", p.toWarehouseId);
    if (base) return base;
    if (!(p.quantity > 0)) {
      return validationFail([
        {
          field: "quantity",
          code: "invalid",
          message: "quantity must be > 0",
        },
      ]);
    }
    if (p.fromWarehouseId === p.toWarehouseId && p.fromLocationId === p.toLocationId) {
      return validationFail([
        {
          field: "toWarehouseId",
          code: "invalid",
          message: "transfer source and destination must differ",
        },
      ]);
    }
    return validationOk();
  },
};

export const getInventoryItemQueryValidator: Validator<
  Query<GetInventoryItemPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("inventoryItemId", p.inventoryItemId) ??
      validationOk()
    );
  },
};

export const getWarehouseQueryValidator: Validator<Query<GetWarehousePayload>> =
  {
    validate(query) {
      const p = query.payload;
      return (
        requireField("companyId", p.companyId) ??
        requireField("warehouseId", p.warehouseId) ??
        validationOk()
      );
    },
  };

export const getStockQueryValidator: Validator<Query<GetStockPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("inventoryItemId", p.inventoryItemId) ??
      validationOk()
    );
  },
};

export const getStockLedgerQueryValidator: Validator<
  Query<GetStockLedgerPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("inventoryItemId", p.inventoryItemId) ??
      validationOk()
    );
  },
};

export const getBatchQueryValidator: Validator<Query<GetBatchPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("batchId", p.batchId) ??
      validationOk()
    );
  },
};

export const getLotQueryValidator: Validator<Query<GetLotPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("lotId", p.lotId) ??
      validationOk()
    );
  },
};

export const getSerialQueryValidator: Validator<Query<GetSerialPayload>> = {
  validate(query) {
    const p = query.payload;
    const base = requireField("companyId", p.companyId);
    if (base) return base;
    if (!p.serialNumberId && !(p.inventoryItemId && p.serial)) {
      return validationFail([
        {
          field: "serialNumberId",
          code: "required",
          message:
            "serialNumberId or (inventoryItemId + serial) is required",
        },
      ]);
    }
    return validationOk();
  },
};

export const getInventorySummaryQueryValidator: Validator<
  Query<GetInventorySummaryPayload>
> = {
  validate(query) {
    return (
      requireField("companyId", query.payload.companyId) ?? validationOk()
    );
  },
};
