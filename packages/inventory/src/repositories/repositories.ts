/**
 * Inventory repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { InventoryItem } from "../item/item.js";
import type { Warehouse } from "../warehouse/warehouse.js";
import type { StorageLocation } from "../location/location.js";
import type { StockPosition } from "../stock/stock.js";
import type { InventoryMovement } from "../movement/movement.js";
import type { InventoryLedgerEntry } from "../ledger/ledger.js";
import type { Batch, Lot } from "../batch/batch.js";
import type { SerialNumber } from "../serial/serial.js";

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

export interface InventoryRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<InventoryItem | null, PlatformError>>;
  save(item: InventoryItem): Promise<Result<void, PlatformError>>;
  remove(key: CompanyScopedId): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<InventoryItem>, PlatformError>>;
}

export interface WarehouseRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Warehouse | null, PlatformError>>;
  save(warehouse: Warehouse): Promise<Result<void, PlatformError>>;
  remove(key: CompanyScopedId): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Warehouse>, PlatformError>>;
}

export interface StorageLocationRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<StorageLocation | null, PlatformError>>;
  save(location: StorageLocation): Promise<Result<void, PlatformError>>;
  listByWarehouse(
    companyId: string,
    warehouseId: string,
    page?: PageRequest,
  ): Promise<Result<Page<StorageLocation>, PlatformError>>;
}

export interface StockRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<StockPosition | null, PlatformError>>;
  findPosition(
    companyId: string,
    inventoryItemId: string,
    warehouseId: string,
    locationId: string | null,
  ): Promise<Result<StockPosition | null, PlatformError>>;
  save(position: StockPosition): Promise<Result<void, PlatformError>>;
  listByItem(
    companyId: string,
    inventoryItemId: string,
    page?: PageRequest,
  ): Promise<Result<Page<StockPosition>, PlatformError>>;
}

export interface MovementRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<InventoryMovement | null, PlatformError>>;
  save(movement: InventoryMovement): Promise<Result<void, PlatformError>>;
  listByItem(
    companyId: string,
    inventoryItemId: string,
    page?: PageRequest,
  ): Promise<Result<Page<InventoryMovement>, PlatformError>>;
}

export interface LedgerRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<InventoryLedgerEntry | null, PlatformError>>;
  /** Append-only contract — no update/delete in the interface */
  append(entry: InventoryLedgerEntry): Promise<Result<void, PlatformError>>;
  listByItem(
    companyId: string,
    inventoryItemId: string,
    page?: PageRequest,
  ): Promise<Result<Page<InventoryLedgerEntry>, PlatformError>>;
}

export interface BatchRepository {
  findById(key: CompanyScopedId): Promise<Result<Batch | null, PlatformError>>;
  save(batch: Batch): Promise<Result<void, PlatformError>>;
  findLotById(
    key: CompanyScopedId,
  ): Promise<Result<Lot | null, PlatformError>>;
  saveLot(lot: Lot): Promise<Result<void, PlatformError>>;
}

export interface SerialNumberRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<SerialNumber | null, PlatformError>>;
  save(serial: SerialNumber): Promise<Result<void, PlatformError>>;
  findBySerial(
    companyId: string,
    inventoryItemId: string,
    serial: string,
  ): Promise<Result<SerialNumber | null, PlatformError>>;
}
