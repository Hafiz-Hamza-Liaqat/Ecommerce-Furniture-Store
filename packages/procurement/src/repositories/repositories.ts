/**
 * Procurement repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { Supplier } from "../supplier/supplier.js";
import type {
  PurchaseRequisition,
  RequisitionLine,
} from "../requisition/requisition.js";
import type {
  PurchaseOrder,
  PurchaseOrderLine,
} from "../purchase-order/purchase-order.js";

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

export interface SupplierRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Supplier | null, PlatformError>>;
  save(supplier: Supplier): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Supplier>, PlatformError>>;
}

export interface PurchaseRequisitionRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<PurchaseRequisition | null, PlatformError>>;
  save(
    requisition: PurchaseRequisition,
  ): Promise<Result<void, PlatformError>>;
  saveLine(line: RequisitionLine): Promise<Result<void, PlatformError>>;
  listLines(
    companyId: string,
    requisitionId: string,
  ): Promise<Result<readonly RequisitionLine[], PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<PurchaseRequisition>, PlatformError>>;
}

export interface PurchaseOrderRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<PurchaseOrder | null, PlatformError>>;
  save(order: PurchaseOrder): Promise<Result<void, PlatformError>>;
  saveLine(line: PurchaseOrderLine): Promise<Result<void, PlatformError>>;
  listLines(
    companyId: string,
    purchaseOrderId: string,
  ): Promise<Result<readonly PurchaseOrderLine[], PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<PurchaseOrder>, PlatformError>>;
}
