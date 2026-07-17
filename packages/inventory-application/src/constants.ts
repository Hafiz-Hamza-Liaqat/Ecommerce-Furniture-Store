/**
 * Inventory application constants.
 */

export const InventoryCommandTypes = {
  CreateInventoryItem: "inventory.CreateInventoryItem",
  UpdateInventoryItem: "inventory.UpdateInventoryItem",
  CreateWarehouse: "inventory.CreateWarehouse",
  CreateStorageLocation: "inventory.CreateStorageLocation",
  ReceiveStock: "inventory.ReceiveStock",
  AdjustStock: "inventory.AdjustStock",
  ReserveStock: "inventory.ReserveStock",
  ReleaseReservation: "inventory.ReleaseReservation",
  TransferStock: "inventory.TransferStock",
} as const;

export const InventoryQueryTypes = {
  GetInventoryItem: "inventory.GetInventoryItem",
  GetWarehouse: "inventory.GetWarehouse",
  GetStock: "inventory.GetStock",
  GetStockLedger: "inventory.GetStockLedger",
  GetBatch: "inventory.GetBatch",
  GetLot: "inventory.GetLot",
  GetSerial: "inventory.GetSerial",
  GetInventorySummary: "inventory.GetInventorySummary",
} as const;

export const InventoryWorkflowCodes = {
  InventoryItem: "inventory_item_v1",
  Warehouse: "inventory_warehouse_v1",
  StockTransfer: "inventory_stock_transfer_v1",
} as const;

export const InventorySubjectTypes = {
  InventoryItem: "inventory.item",
  Warehouse: "inventory.warehouse",
  StorageLocation: "inventory.storage_location",
  StockMovement: "inventory.movement",
} as const;

/** Rules remain external — reservation, allocation, valuation, reorder, costing */
export const InventoryRuleSetCodes = {
  ReservationPolicy: "inventory.reservation_policy",
  AllocationStrategy: "inventory.allocation_strategy",
  ReorderLogic: "inventory.reorder_logic",
  Costing: "inventory.costing",
  Valuation: "inventory.valuation",
  AdjustmentPolicy: "inventory.adjustment_policy",
  TransferPolicy: "inventory.transfer_policy",
} as const;

/**
 * Canonical RC5 permission codes (`<module>.<resource>.<action>`), normalized
 * from legacy executable keys in RC5.3 per the frozen RC5.1 mapping. The seed
 * keeps granting the legacy compatibility codes as the documented overlap
 * window for rollback.
 */
export const InventoryPolicyActions = {
  ItemCreate: "inventory.items.create",
  ItemUpdate: "inventory.items.update",
  ItemRead: "inventory.items.read",
  WarehouseCreate: "inventory.warehouses.create",
  WarehouseRead: "inventory.warehouses.read",
  LocationCreate: "inventory.locations.create",
  StockReceive: "inventory.stock.receive",
  StockAdjust: "inventory.stock.adjust",
  StockReserve: "inventory.stock.reserve",
  StockRelease: "inventory.stock.release",
  StockTransfer: "inventory.stock.transfer",
  StockRead: "inventory.stock.read",
  LedgerRead: "inventory.ledger.read",
  BatchRead: "inventory.batches.read",
  LotRead: "inventory.lots.read",
  SerialRead: "inventory.serials.read",
  SummaryRead: "inventory.summary.read",
} as const;

export const InventoryApprovalTypes = {
  StockAdjustment: "inventory.stock_adjustment",
  StockTransfer: "inventory.stock_transfer",
} as const;
