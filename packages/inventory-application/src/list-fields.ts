/**
 * RC7.2c — Inventory List* sort/filter allow-lists (validators + handlers).
 */

export const INVENTORY_ITEM_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "name",
  "code",
  "status",
]);

export const INVENTORY_ITEM_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "code",
  "name",
  "classification",
  "itemType",
]);

export const WAREHOUSE_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "name",
  "code",
  "status",
]);

export const WAREHOUSE_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "code",
  "name",
  "warehouseType",
  "branchId",
]);

export const STOCK_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "inventoryItemId",
  "warehouseId",
]);

export const STOCK_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "inventoryItemId",
  "warehouseId",
  "locationId",
  "batchId",
  "lotId",
]);
