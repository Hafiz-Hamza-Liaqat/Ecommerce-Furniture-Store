/**
 * Resource foundation — references only. No allocation engine.
 */

export type ResourceKind =
  | "human"
  | "equipment"
  | "vehicle"
  | "material"
  | "other";

export type ResourceStatus = "available" | "assigned" | "unavailable" | "retired";

/** Opaque human resource pointer (typically identity employee/user) */
export type HumanResourceReference = {
  readonly resourceId: string;
  readonly companyId: string;
  readonly employeeId: string | null;
  readonly userId: string | null;
  readonly displayName: string | null;
};

export type EquipmentResourceReference = {
  readonly resourceId: string;
  readonly companyId: string;
  readonly assetCode: string | null;
  readonly name: string | null;
};

export type VehicleResourceReference = {
  readonly resourceId: string;
  readonly companyId: string;
  readonly vehicleCode: string | null;
  readonly name: string | null;
};

/** Opaque material / inventory item pointer */
export type MaterialResourceReference = {
  readonly resourceId: string;
  readonly companyId: string;
  readonly inventoryItemId: string | null;
  readonly sku: string | null;
};

export type Resource = {
  readonly id: string;
  readonly companyId: string;
  readonly kind: ResourceKind;
  readonly status: ResourceStatus;
  readonly code: string;
  readonly name: string;
  readonly human: HumanResourceReference | null;
  readonly equipment: EquipmentResourceReference | null;
  readonly vehicle: VehicleResourceReference | null;
  readonly material: MaterialResourceReference | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};
