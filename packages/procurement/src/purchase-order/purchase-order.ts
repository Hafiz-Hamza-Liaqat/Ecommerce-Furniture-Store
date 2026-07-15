/**
 * Purchase order — models only. No purchasing engine.
 * Status is metadata; Workflow owns lifecycle.
 */

import type {
  DiscountReference,
  PriceReference,
  TaxReference,
} from "@afh/commerce";

export type PurchaseOrderStatus =
  | "draft"
  | "issued"
  | "partially_received"
  | "received"
  | "closed"
  | "cancelled";

export type DeliveryTermsReference = {
  readonly termsCode: string | null;
  readonly notes: string | null;
  readonly expectedDeliveryAt: string | null;
};

export type PurchaseOrder = {
  readonly id: string;
  readonly companyId: string;
  readonly number: string;
  readonly status: PurchaseOrderStatus;
  readonly supplierId: string;
  readonly requisitionId: string | null;
  readonly projectId: string | null;
  readonly warehouseId: string | null;
  readonly currencyCode: string;
  readonly deliveryTerms: DeliveryTermsReference | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type PurchaseOrderLine = {
  readonly id: string;
  readonly purchaseOrderId: string;
  readonly companyId: string;
  readonly lineNumber: number;
  readonly productId: string | null;
  readonly variantId: string | null;
  readonly inventoryItemId: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unitCode: string | null;
  readonly priceRef: PriceReference | null;
  readonly discountRef: DiscountReference | null;
  readonly taxRef: TaxReference | null;
};

export type PurchaseOrderReference = {
  readonly purchaseOrderId: string;
  readonly companyId: string;
  readonly number: string | null;
};
