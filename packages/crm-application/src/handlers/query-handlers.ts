import type { QueryHandler } from "@afh/application";
import type { PageRequest } from "@afh/shared-kernel";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  Account,
  Activity,
  Campaign,
  CommunicationRecord,
  Contact,
  Lead,
} from "@afh/crm";
import { CrmPolicyActions, CrmQueryTypes } from "../constants.js";
import type {
  CrmSummary,
  GetAccountPayload,
  GetActivityPayload,
  GetCampaignPayload,
  GetCommunicationPayload,
  GetContactPayload,
  GetCrmSummaryPayload,
  GetLeadPayload,
} from "../queries/queries.js";
import {
  getAccountQueryValidator,
  getActivityQueryValidator,
  getCampaignQueryValidator,
  getCommunicationQueryValidator,
  getContactQueryValidator,
  getCrmSummaryQueryValidator,
  getLeadQueryValidator,
} from "../validators/validators.js";
import type { CrmHandlerDeps } from "./deps.js";
import { companyResource, requireCompanyId } from "../support/support.js";

export function createGetLeadHandler(
  deps: CrmHandlerDeps,
): QueryHandler<GetLeadPayload, Lead> {
  return {
    queryType: CrmQueryTypes.GetLead,
    authorize(query) {
      return companyResource(
        "lead",
        CrmPolicyActions.LeadRead,
        query.payload.companyId,
        query.payload.leadId,
      );
    },
    validate() {
      return getLeadQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.leads.findById({
        companyId: scope.value,
        id: query.payload.leadId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Lead not found", { code: "lead_not_found" }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetContactHandler(
  deps: CrmHandlerDeps,
): QueryHandler<GetContactPayload, Contact> {
  return {
    queryType: CrmQueryTypes.GetContact,
    authorize(query) {
      return companyResource(
        "contact",
        CrmPolicyActions.ContactRead,
        query.payload.companyId,
        query.payload.contactId,
      );
    },
    validate() {
      return getContactQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.contacts.findById({
        companyId: scope.value,
        id: query.payload.contactId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Contact not found", { code: "contact_not_found" }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetAccountHandler(
  deps: CrmHandlerDeps,
): QueryHandler<GetAccountPayload, Account> {
  return {
    queryType: CrmQueryTypes.GetAccount,
    authorize(query) {
      return companyResource(
        "account",
        CrmPolicyActions.AccountRead,
        query.payload.companyId,
        query.payload.accountId,
      );
    },
    validate() {
      return getAccountQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.accounts.findById({
        companyId: scope.value,
        id: query.payload.accountId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Account not found", { code: "account_not_found" }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetActivityHandler(
  deps: CrmHandlerDeps,
): QueryHandler<GetActivityPayload, Activity> {
  return {
    queryType: CrmQueryTypes.GetActivity,
    authorize(query) {
      return companyResource(
        "activity",
        CrmPolicyActions.ActivityRead,
        query.payload.companyId,
        query.payload.activityId,
      );
    },
    validate() {
      return getActivityQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.activities.findById({
        companyId: scope.value,
        id: query.payload.activityId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Activity not found", {
            code: "activity_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetCommunicationHandler(
  deps: CrmHandlerDeps,
): QueryHandler<GetCommunicationPayload, CommunicationRecord> {
  return {
    queryType: CrmQueryTypes.GetCommunication,
    authorize(query) {
      return companyResource(
        "communication",
        CrmPolicyActions.CommunicationRead,
        query.payload.companyId,
        query.payload.communicationId,
      );
    },
    validate() {
      return getCommunicationQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.communications.findById({
        companyId: scope.value,
        id: query.payload.communicationId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Communication not found", {
            code: "communication_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetCampaignHandler(
  deps: CrmHandlerDeps,
): QueryHandler<GetCampaignPayload, Campaign> {
  return {
    queryType: CrmQueryTypes.GetCampaign,
    authorize(query) {
      return companyResource(
        "campaign",
        CrmPolicyActions.CampaignRead,
        query.payload.companyId,
        query.payload.campaignId,
      );
    },
    validate() {
      return getCampaignQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.campaigns.findById({
        companyId: scope.value,
        id: query.payload.campaignId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Campaign not found", {
            code: "campaign_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetCrmSummaryHandler(
  deps: CrmHandlerDeps,
): QueryHandler<GetCrmSummaryPayload, CrmSummary> {
  return {
    queryType: CrmQueryTypes.GetCrmSummary,
    authorize(query) {
      return companyResource(
        "crm",
        CrmPolicyActions.SummaryRead,
        query.payload.companyId,
      );
    },
    validate() {
      return getCrmSummaryQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const page: PageRequest = query.payload.page ?? {
        page: 1,
        pageSize: 500,
      };

      const leads = await deps.leads.listByCompany(scope.value, page);
      if (!leads.ok) return leads;

      const contacts = await deps.contacts.listByCompany(scope.value, page);
      if (!contacts.ok) return contacts;

      const accounts = await deps.accounts.listByCompany(scope.value, page);
      if (!accounts.ok) return accounts;

      const campaigns = await deps.campaigns.listByCompany(scope.value, page);
      if (!campaigns.ok) return campaigns;

      return ok({
        companyId: scope.value,
        leadCount: leads.value.items.length,
        openLeadIds: leads.value.items
          .filter(
            (l) =>
              l.status === "new" ||
              l.status === "contacted" ||
              l.status === "qualified",
          )
          .map((l) => l.id),
        qualifiedLeadIds: leads.value.items
          .filter((l) => l.status === "qualified")
          .map((l) => l.id),
        contactCount: contacts.value.items.length,
        accountCount: accounts.value.items.length,
        campaignCount: campaigns.value.items.length,
        activeCampaignIds: campaigns.value.items
          .filter((c) => c.status === "active" || c.status === "scheduled")
          .map((c) => c.id),
      });
    },
  };
}
