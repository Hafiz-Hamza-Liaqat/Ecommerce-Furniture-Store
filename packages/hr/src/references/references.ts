/**
 * Cross-domain references — no ownership transfer.
 */

export type HrIdentityUserReference = {
  readonly userId: string;
  readonly companyId: string;
};

export type HrProjectReference = {
  readonly projectId: string;
  readonly companyId: string;
};

export type HrServiceRequestReference = {
  readonly serviceRequestId: string;
  readonly companyId: string;
};

export type HrProductionOrderReference = {
  readonly productionOrderId: string;
  readonly companyId: string;
};

export type HrCostCenterFinanceReference = {
  readonly costCenterId: string;
  readonly companyId: string;
};

export type HrDocumentReference = {
  readonly assetId: string;
  readonly companyId: string;
  readonly subjectType: "employee" | "certification" | "leave" | "other";
  readonly subjectId: string;
  readonly purpose: string | null;
};

export type HrReportReference = {
  readonly reportDefinitionId: string;
  readonly companyId: string | null;
};
