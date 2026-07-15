/**
 * CRM application queries — no transport DTOs.
 */

import type { PageRequest } from "@afh/shared-kernel";
import type { LeadStatus } from "@afh/crm";
import { CrmQueryTypes } from "../constants.js";

export type GetLeadPayload = {
  readonly companyId: string;
  readonly leadId: string;
};

export type GetContactPayload = {
  readonly companyId: string;
  readonly contactId: string;
};

export type GetAccountPayload = {
  readonly companyId: string;
  readonly accountId: string;
};

export type GetActivityPayload = {
  readonly companyId: string;
  readonly activityId: string;
};

export type GetCommunicationPayload = {
  readonly companyId: string;
  readonly communicationId: string;
};

export type GetCampaignPayload = {
  readonly companyId: string;
  readonly campaignId: string;
};

export type GetCrmSummaryPayload = {
  readonly companyId: string;
  readonly page?: PageRequest;
};

export type CrmSummary = {
  readonly companyId: string;
  readonly leadCount: number;
  readonly openLeadIds: readonly string[];
  readonly qualifiedLeadIds: readonly string[];
  readonly contactCount: number;
  readonly accountCount: number;
  readonly campaignCount: number;
  readonly activeCampaignIds: readonly string[];
};

export type { LeadStatus };

export { CrmQueryTypes };
