/**
 * Cross-domain references — no ownership transfer.
 */

export type ManufacturingInventoryItemReference = {
  readonly inventoryItemId: string;
  readonly companyId: string;
  readonly sku: string | null;
};

export type ManufacturingWarehouseReference = {
  readonly warehouseId: string;
  readonly companyId: string;
};

export type ManufacturingProjectReference = {
  readonly projectId: string;
  readonly companyId: string;
};

/** Finance owns costing / accounting — opaque refs only */
export type ManufacturingCostSheetReference = {
  readonly costSheetId: string;
  readonly companyId: string;
  readonly productionOrderId: string | null;
};

export type ManufacturingDocumentReference = {
  readonly assetId: string;
  readonly companyId: string;
  readonly subjectType:
    | "bom"
    | "production_order"
    | "routing"
    | "work_center"
    | "other";
  readonly subjectId: string;
  readonly purpose: string | null;
};

export type ManufacturingServiceRequestReference = {
  readonly serviceRequestId: string;
  readonly companyId: string;
};

export type ManufacturingPurchaseOrderReference = {
  readonly purchaseOrderId: string;
  readonly companyId: string;
};

export type ManufacturingSalesOrderReference = {
  readonly salesOrderId: string;
  readonly companyId: string;
};
