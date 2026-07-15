/**
 * CRM application commands — intent only.
 */

import type {
  AccountType,
  ActivityOutcome,
  ActivityType,
  CampaignStatus,
  ContactType,
  LeadClassification,
} from "@afh/crm";
import { CrmCommandTypes } from "../constants.js";

export type CreateLeadPayload = {
  readonly companyId: string;
  readonly code?: string | null;
  readonly title?: string | null;
  readonly classification?: LeadClassification | null;
  readonly sourceId?: string | null;
  readonly sourceCode?: string | null;
  readonly sourceName?: string | null;
  readonly contactId?: string | null;
  readonly accountId?: string | null;
  readonly ownerUserId?: string | null;
  readonly salesCustomerId?: string | null;
};

export type UpdateLeadPayload = {
  readonly companyId: string;
  readonly leadId: string;
  readonly code?: string | null;
  readonly title?: string | null;
  readonly classification?: LeadClassification | null;
  readonly sourceId?: string | null;
  readonly sourceCode?: string | null;
  readonly sourceName?: string | null;
  readonly contactId?: string | null;
  readonly accountId?: string | null;
  readonly ownerUserId?: string | null;
  readonly salesCustomerId?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type QualifyLeadPayload = {
  readonly companyId: string;
  readonly leadId: string;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  readonly requireApproval?: boolean;
};

export type ConvertLeadPayload = {
  readonly companyId: string;
  readonly leadId: string;
  readonly contactId?: string | null;
  readonly accountId?: string | null;
  readonly opportunityId?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  readonly requireApproval?: boolean;
};

export type CreateContactPayload = {
  readonly companyId: string;
  readonly displayName: string;
  readonly contactType?: ContactType;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly userId?: string | null;
  readonly accountId?: string | null;
  readonly leadId?: string | null;
};

export type UpdateContactPayload = {
  readonly companyId: string;
  readonly contactId: string;
  readonly displayName?: string | null;
  readonly contactType?: ContactType | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly userId?: string | null;
  readonly accountId?: string | null;
  readonly leadId?: string | null;
};

export type CreateAccountPayload = {
  readonly companyId: string;
  readonly name: string;
  readonly code?: string | null;
  readonly accountType?: AccountType;
  readonly identityOrganizationId?: string | null;
  readonly primaryContactId?: string | null;
  readonly ownerUserId?: string | null;
};

export type UpdateAccountPayload = {
  readonly companyId: string;
  readonly accountId: string;
  readonly name?: string | null;
  readonly code?: string | null;
  readonly accountType?: AccountType | null;
  readonly identityOrganizationId?: string | null;
  readonly primaryContactId?: string | null;
  readonly ownerUserId?: string | null;
};

export type LogActivityPayload = {
  readonly companyId: string;
  readonly activityType: ActivityType;
  readonly subject: string;
  readonly notes?: string | null;
  readonly outcome?: ActivityOutcome | null;
  readonly leadId?: string | null;
  readonly contactId?: string | null;
  readonly accountId?: string | null;
  readonly opportunityId?: string | null;
  readonly ownerUserId?: string | null;
  readonly dueAt?: string | null;
  readonly completedAt?: string | null;
};

export type RecordCommunicationPayload = {
  readonly companyId: string;
  readonly channel: "email" | "sms" | "whatsapp" | "call" | "in_app" | "other";
  readonly channelLabel?: string | null;
  readonly direction: "inbound" | "outbound" | "internal";
  readonly subject?: string | null;
  readonly summary?: string | null;
  readonly leadId?: string | null;
  readonly contactId?: string | null;
  readonly accountId?: string | null;
  readonly notificationId?: string | null;
  readonly conversationId?: string | null;
  readonly occurredAt?: string | null;
};

export type CreateCampaignPayload = {
  readonly companyId: string;
  readonly name: string;
  readonly code?: string | null;
  readonly audienceId?: string | null;
  readonly audienceCode?: string | null;
  readonly audienceName?: string | null;
  readonly startAt?: string | null;
  readonly endAt?: string | null;
  readonly ownerUserId?: string | null;
};

export type UpdateCampaignPayload = {
  readonly companyId: string;
  readonly campaignId: string;
  readonly name?: string | null;
  readonly code?: string | null;
  readonly audienceId?: string | null;
  readonly audienceCode?: string | null;
  readonly audienceName?: string | null;
  readonly startAt?: string | null;
  readonly endAt?: string | null;
  readonly ownerUserId?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type { CampaignStatus };

export { CrmCommandTypes };
