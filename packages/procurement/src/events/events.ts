/**
 * Procurement domain event contracts — no publishers, consumers, or Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type PurchaseRequisitionCreatedPayload = {
  readonly requisitionId: string;
  readonly companyId: string;
};

export type PurchaseOrderCreatedPayload = {
  readonly purchaseOrderId: string;
  readonly companyId: string;
  readonly supplierId: string;
};

export type PurchaseOrderIssuedPayload = {
  readonly purchaseOrderId: string;
  readonly companyId: string;
};

export type GoodsReceiptLinkedPayload = {
  readonly purchaseOrderId: string;
  readonly goodsReceiptId: string;
  readonly companyId: string;
};

export type SupplierInvoiceLinkedPayload = {
  readonly purchaseOrderId: string | null;
  readonly invoiceId: string;
  readonly companyId: string;
};

export const ProcurementEventTypes = {
  PurchaseRequisitionCreated: "procurement.requisition.created",
  PurchaseOrderCreated: "procurement.purchase_order.created",
  PurchaseOrderIssued: "procurement.purchase_order.issued",
  GoodsReceiptLinked: "procurement.goods_receipt.linked",
  SupplierInvoiceLinked: "procurement.supplier_invoice.linked",
} as const;

export type ProcurementEventType =
  (typeof ProcurementEventTypes)[keyof typeof ProcurementEventTypes];

export type ProcurementDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: ProcurementEventType | string;
  };
};

export type PurchaseRequisitionCreatedEvent =
  ProcurementDomainEvent<PurchaseRequisitionCreatedPayload>;
export type PurchaseOrderCreatedEvent =
  ProcurementDomainEvent<PurchaseOrderCreatedPayload>;
export type PurchaseOrderIssuedEvent =
  ProcurementDomainEvent<PurchaseOrderIssuedPayload>;
export type GoodsReceiptLinkedEvent =
  ProcurementDomainEvent<GoodsReceiptLinkedPayload>;
export type SupplierInvoiceLinkedEvent =
  ProcurementDomainEvent<SupplierInvoiceLinkedPayload>;
