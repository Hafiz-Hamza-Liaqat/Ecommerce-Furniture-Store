import type { QueryHandler } from "@afh/application";
import { filterAuthorizedRecords, principalListScope } from "@afh/application";
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
import {
  companyResource,
  loadRecordForAuthorization,
  requireCompanyId,
} from "../support/support.js";

export function createGetLeadHandler(
  deps: CrmHandlerDeps,
): QueryHandler<GetLeadPayload, Lead> {
  return {
    queryType: CrmQueryTypes.GetLead,
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.leads.findById({ companyId: p.companyId, id: p.leadId }),
      );
      return companyResource(
        "lead",
        CrmPolicyActions.LeadRead,
        p.companyId,
        p.leadId,
        {
          ownerUserId: record?.ownerUserId ?? null,
          attributes: {
            contactId: record?.contactId ?? null,
            accountId: record?.accountId ?? null,
          },
        },
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
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.contacts.findById({ companyId: p.companyId, id: p.contactId }),
      );
      return companyResource(
        "contact",
        CrmPolicyActions.ContactRead,
        p.companyId,
        p.contactId,
        {
          ownerUserId: record?.userId ?? null,
          attributes: {
            accountId: record?.accountId ?? null,
            leadId: record?.leadId ?? null,
          },
        },
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
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.accounts.findById({ companyId: p.companyId, id: p.accountId }),
      );
      return companyResource(
        "account",
        CrmPolicyActions.AccountRead,
        p.companyId,
        p.accountId,
        {
          ownerUserId: record?.ownerUserId ?? null,
          organizationId: record?.identityOrganizationId ?? null,
          attributes: { primaryContactId: record?.primaryContactId ?? null },
        },
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
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.activities.findById({ companyId: p.companyId, id: p.activityId }),
      );
      return companyResource(
        "activity",
        CrmPolicyActions.ActivityRead,
        p.companyId,
        p.activityId,
        {
          ownerUserId: record?.ownerUserId ?? null,
          attributes: {
            leadId: record?.leadId ?? null,
            contactId: record?.contactId ?? null,
            accountId: record?.accountId ?? null,
            opportunityId: record?.opportunityId ?? null,
          },
        },
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
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.campaigns.findById({ companyId: p.companyId, id: p.campaignId }),
      );
      return companyResource(
        "campaign",
        CrmPolicyActions.CampaignRead,
        p.companyId,
        p.campaignId,
        {
          ownerUserId: record?.ownerUserId ?? null,
          attributes: { audienceId: record?.audience?.audienceId ?? null },
        },
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
    authorize(query, ctx) {
      // RC5.7: the collection gate targets records within the caller's own
      // scopes; per-row Policy filtering in handle() enforces exactly that.
      return companyResource(
        "crm",
        CrmPolicyActions.SummaryRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal),
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

      // RC5.7: Policy-filter every row before counting or projecting ids.
      // Contacts persist no owner/org/branch fields, so scoped principals
      // see none of them (missing data denies).
      const visibleLeads = await filterAuthorizedRecords(
        ctx,
        CrmPolicyActions.LeadRead,
        "lead",
        leads.value.items,
        (l) => ({ id: l.id, companyId: l.companyId, ownerUserId: l.ownerUserId }),
      );
      if (!visibleLeads.ok) return visibleLeads;

      const visibleContacts = await filterAuthorizedRecords(
        ctx,
        CrmPolicyActions.ContactRead,
        "contact",
        contacts.value.items,
        (c) => ({ id: c.id, companyId: c.companyId }),
      );
      if (!visibleContacts.ok) return visibleContacts;

      const visibleAccounts = await filterAuthorizedRecords(
        ctx,
        CrmPolicyActions.AccountRead,
        "account",
        accounts.value.items,
        (a) => ({ id: a.id, companyId: a.companyId, ownerUserId: a.ownerUserId }),
      );
      if (!visibleAccounts.ok) return visibleAccounts;

      const visibleCampaigns = await filterAuthorizedRecords(
        ctx,
        CrmPolicyActions.CampaignRead,
        "campaign",
        campaigns.value.items,
        (c) => ({ id: c.id, companyId: c.companyId, ownerUserId: c.ownerUserId }),
      );
      if (!visibleCampaigns.ok) return visibleCampaigns;

      return ok({
        companyId: scope.value,
        leadCount: visibleLeads.value.length,
        openLeadIds: visibleLeads.value
          .filter(
            (l) =>
              l.status === "new" ||
              l.status === "contacted" ||
              l.status === "qualified",
          )
          .map((l) => l.id),
        qualifiedLeadIds: visibleLeads.value
          .filter((l) => l.status === "qualified")
          .map((l) => l.id),
        contactCount: visibleContacts.value.length,
        accountCount: visibleAccounts.value.length,
        campaignCount: visibleCampaigns.value.length,
        activeCampaignIds: visibleCampaigns.value
          .filter((c) => c.status === "active" || c.status === "scheduled")
          .map((c) => c.id),
      });
    },
  };
}
