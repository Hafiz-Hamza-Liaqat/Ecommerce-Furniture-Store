/**
 * Work order — status is metadata only. No dispatch/assignment engines.
 */

export type WorkOrderStatus =
  | "draft"
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type WorkTypeReference = {
  readonly workTypeId: string;
  readonly code: string | null;
  readonly name: string | null;
};

export type WorkOrder = {
  readonly id: string;
  readonly companyId: string;
  readonly number: string;
  readonly status: WorkOrderStatus;
  readonly serviceRequestId: string | null;
  readonly workType: WorkTypeReference | null;
  readonly projectId: string | null;
  readonly siteAddressId: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WorkOrderLine = {
  readonly id: string;
  readonly workOrderId: string;
  readonly companyId: string;
  readonly lineNumber: number;
  readonly description: string;
  readonly inventoryItemId: string | null;
  readonly quantity: number | null;
  readonly unitCode: string | null;
};

export type WorkOrderReference = {
  readonly workOrderId: string;
  readonly companyId: string;
  readonly number: string | null;
};
