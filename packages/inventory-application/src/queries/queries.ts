/**
 * Inventory application queries — no transport DTOs.
 */

import type { PageRequest } from "@afh/shared-kernel";
import { InventoryQueryTypes } from "../constants.js";

export type GetInventoryItemPayload = {
  readonly companyId: string;
  readonly inventoryItemId: string;
};

export type GetWarehousePayload = {
  readonly companyId: string;
  readonly warehouseId: string;
  readonly includeLocations?: boolean;
};

export type GetStockPayload = {
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly warehouseId?: string | null;
  readonly locationId?: string | null;
};

export type GetStockLedgerPayload = {
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly page?: PageRequest;
};

export type GetBatchPayload = {
  readonly companyId: string;
  readonly batchId: string;
};

export type GetLotPayload = {
  readonly companyId: string;
  readonly lotId: string;
};

export type GetSerialPayload = {
  readonly companyId: string;
  readonly serialNumberId?: string | null;
  readonly inventoryItemId?: string | null;
  readonly serial?: string | null;
};

export type GetInventorySummaryPayload = {
  readonly companyId: string;
  readonly warehouseId?: string | null;
};

export type InventorySummary = {
  readonly companyId: string;
  readonly warehouseId: string | null;
  readonly itemCount: number;
  readonly warehouseCount: number;
  readonly openReservationMovementIds: readonly string[];
  readonly pendingTransferMovementIds: readonly string[];
};

export { InventoryQueryTypes };
