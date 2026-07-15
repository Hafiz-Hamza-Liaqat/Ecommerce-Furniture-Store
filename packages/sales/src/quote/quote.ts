/**
 * Quotation models — no pricing, tax, or discount calculations.
 * Status is metadata; Workflow remains lifecycle SSoT.
 */

import type {
  DiscountReference,
  PriceReference,
  TaxReference,
} from "@afh/commerce";

export type QuoteStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "expired"
  | "converted"
  | "cancelled";

export type QuoteTerms = {
  readonly paymentTerms: string | null;
  readonly deliveryTerms: string | null;
  readonly validityDays: number | null;
  readonly notes: string | null;
};

export type Quote = {
  readonly id: string;
  readonly companyId: string;
  readonly number: string;
  readonly status: QuoteStatus;
  readonly customerId: string | null;
  readonly organizationId: string | null;
  readonly opportunityId: string | null;
  readonly projectId: string | null;
  readonly salesRepUserId: string | null;
  readonly currencyCode: string;
  readonly currentRevisionId: string | null;
  readonly terms: QuoteTerms | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type QuoteLine = {
  readonly id: string;
  readonly quoteId: string;
  readonly revisionId: string;
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

export type QuoteRevision = {
  readonly id: string;
  readonly quoteId: string;
  readonly companyId: string;
  readonly revisionNumber: number;
  readonly createdByUserId: string | null;
  readonly createdAt: string;
  readonly notes: string | null;
};

export type QuoteReference = {
  readonly quoteId: string;
  readonly companyId: string;
  readonly number: string | null;
};
