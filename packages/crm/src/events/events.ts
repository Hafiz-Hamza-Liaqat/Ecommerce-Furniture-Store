/**
 * CRM domain event contracts — no publishers, consumers, or Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type LeadCreatedPayload = {
  readonly leadId: string;
  readonly companyId: string;
};

export type ContactCreatedPayload = {
  readonly contactId: string;
  readonly companyId: string;
};

export type OpportunityLinkedPayload = {
  readonly opportunityId: string;
  readonly companyId: string;
  readonly leadId: string | null;
  readonly accountId: string | null;
};

export type ActivityLoggedPayload = {
  readonly activityId: string;
  readonly companyId: string;
};

export type CampaignCreatedPayload = {
  readonly campaignId: string;
  readonly companyId: string;
};

export const CrmEventTypes = {
  LeadCreated: "crm.lead.created",
  ContactCreated: "crm.contact.created",
  OpportunityLinked: "crm.opportunity.linked",
  ActivityLogged: "crm.activity.logged",
  CampaignCreated: "crm.campaign.created",
} as const;

export type CrmEventType = (typeof CrmEventTypes)[keyof typeof CrmEventTypes];

export type CrmDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: CrmEventType | string;
  };
};

export type LeadCreatedEvent = CrmDomainEvent<LeadCreatedPayload>;
export type ContactCreatedEvent = CrmDomainEvent<ContactCreatedPayload>;
export type OpportunityLinkedEvent = CrmDomainEvent<OpportunityLinkedPayload>;
export type ActivityLoggedEvent = CrmDomainEvent<ActivityLoggedPayload>;
export type CampaignCreatedEvent = CrmDomainEvent<CampaignCreatedPayload>;
