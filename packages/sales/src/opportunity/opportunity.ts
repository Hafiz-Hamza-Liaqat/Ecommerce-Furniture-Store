/**
 * Sales opportunity — models only.
 * Status is metadata; Workflow remains lifecycle SSoT.
 */

export type OpportunityStatus =
  | "open"
  | "qualified"
  | "proposal"
  | "won"
  | "lost"
  | "cancelled";

export type OpportunitySource =
  | "inbound"
  | "outbound"
  | "referral"
  | "partner"
  | "walk_in"
  | "web"
  | "other";

export type Opportunity = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly title: string;
  readonly status: OpportunityStatus;
  readonly source: OpportunitySource | null;
  readonly customerId: string | null;
  readonly organizationId: string | null;
  readonly salesRepUserId: string | null;
  readonly territoryId: string | null;
  readonly projectId: string | null;
  readonly estimatedValueRef: string | null;
  readonly currencyCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type OpportunityReference = {
  readonly opportunityId: string;
  readonly companyId: string;
  readonly code: string | null;
};
