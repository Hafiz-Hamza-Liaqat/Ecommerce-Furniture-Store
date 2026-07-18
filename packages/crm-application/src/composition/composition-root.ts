/**
 * CRM application composition root.
 * Registers handlers into the Phase 5B HandlerRegistry. No HTTP/APIs.
 */

import { HandlerRegistry } from "@afh/application";
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
import {
  createConvertLeadHandler,
  createCreateAccountHandler,
  createCreateCampaignHandler,
  createCreateContactHandler,
  createCreateLeadHandler,
  createGetAccountHandler,
  createGetActivityHandler,
  createGetCampaignHandler,
  createGetCommunicationHandler,
  createGetContactHandler,
  createGetCrmSummaryHandler,
  createGetLeadHandler,
  createListAccountHandler,
  createListActivityHandler,
  createListCampaignHandler,
  createListContactHandler,
  createListLeadHandler,
  createLogActivityHandler,
  createQualifyLeadHandler,
  createRecordCommunicationHandler,
  createUpdateAccountHandler,
  createUpdateCampaignHandler,
  createUpdateContactHandler,
  createUpdateLeadHandler,
} from "../handlers/index.js";
import type { CrmHandlerDeps } from "../handlers/deps.js";

export type CreateCrmApplicationOptions = {
  readonly leads: LeadRepository;
  readonly contacts: ContactRepository;
  readonly accounts: AccountRepository;
  readonly activities: ActivityRepository;
  readonly communications: CommunicationRepository;
  readonly campaigns: CampaignRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type CrmApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: CrmHandlerDeps;
};

/**
 * Wires CRM command/query handlers into a HandlerRegistry.
 * Host then passes `handlers` to `createApplicationRuntime({ handlers, ... })`.
 */
export function createCrmApplication(
  options: CreateCrmApplicationOptions,
): CrmApplication {
  const deps: CrmHandlerDeps = {
    leads: options.leads,
    contacts: options.contacts,
    accounts: options.accounts,
    activities: options.activities,
    communications: options.communications,
    campaigns: options.campaigns,
    outbox: options.outbox,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();

  handlers.registerCommand(createCreateLeadHandler(deps));
  handlers.registerCommand(createUpdateLeadHandler(deps));
  handlers.registerCommand(createQualifyLeadHandler(deps));
  handlers.registerCommand(createConvertLeadHandler(deps));
  handlers.registerCommand(createCreateContactHandler(deps));
  handlers.registerCommand(createUpdateContactHandler(deps));
  handlers.registerCommand(createCreateAccountHandler(deps));
  handlers.registerCommand(createUpdateAccountHandler(deps));
  handlers.registerCommand(createLogActivityHandler(deps));
  handlers.registerCommand(createRecordCommunicationHandler(deps));
  handlers.registerCommand(createCreateCampaignHandler(deps));
  handlers.registerCommand(createUpdateCampaignHandler(deps));

  handlers.registerQuery(createGetLeadHandler(deps));
  handlers.registerQuery(createGetContactHandler(deps));
  handlers.registerQuery(createGetAccountHandler(deps));
  handlers.registerQuery(createGetActivityHandler(deps));
  handlers.registerQuery(createGetCommunicationHandler(deps));
  handlers.registerQuery(createGetCampaignHandler(deps));
  handlers.registerQuery(createGetCrmSummaryHandler(deps));
  handlers.registerQuery(createListLeadHandler(deps));
  handlers.registerQuery(createListContactHandler(deps));
  handlers.registerQuery(createListAccountHandler(deps));
  handlers.registerQuery(createListActivityHandler(deps));
  handlers.registerQuery(createListCampaignHandler(deps));

  return { handlers, deps };
}
