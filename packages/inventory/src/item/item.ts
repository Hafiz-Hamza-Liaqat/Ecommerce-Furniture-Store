/**
 * Inventory item foundation — no stock calculations.
 */

export type InventoryItemStatus =
  | "draft"
  | "active"
  | "inactive"
  | "discontinued"
  | "archived";

export type InventoryClassification =
  | "finished_good"
  | "raw_material"
  | "component"
  | "consumable"
  | "tooling"
  | "other";

export type InventoryItemType =
  | "stocked"
  | "non_stocked"
  | "serialized"
  | "batch_tracked"
  | "service_linked";

export type SkuReference = {
  readonly sku: string;
  readonly productId: string | null;
  readonly variantId: string | null;
};

export type InventoryItem = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly skuRef: SkuReference;
  readonly status: InventoryItemStatus;
  readonly classification: InventoryClassification;
  readonly itemType: InventoryItemType;
  readonly defaultUnitCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};
