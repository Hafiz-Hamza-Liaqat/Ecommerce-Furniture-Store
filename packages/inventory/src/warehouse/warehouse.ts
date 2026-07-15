/**
 * Warehouse foundation — no warehouse operations.
 */

export type WarehouseType =
  | "central"
  | "branch"
  | "showroom"
  | "workshop"
  | "virtual"
  | "partner"
  | "other";

export type WarehouseStatus = "draft" | "active" | "inactive" | "closed";

export type Warehouse = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly warehouseType: WarehouseType;
  readonly status: WarehouseStatus;
  /** Optional branch / site reference */
  readonly branchId: string | null;
  readonly addressId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Opaque warehouse pointer used by other domains */
export type WarehouseReference = {
  readonly warehouseId: string;
  readonly companyId: string;
  readonly code: string | null;
};
