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

export const InventoryPolicyActions = {
  ItemCreate: "inventory.item.create",
  ItemUpdate: "inventory.item.update",
  ItemRead: "inventory.item.read",
  WarehouseCreate: "inventory.warehouse.create",
  WarehouseRead: "inventory.warehouse.read",
  LocationCreate: "inventory.location.create",
  StockReceive: "inventory.stock.receive",
  StockAdjust: "inventory.stock.adjust",
  StockReserve: "inventory.stock.reserve",
  StockRelease: "inventory.stock.release",
  StockTransfer: "inventory.stock.transfer",
  StockRead: "inventory.stock.read",
  LedgerRead: "inventory.ledger.read",
  BatchRead: "inventory.batch.read",
  LotRead: "inventory.lot.read",
  SerialRead: "inventory.serial.read",
  SummaryRead: "inventory.summary.read",
} as const;

export const InventoryApprovalTypes = {
  StockAdjustment: "inventory.stock_adjustment",
  StockTransfer: "inventory.stock_transfer",
} as const;
