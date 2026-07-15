/**
 * Batch & lot foundation — no FEFO/FIFO algorithms.
 */

export type BatchStatus = "open" | "closed" | "quarantine" | "expired";

export type LotStatus = "active" | "consumed" | "quarantine" | "expired";

export type Batch = {
  readonly id: string;
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly code: string;
  readonly status: BatchStatus;
  /** Manufacturing / production batch reference (opaque) */
  readonly manufacturingBatchRef: string | null;
  readonly productionDate: string | null;
  readonly expirationDate: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type Lot = {
  readonly id: string;
  readonly companyId: string;
  readonly inventoryItemId: string;
  readonly batchId: string | null;
  readonly code: string;
  readonly status: LotStatus;
  readonly productionDate: string | null;
  readonly expirationDate: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};
