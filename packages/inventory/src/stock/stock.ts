/**
 * Stock abstractions — data models only.
 * No reservation engine. No allocation logic. No quantity math.
 */

export type StockQuantityBucket =
  | "on_hand"
  | "reserved"
  | "available"
  | "damaged"
  | "returned"
  | "in_transit";

/**
 * Snapshot of quantity buckets at a location for an inventory item.
 * Values are stored quantities; computation of available belongs later.
 */
export type StockPosition = {
  readonly id: string;
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly warehouseId: string;
  readonly locationId: string | null;
  readonly unitCode: string | null;
  readonly onHand: number;
  readonly reserved: number;
  readonly available: number;
  readonly damaged: number;
  readonly returned: number;
  readonly inTransit: number;
  readonly batchId: string | null;
  readonly lotId: string | null;
  readonly updatedAt: string;
};
