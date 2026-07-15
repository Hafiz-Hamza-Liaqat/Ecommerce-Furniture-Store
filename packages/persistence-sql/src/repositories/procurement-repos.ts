/**
 * SQL adapters for Procurement domain repositories.
 */

import type { Clock } from "@afh/shared-kernel";
import type {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderRepository,
  PurchaseRequisition,
  PurchaseRequisitionRepository,
  RequisitionLine,
  Supplier,
  SupplierRepository,
} from "@afh/procurement";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlDocumentRepository } from "../mapping/document-repository.js";

export function createSqlSupplierRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SupplierRepository {
  const docs = new SqlDocumentRepository<Supplier>(
    client,
    "procurement.supplier",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlPurchaseRequisitionRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): PurchaseRequisitionRepository {
  const docs = new SqlDocumentRepository<PurchaseRequisition>(
    client,
    "procurement.purchase_requisition",
    clock,
  );
  const lines = new SqlDocumentRepository<RequisitionLine>(
    client,
    "procurement.requisition_line",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveLine: (line) => lines.save(line, line.requisitionId),
    listLines: (companyId, requisitionId) =>
      lines.listByParent(companyId, requisitionId),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlPurchaseOrderRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): PurchaseOrderRepository {
  const docs = new SqlDocumentRepository<PurchaseOrder>(
    client,
    "procurement.purchase_order",
    clock,
  );
  const lines = new SqlDocumentRepository<PurchaseOrderLine>(
    client,
    "procurement.purchase_order_line",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveLine: (line) => lines.save(line, line.purchaseOrderId),
    listLines: (companyId, purchaseOrderId) =>
      lines.listByParent(companyId, purchaseOrderId),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}
