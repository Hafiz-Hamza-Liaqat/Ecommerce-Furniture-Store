/**
 * Purchase requisition — models only.
 * Status is metadata; Workflow owns lifecycle.
 */

export type PurchaseRequisitionStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "converted"
  | "cancelled";

export type PurchaseRequisition = {
  readonly id: string;
  readonly companyId: string;
  readonly number: string;
  readonly status: PurchaseRequisitionStatus;
  readonly requestedByUserId: string | null;
  readonly projectId: string | null;
  readonly warehouseId: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type RequisitionLine = {
  readonly id: string;
  readonly requisitionId: string;
  readonly companyId: string;
  readonly lineNumber: number;
  readonly productId: string | null;
  readonly variantId: string | null;
  readonly inventoryItemId: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unitCode: string | null;
  readonly neededBy: string | null;
};

export type RequisitionReference = {
  readonly requisitionId: string;
  readonly companyId: string;
  readonly number: string | null;
};
