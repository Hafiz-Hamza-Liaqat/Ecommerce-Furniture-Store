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

export type InventoryHandlerDeps = {
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
};
