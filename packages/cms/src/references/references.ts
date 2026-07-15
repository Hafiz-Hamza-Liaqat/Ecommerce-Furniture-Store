/**
 * Cross-domain references — no ownership transfer.
 */

export type CmsAssetReference = {
  readonly assetId: string;
  readonly companyId: string | null;
  readonly contentId: string | null;
  readonly purpose: string | null;
};

export type CmsUserReference = {
  readonly userId: string;
  readonly companyId: string | null;
};

export type CmsOrganizationReference = {
  readonly organizationId: string;
  readonly companyId: string;
};

export type CmsNotificationReference = {
  readonly notificationId: string;
  readonly companyId: string | null;
};

export type CmsReportReference = {
  readonly reportDefinitionId: string;
  readonly companyId: string | null;
};

export type CmsSearchIndexReference = {
  readonly indexCode: string;
  readonly documentId: string | null;
};
