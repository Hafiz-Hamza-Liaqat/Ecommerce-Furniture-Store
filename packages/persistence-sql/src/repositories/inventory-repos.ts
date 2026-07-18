/**
 * SQL adapters for Inventory domain repositories.
 */

import {
  isOffsetPagination,
  ok,
  type Clock,
  type Page,
  type PageRequest,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type {
  Batch,
  BatchRepository,
  InventoryItem,
  InventoryLedgerEntry,
  InventoryMovement,
  InventoryRepository,
  LedgerRepository,
  Lot,
  MovementRepository,
  SerialNumber,
  SerialNumberRepository,
  StockPosition,
  StockRepository,
  StorageLocation,
  StorageLocationRepository,
  Warehouse,
  WarehouseRepository,
} from "@afh/inventory";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import {
  SqlDocumentRepository,
  type CompanyScopedId,
} from "../mapping/document-repository.js";

type LedgerRow = {
  id: string;
  company_id: string;
  payload_json: string;
  created_at: string;
};

function pageBounds(page?: PageRequest): {
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
} {
  if (page && isOffsetPagination(page)) {
    const pageSize = Math.max(1, page.pageSize);
    const pageNum = Math.max(1, page.page);
    return {
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      page: pageNum,
      pageSize,
    };
  }
  return { limit: 100, offset: 0, page: 1, pageSize: 100 };
}

function toPage<T>(
  items: readonly T[],
  bounds: { page: number; pageSize: number; offset: number },
): Page<T> {
  const slice = items.slice(bounds.offset, bounds.offset + bounds.pageSize);
  return {
    items: slice,
    totalCount: items.length,
    page: bounds.page,
    pageSize: bounds.pageSize,
    nextCursor: null,
    hasMore: bounds.offset + slice.length < items.length,
  };
}

export function createSqlInventoryRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): InventoryRepository {
  const docs = new SqlDocumentRepository<InventoryItem>(
    client,
    "inventory.item",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    remove: (key) => docs.remove(key),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlWarehouseRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): WarehouseRepository {
  const docs = new SqlDocumentRepository<Warehouse>(
    client,
    "inventory.warehouse",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    remove: (key) => docs.remove(key),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlStorageLocationRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): StorageLocationRepository {
  const docs = new SqlDocumentRepository<StorageLocation>(
    client,
    "inventory.storage_location",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (location) => docs.save(location, location.warehouseId),
    listByWarehouse: (companyId, warehouseId, page) =>
      docs.listByParentScoped(companyId, warehouseId, page),
  };
}

export function createSqlStockRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): StockRepository {
  const docs = new SqlDocumentRepository<StockPosition>(
    client,
    "inventory.stock_position",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    findPosition: async (
      companyId,
      inventoryItemId,
      warehouseId,
      locationId,
    ) => {
      const listed = await docs.listByParent(companyId, inventoryItemId);
      if (!listed.ok) return listed;
      const match =
        listed.value.find(
          (p) =>
            p.warehouseId === warehouseId &&
            (p.locationId ?? null) === (locationId ?? null),
        ) ?? null;
      return ok(match);
    },
    save: (position) => docs.save(position, position.inventoryItemId),
    listByItem: (companyId, inventoryItemId, page) =>
      docs.listByParentScoped(companyId, inventoryItemId, page),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlMovementRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): MovementRepository {
  const docs = new SqlDocumentRepository<InventoryMovement>(
    client,
    "inventory.movement",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (movement) => docs.save(movement, movement.inventoryItemId),
    listByItem: (companyId, inventoryItemId, page) =>
      docs.listByParentScoped(companyId, inventoryItemId, page),
  };
}

export function createSqlInventoryLedgerRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): LedgerRepository {
  return {
    findById: async (
      key: CompanyScopedId,
    ): Promise<Result<InventoryLedgerEntry | null, PlatformError>> => {
      const row = client.get<LedgerRow>(
        "SELECT * FROM stock_ledger_entries WHERE id = ? AND company_id = ?",
        [key.id, key.companyId],
      );
      if (!row) return ok(null);
      return ok(JSON.parse(row.payload_json) as InventoryLedgerEntry);
    },
    append: async (entry): Promise<Result<void, PlatformError>> => {
      const now = clock.now().toISOString();
      client.run(
        `INSERT INTO stock_ledger_entries (id, company_id, payload_json, created_at)
         VALUES (?, ?, ?, ?)`,
        [entry.id, entry.companyId, JSON.stringify(entry), now],
      );
      return ok(undefined);
    },
    listByItem: async (
      companyId,
      inventoryItemId,
      page,
    ): Promise<Result<Page<InventoryLedgerEntry>, PlatformError>> => {
      const bounds = pageBounds(page);
      const rows = client.all<LedgerRow>(
        `SELECT * FROM stock_ledger_entries
         WHERE company_id = ?
           AND json_extract(payload_json, '$.inventoryItemId') = ?
         ORDER BY created_at ASC`,
        [companyId, inventoryItemId],
      );
      const items = rows.map(
        (r) => JSON.parse(r.payload_json) as InventoryLedgerEntry,
      );
      return ok(toPage(items, bounds));
    },
  };
}

export function createSqlBatchRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): BatchRepository {
  const batches = new SqlDocumentRepository<Batch>(
    client,
    "inventory.batch",
    clock,
  );
  const lots = new SqlDocumentRepository<Lot>(client, "inventory.lot", clock);
  return {
    findById: (key) => batches.findById(key),
    save: (batch) => batches.save(batch, batch.inventoryItemId),
    findLotById: (key) => lots.findById(key),
    saveLot: (lot) => lots.save(lot, lot.inventoryItemId),
  };
}

export function createSqlSerialNumberRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SerialNumberRepository {
  const docs = new SqlDocumentRepository<SerialNumber>(
    client,
    "inventory.serial_number",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (serial) => docs.save(serial, serial.inventoryItemId),
    findBySerial: async (companyId, inventoryItemId, serial) => {
      const listed = await docs.listByParent(companyId, inventoryItemId);
      if (!listed.ok) return listed;
      return ok(listed.value.find((s) => s.serial === serial) ?? null);
    },
  };
}
