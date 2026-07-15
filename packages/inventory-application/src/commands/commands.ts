/**
 * Inventory application commands — intent only.
 */

import type {
  InventoryClassification,
  InventoryItemType,
  StorageLocationKind,
  WarehouseType,
} from "@afh/inventory";
import { InventoryCommandTypes } from "../constants.js";

export type CreateInventoryItemPayload = {
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly sku: string;
  readonly productId?: string | null;
  readonly variantId?: string | null;
  readonly classification: InventoryClassification;
  readonly itemType: InventoryItemType;
  readonly defaultUnitCode?: string | null;
};

export type UpdateInventoryItemPayload = {
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly code?: string | null;
  readonly name?: string | null;
  readonly sku?: string | null;
  readonly productId?: string | null;
  readonly variantId?: string | null;
  readonly classification?: InventoryClassification | null;
  readonly itemType?: InventoryItemType | null;
  readonly defaultUnitCode?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type CreateWarehousePayload = {
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly warehouseType: WarehouseType;
  readonly branchId?: string | null;
  readonly addressId?: string | null;
};

export type CreateStorageLocationPayload = {
  readonly companyId: string;
  readonly warehouseId: string;
  readonly parentId?: string | null;
  readonly kind: StorageLocationKind;
  readonly code: string;
  readonly name: string;
  readonly path: string;
};

export type ReceiveStockPayload = {
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly warehouseId: string;
  readonly locationId?: string | null;
  readonly quantity: number;
  readonly unitCode?: string | null;
  readonly batchId?: string | null;
  readonly lotId?: string | null;
  readonly serialNumberId?: string | null;
  readonly subjectType?: string | null;
  readonly subjectId?: string | null;
  readonly occurredAt?: string | null;
};

export type AdjustStockPayload = {
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly warehouseId: string;
  readonly locationId?: string | null;
  readonly quantityDelta: number;
  readonly unitCode?: string | null;
  readonly bucket?: string | null;
  readonly reason?: string | null;
  readonly batchId?: string | null;
  readonly lotId?: string | null;
  readonly serialNumberId?: string | null;
  readonly subjectType?: string | null;
  readonly subjectId?: string | null;
  readonly requireApproval?: boolean;
};

export type ReserveStockPayload = {
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly warehouseId: string;
  readonly locationId?: string | null;
  readonly quantity: number;
  readonly unitCode?: string | null;
  readonly subjectType: string;
  readonly subjectId: string;
};

export type ReleaseReservationPayload = {
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly warehouseId: string;
  readonly locationId?: string | null;
  readonly quantity: number;
  readonly unitCode?: string | null;
  readonly movementId?: string | null;
  readonly subjectType?: string | null;
  readonly subjectId?: string | null;
};

export type TransferStockPayload = {
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly quantity: number;
  readonly unitCode?: string | null;
  readonly fromWarehouseId: string;
  readonly toWarehouseId: string;
  readonly fromLocationId?: string | null;
  readonly toLocationId?: string | null;
  readonly batchId?: string | null;
  readonly lotId?: string | null;
  readonly serialNumberId?: string | null;
  readonly subjectType?: string | null;
  readonly subjectId?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  readonly requireApproval?: boolean;
};

export { InventoryCommandTypes };
