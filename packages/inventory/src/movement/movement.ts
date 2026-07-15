/**
 * Inventory movement contracts — no execution, no ledger posting.
 */

export type InventoryMovementKind =
  | "receipt"
  | "issue"
  | "transfer"
  | "adjustment"
  | "reservation"
  | "release";

export type InventoryMovementStatus =
  | "draft"
  | "pending"
  | "completed"
  | "cancelled";

export type InventoryMovement = {
  readonly id: string;
  readonly companyId: string;
  readonly kind: InventoryMovementKind;
  readonly status: InventoryMovementStatus;
  readonly inventoryItemId: string;
  readonly quantity: number;
  readonly unitCode: string | null;
  readonly fromWarehouseId: string | null;
  readonly toWarehouseId: string | null;
  readonly fromLocationId: string | null;
  readonly toLocationId: string | null;
  readonly batchId: string | null;
  readonly lotId: string | null;
  readonly serialNumberId: string | null;
  /** External subject (order, GRN, production, etc.) — opaque */
  readonly subjectType: string | null;
  readonly subjectId: string | null;
  readonly correlationId: string | null;
  readonly occurredAt: string;
  readonly createdAt: string;
};
