/**
 * Cross-domain references — Procurement does not own these aggregates.
 */

/** Inventory owns GRN / stock receipt processing */
export type GoodsReceiptReference = {
  readonly goodsReceiptId: string;
  readonly companyId: string;
  readonly purchaseOrderId: string | null;
  readonly number: string | null;
};

export type ReceiptLineReference = {
  readonly receiptLineId: string;
  readonly goodsReceiptId: string;
  readonly purchaseOrderLineId: string | null;
  readonly quantity: number | null;
};

/** Finance owns supplier invoices */
export type SupplierInvoiceReference = {
  readonly invoiceId: string;
  readonly companyId: string;
  readonly purchaseOrderId: string | null;
  readonly supplierId: string | null;
  readonly number: string | null;
};

/** Finance owns payments */
export type ProcurementPaymentReference = {
  readonly paymentId: string;
  readonly companyId: string;
  readonly purchaseOrderId: string | null;
  readonly invoiceId: string | null;
};

/** Inventory owns warehouses */
export type ProcurementWarehouseReference = {
  readonly warehouseId: string;
  readonly companyId: string;
  readonly code: string | null;
};

/** Projects own projects */
export type ProcurementProjectReference = {
  readonly projectId: string;
  readonly companyId: string;
};

/** DAM owns assets */
export type ProcurementDocumentReference = {
  readonly assetId: string;
  readonly companyId: string;
  readonly subjectType:
    | "supplier"
    | "purchase_requisition"
    | "purchase_order"
    | "other";
  readonly subjectId: string;
  readonly purpose: string | null;
};
