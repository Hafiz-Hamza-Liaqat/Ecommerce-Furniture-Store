/**
 * Sales order models — status is metadata only.
 * Workflow owns lifecycle. No inventory reservation or payment processing.
 */

import type {
  DiscountReference,
  PriceReference,
  TaxReference,
} from "@afh/commerce";

export type SalesOrderStatus =
  | "draft"
  | "placed"
  | "confirmed"
  | "fulfilling"
  | "completed"
  | "cancelled";

export type SalesOrder = {
  readonly id: string;
  readonly companyId: string;
  readonly number: string;
  readonly status: SalesOrderStatus;
  readonly customerId: string | null;
  readonly organizationId: string | null;
  readonly quoteId: string | null;
  readonly opportunityId: string | null;
  readonly projectId: string | null;
  readonly salesRepUserId: string | null;
  readonly currencyCode: string;
  readonly billingAddressId: string | null;
  readonly shippingAddressId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SalesOrderLine = {
  readonly id: string;
  readonly salesOrderId: string;
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

export type OrderReference = {
  readonly salesOrderId: string;
  readonly companyId: string;
  readonly number: string | null;
};

/** Opaque delivery subject reference — logistics later */
export type DeliveryReference = {
  readonly deliveryId: string;
  readonly companyId: string;
  readonly salesOrderId: string | null;
};
