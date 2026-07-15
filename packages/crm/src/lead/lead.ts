/**
 * Lead models — status is metadata only. Workflow owns lifecycle.
 * No lead scoring or routing.
 */

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "unqualified"
  | "converted"
  | "archived";

export type LeadClassification =
  | "hot"
  | "warm"
  | "cold"
  | "partner"
  | "other";

export type LeadSourceReference = {
  readonly sourceId: string;
  readonly code: string | null;
  readonly name: string | null;
};

export type Lead = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly title: string | null;
  readonly status: LeadStatus;
  readonly classification: LeadClassification | null;
  readonly source: LeadSourceReference | null;
  readonly contactId: string | null;
  readonly accountId: string | null;
  readonly ownerUserId: string | null;
  readonly salesCustomerId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type LeadReference = {
  readonly leadId: string;
  readonly companyId: string;
  readonly code: string | null;
};
