/**
 * Serial number foundation — no lifecycle processing.
 */

export type SerialNumberStatus =
  | "registered"
  | "available"
  | "assigned"
  | "shipped"
  | "returned"
  | "scrapped"
  | "other";

export type SerialNumber = {
  readonly id: string;
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly serial: string;
  readonly status: SerialNumberStatus;
  readonly warehouseId: string | null;
  readonly locationId: string | null;
  readonly batchId: string | null;
  readonly lotId: string | null;
  /** Opaque assignment subject (order line, asset, etc.) */
  readonly assignedSubjectType: string | null;
  readonly assignedSubjectId: string | null;
  readonly registeredAt: string;
  readonly updatedAt: string;
};
