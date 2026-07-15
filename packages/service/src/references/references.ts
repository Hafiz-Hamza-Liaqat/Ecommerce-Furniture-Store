/**
 * Cross-domain references — no ownership transfer.
 */

/** DAM owns digital assets */
export type ServiceAssetReference = {
  readonly assetId: string;
  readonly companyId: string;
};

export type ServiceAttachmentReference = {
  readonly attachmentId: string;
  readonly assetId: string;
  readonly companyId: string;
  readonly subjectType: "service_request" | "work_order" | "appointment" | "other";
  readonly subjectId: string;
};

/** CRM / Commerce own customers — no duplicate customer model */
export type ServiceCustomerReference = {
  readonly customerId: string | null;
  readonly crmContactId: string | null;
  readonly crmAccountId: string | null;
  readonly companyId: string;
};

/** Projects own projects */
export type ServiceProjectReference = {
  readonly projectId: string;
  readonly companyId: string;
};

/** Inventory owns stock — no reservation/movement here */
export type ServiceInventoryItemReference = {
  readonly inventoryItemId: string;
  readonly companyId: string;
  readonly sku: string | null;
};

/** Finance owns invoices / payments */
export type ServiceInvoiceReference = {
  readonly invoiceId: string;
  readonly companyId: string;
  readonly serviceRequestId: string | null;
  readonly workOrderId: string | null;
};

export type ServicePaymentReference = {
  readonly paymentId: string;
  readonly companyId: string;
  readonly invoiceId: string | null;
};
