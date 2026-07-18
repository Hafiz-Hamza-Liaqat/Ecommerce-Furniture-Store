/**
 * Manufacturing application commands — no transport DTOs.
 */

export type CreateProductionOrderPayload = {
  readonly companyId: string;
  readonly number: string;
  readonly quantity?: number | null;
  readonly unitCode?: string | null;
  readonly warehouseId?: string | null;
  readonly finishedInventoryItemId?: string | null;
  readonly salesOrderId?: string | null;
  readonly salesOrderLineId?: string | null;
  readonly projectId?: string | null;
  readonly plannedStartAt?: string | null;
  readonly plannedEndAt?: string | null;
};
