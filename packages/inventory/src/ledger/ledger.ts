/**
 * Inventory ledger contracts — append-only abstraction shapes.
 * No persistence. No balancing logic. Stock changes must go through ledger
 * in later phases (Architecture Law: stock only via StockLedger).
 */

export type InventoryLedgerEntry = {
  readonly id: string;
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly warehouseId: string;
  readonly locationId: string | null;
  readonly movementId: string | null;
  readonly movementKind: string | null;
  /** Signed quantity change in the item's unit */
  readonly quantityDelta: number;
  readonly unitCode: string | null;
  readonly bucket: string | null;
  readonly batchId: string | null;
  readonly lotId: string | null;
  readonly serialNumberId: string | null;
  readonly occurredAt: string;
  readonly recordedAt: string;
  readonly correlationId: string | null;
  readonly causationId: string | null;
  readonly subjectType: string | null;
  readonly subjectId: string | null;
};
