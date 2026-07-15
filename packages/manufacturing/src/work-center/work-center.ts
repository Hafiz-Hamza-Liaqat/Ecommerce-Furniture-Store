/**
 * Work center — models only. No scheduling engine.
 */

export type WorkCenterType =
  | "machine"
  | "assembly"
  | "finishing"
  | "qc"
  | "other";

export type WorkCenterStatus = "active" | "inactive" | "maintenance";

export type WorkCenter = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly workCenterType: WorkCenterType;
  readonly status: WorkCenterStatus;
  readonly warehouseId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WorkCenterReference = {
  readonly workCenterId: string;
  readonly companyId: string;
  readonly code: string | null;
};
