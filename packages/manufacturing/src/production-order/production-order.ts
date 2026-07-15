/**
 * Production order — status is metadata only. Workflow owns lifecycle.
 * No planning, scheduling, or material allocation.
 */

export type ProductionOrderStatus =
  | "draft"
  | "planned"
  | "released"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ProductionOrder = {
  readonly id: string;
  readonly companyId: string;
  readonly number: string;
  readonly status: ProductionOrderStatus;
  readonly bomId: string | null;
  readonly routingId: string | null;
  readonly finishedInventoryItemId: string | null;
  readonly salesOrderId: string | null;
  readonly salesOrderLineId: string | null;
  readonly projectId: string | null;
  readonly warehouseId: string | null;
  readonly quantity: number | null;
  readonly unitCode: string | null;
  readonly plannedStartAt: string | null;
  readonly plannedEndAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ProductionOrderLine = {
  readonly id: string;
  readonly productionOrderId: string;
  readonly companyId: string;
  readonly lineNumber: number;
  readonly inventoryItemId: string | null;
  readonly description: string;
  readonly quantity: number | null;
  readonly unitCode: string | null;
  readonly bomItemId: string | null;
};

export type ProductionOrderReference = {
  readonly productionOrderId: string;
  readonly companyId: string;
  readonly number: string | null;
};
