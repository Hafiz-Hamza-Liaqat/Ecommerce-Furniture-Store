/**
 * Cross-domain references — no ownership transfer.
 */

export type CrmSalesOrderReference = {
  readonly salesOrderId: string;
  readonly companyId: string;
};

export type CrmQuoteReference = {
  readonly quoteId: string;
  readonly companyId: string;
};

export type CrmProjectReference = {
  readonly projectId: string;
  readonly companyId: string;
};

export type CrmDocumentReference = {
  readonly assetId: string;
  readonly companyId: string;
  readonly subjectType: "lead" | "contact" | "account" | "campaign" | "other";
  readonly subjectId: string;
  readonly purpose: string | null;
};

export type CrmIdentityUserReference = {
  readonly userId: string;
  readonly companyId: string;
};

export type CrmIdentityOrganizationReference = {
  readonly organizationId: string;
  readonly companyId: string;
};

export type CrmNotificationReference = {
  readonly notificationId: string;
  readonly companyId: string | null;
};

export type CrmReportReference = {
  readonly reportDefinitionId: string;
  readonly companyId: string | null;
};
