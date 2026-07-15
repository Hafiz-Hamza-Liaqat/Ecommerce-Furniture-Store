import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  PurchaseOrderRepository,
  PurchaseRequisitionRepository,
  SupplierRepository,
} from "@afh/procurement";

export type ProcurementHandlerDeps = {
  readonly suppliers: SupplierRepository;
  readonly requisitions: PurchaseRequisitionRepository;
  readonly purchaseOrders: PurchaseOrderRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
};
