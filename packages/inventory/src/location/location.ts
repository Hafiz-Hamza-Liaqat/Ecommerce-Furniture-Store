/**
 * Storage location hierarchy — no picking logic.
 */

export type StorageLocationKind =
  | "zone"
  | "aisle"
  | "rack"
  | "shelf"
  | "bin"
  | "other";

export type StorageLocationStatus = "active" | "inactive" | "blocked";

/**
 * Hierarchical storage node under a warehouse.
 * parentId null = top-level (typically a zone).
 */
export type StorageLocation = {
  readonly id: string;
  readonly companyId: string;
  readonly warehouseId: string;
  readonly parentId: string | null;
  readonly kind: StorageLocationKind;
  readonly code: string;
  readonly name: string;
  readonly status: StorageLocationStatus;
  readonly path: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};
