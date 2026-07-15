/**
 * Campaign models — no execution engine.
 */

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type CampaignAudienceReference = {
  readonly audienceId: string;
  readonly code: string | null;
  readonly name: string | null;
};

export type Campaign = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly name: string;
  readonly status: CampaignStatus;
  readonly audience: CampaignAudienceReference | null;
  readonly startAt: string | null;
  readonly endAt: string | null;
  readonly ownerUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CampaignReference = {
  readonly campaignId: string;
  readonly companyId: string;
  readonly code: string | null;
};
