/**
 * Cross-domain references — Sales does not own these aggregates.
 * Finance owns invoices/payments; Projects owns projects; DAM owns assets.
 */

/** Finance owns invoices — Sales stores references only */
export type SalesInvoiceReference = {
  readonly invoiceId: string;
  readonly companyId: string;
  readonly salesOrderId: string | null;
  readonly number: string | null;
};

/** Finance owns payments — Sales stores references only */
export type SalesPaymentReference = {
  readonly paymentId: string;
  readonly companyId: string;
  readonly salesOrderId: string | null;
  readonly invoiceId: string | null;
};

/** Projects package owns projects */
export type SalesProjectReference = {
  readonly projectId: string;
  readonly companyId: string;
};

/** DAM owns assets — Sales stores asset IDs only */
export type SalesDocumentReference = {
  readonly assetId: string;
  readonly companyId: string;
  readonly subjectType: "opportunity" | "quote" | "sales_order" | "other";
  readonly subjectId: string;
  readonly purpose: string | null;
};
