import type { ProductionOrderRepository } from "@afh/manufacturing";
import type { SecurityAuditService } from "@afh/identity";

export type ManufacturingHandlerDeps = {
  readonly productionOrders: ProductionOrderRepository;
  readonly audit: SecurityAuditService;
};
