/**
 * Manufacturing application queries — no transport DTOs.
 */

import type { ProductionOrder } from "@afh/manufacturing";
import type { ListQueryRequest } from "@afh/shared-kernel";

export type GetProductionOrderPayload = {
  readonly companyId: string;
  readonly productionOrderId: string;
};

export type ListProductionOrderPayload = ListQueryRequest;

export type GetProductionOrderResult = {
  readonly productionOrder: ProductionOrder;
};
