/**
 * Inventory validation contracts — structural checks only.
 * No stock rules. No reservation rules. No warehouse policies.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { InventoryItem } from "../item/item.js";
import type { Warehouse } from "../warehouse/warehouse.js";
import type { StorageLocation } from "../location/location.js";
import type { StockPosition } from "../stock/stock.js";
import type { InventoryMovement } from "../movement/movement.js";
import type { InventoryLedgerEntry } from "../ledger/ledger.js";
import type { Batch, Lot } from "../batch/batch.js";
import type { SerialNumber } from "../serial/serial.js";

function requireNonEmpty(
  field: string,
  value: string | null | undefined,
): ValidationOutcome | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const inventoryItemStructureValidator: Validator<InventoryItem> = {
  validate(input: InventoryItem): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      requireNonEmpty("skuRef.sku", input.skuRef.sku) ??
      validationOk()
    );
  },
};

export const warehouseStructureValidator: Validator<Warehouse> = {
  validate(input: Warehouse): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const storageLocationStructureValidator: Validator<StorageLocation> = {
  validate(input: StorageLocation): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("warehouseId", input.warehouseId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      requireNonEmpty("path", input.path) ??
      validationOk()
    );
  },
};

export const stockPositionStructureValidator: Validator<StockPosition> = {
  validate(input: StockPosition): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("inventoryItemId", input.inventoryItemId) ??
      requireNonEmpty("warehouseId", input.warehouseId) ??
      validationOk()
    );
  },
};

export const movementStructureValidator: Validator<InventoryMovement> = {
  validate(input: InventoryMovement): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("inventoryItemId", input.inventoryItemId) ??
      validationOk()
    );
  },
};

export const ledgerEntryStructureValidator: Validator<InventoryLedgerEntry> = {
  validate(input: InventoryLedgerEntry): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("inventoryItemId", input.inventoryItemId) ??
      requireNonEmpty("warehouseId", input.warehouseId) ??
      requireNonEmpty("occurredAt", input.occurredAt) ??
      requireNonEmpty("recordedAt", input.recordedAt) ??
      validationOk()
    );
  },
};

export const batchStructureValidator: Validator<Batch> = {
  validate(input: Batch): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("inventoryItemId", input.inventoryItemId) ??
      requireNonEmpty("code", input.code) ??
      validationOk()
    );
  },
};

export const lotStructureValidator: Validator<Lot> = {
  validate(input: Lot): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("inventoryItemId", input.inventoryItemId) ??
      requireNonEmpty("code", input.code) ??
      validationOk()
    );
  },
};

export const serialNumberStructureValidator: Validator<SerialNumber> = {
  validate(input: SerialNumber): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("inventoryItemId", input.inventoryItemId) ??
      requireNonEmpty("serial", input.serial) ??
      validationOk()
    );
  },
};

export type InventoryValidators = {
  readonly inventoryItem: Validator<InventoryItem>;
  readonly warehouse: Validator<Warehouse>;
  readonly storageLocation: Validator<StorageLocation>;
  readonly stockPosition: Validator<StockPosition>;
  readonly movement: Validator<InventoryMovement>;
  readonly ledgerEntry: Validator<InventoryLedgerEntry>;
  readonly batch: Validator<Batch>;
  readonly lot: Validator<Lot>;
  readonly serialNumber: Validator<SerialNumber>;
};

export function createInventoryValidators(): InventoryValidators {
  return {
    inventoryItem: inventoryItemStructureValidator,
    warehouse: warehouseStructureValidator,
    storageLocation: storageLocationStructureValidator,
    stockPosition: stockPositionStructureValidator,
    movement: movementStructureValidator,
    ledgerEntry: ledgerEntryStructureValidator,
    batch: batchStructureValidator,
    lot: lotStructureValidator,
    serialNumber: serialNumberStructureValidator,
  };
}
