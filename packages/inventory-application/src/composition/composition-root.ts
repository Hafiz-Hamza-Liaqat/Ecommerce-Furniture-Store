/**
 * Inventory application composition root.
 * Registers handlers into the Phase 5B HandlerRegistry. No HTTP/APIs.
 */

import { HandlerRegistry } from "@afh/application";
import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  BatchRepository,
  InventoryRepository,
  LedgerRepository,
  MovementRepository,
  SerialNumberRepository,
  StockRepository,
  StorageLocationRepository,
  WarehouseRepository,
} from "@afh/inventory";
import {
  createAdjustStockHandler,
  createCreateInventoryItemHandler,
  createCreateStorageLocationHandler,
  createCreateWarehouseHandler,
  createGetBatchHandler,
  createGetInventoryItemHandler,
  createGetInventorySummaryHandler,
  createGetLotHandler,
  createGetSerialHandler,
  createGetStockHandler,
  createGetStockLedgerHandler,
  createGetWarehouseHandler,
  createReceiveStockHandler,
  createReleaseReservationHandler,
  createReserveStockHandler,
  createTransferStockHandler,
  createUpdateInventoryItemHandler,
} from "../handlers/index.js";
import type { InventoryHandlerDeps } from "../handlers/deps.js";

export type CreateInventoryApplicationOptions = {
  readonly items: InventoryRepository;
  readonly warehouses: WarehouseRepository;
  readonly locations: StorageLocationRepository;
  readonly stock: StockRepository;
  readonly movements: MovementRepository;
  readonly ledger: LedgerRepository;
  readonly batches: BatchRepository;
  readonly serials: SerialNumberRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type InventoryApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: InventoryHandlerDeps;
};

/**
 * Wires Inventory command/query handlers into a HandlerRegistry.
 * Host then passes `handlers` to `createApplicationRuntime({ handlers, ... })`.
 */
export function createInventoryApplication(
  options: CreateInventoryApplicationOptions,
): InventoryApplication {
  const deps: InventoryHandlerDeps = {
    items: options.items,
    warehouses: options.warehouses,
    locations: options.locations,
    stock: options.stock,
    movements: options.movements,
    ledger: options.ledger,
    batches: options.batches,
    serials: options.serials,
    outbox: options.outbox,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();

  handlers.registerCommand(createCreateInventoryItemHandler(deps));
  handlers.registerCommand(createUpdateInventoryItemHandler(deps));
  handlers.registerCommand(createCreateWarehouseHandler(deps));
  handlers.registerCommand(createCreateStorageLocationHandler(deps));
  handlers.registerCommand(createReceiveStockHandler(deps));
  handlers.registerCommand(createAdjustStockHandler(deps));
  handlers.registerCommand(createReserveStockHandler(deps));
  handlers.registerCommand(createReleaseReservationHandler(deps));
  handlers.registerCommand(createTransferStockHandler(deps));

  handlers.registerQuery(createGetInventoryItemHandler(deps));
  handlers.registerQuery(createGetWarehouseHandler(deps));
  handlers.registerQuery(createGetStockHandler(deps));
  handlers.registerQuery(createGetStockLedgerHandler(deps));
  handlers.registerQuery(createGetBatchHandler(deps));
  handlers.registerQuery(createGetLotHandler(deps));
  handlers.registerQuery(createGetSerialHandler(deps));
  handlers.registerQuery(createGetInventorySummaryHandler(deps));

  return { handlers, deps };
}
