import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  AccountRepository,
  ActivityRepository,
  CampaignRepository,
  CommunicationRepository,
  ContactRepository,
  LeadRepository,
} from "@afh/crm";

export type CrmHandlerDeps = {
  readonly leads: LeadRepository;
  readonly contacts: ContactRepository;
  readonly accounts: AccountRepository;
  readonly activities: ActivityRepository;
  readonly communications: CommunicationRepository;
  readonly campaigns: CampaignRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
};
