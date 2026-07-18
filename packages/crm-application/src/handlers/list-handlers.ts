/**
 * RC7.2e — CRM List* query handlers.
 * Authorization totals and paging via buildAuthorizedListPage (ADR D56).
 * CRM remains owner of aggregates/repositories; this file only adds List*.
 * ListCommunication and Opportunity List* remain out of RC7.2e scope.
 */

import type { QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { Page } from "@afh/shared-kernel";
import type { Account, Activity, Campaign, Contact, Lead } from "@afh/crm";
import { CrmPolicyActions, CrmQueryTypes } from "../constants.js";
import type {
  ListAccountPayload,
  ListActivityPayload,
  ListCampaignPayload,
  ListContactPayload,
  ListLeadPayload,
} from "../queries/queries.js";
import {
  listAccountQueryValidator,
  listActivityQueryValidator,
  listCampaignQueryValidator,
  listContactQueryValidator,
  listLeadQueryValidator,
} from "../validators/validators.js";
import type { CrmHandlerDeps } from "./deps.js";
import { companyResource, requireCompanyId } from "../support/support.js";
import { createCrmListCandidateFetcher } from "./list-support.js";

export {
  ACCOUNT_FILTER_FIELDS,
  ACCOUNT_SORT_FIELDS,
  ACTIVITY_FILTER_FIELDS,
  ACTIVITY_SORT_FIELDS,
  CAMPAIGN_FILTER_FIELDS,
  CAMPAIGN_SORT_FIELDS,
  CONTACT_FILTER_FIELDS,
  CONTACT_SORT_FIELDS,
  LEAD_FILTER_FIELDS,
  LEAD_SORT_FIELDS,
} from "../list-fields.js";

export function createListLeadHandler(
  deps: CrmHandlerDeps,
): QueryHandler<ListLeadPayload, Page<Lead>> {
  return {
    queryType: CrmQueryTypes.ListLead,
    authorize(query, ctx) {
      return companyResource(
        "lead",
        CrmPolicyActions.LeadRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, CrmPolicyActions.LeadRead),
      );
    },
    validate() {
      return listLeadQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Lead>({
        ctx,
        action: CrmPolicyActions.LeadRead,
        resourceType: "lead",
        request,
        toScope: (l) => ({
          id: l.id,
          companyId: l.companyId,
          ownerUserId: l.ownerUserId,
          attributes: {
            contactId: l.contactId,
            accountId: l.accountId,
          },
        }),
        fetchCandidates: createCrmListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.leads.listByCompany(companyId, page),
          request,
          searchFields: ["title", "code"],
        }),
      });
    },
  };
}

export function createListContactHandler(
  deps: CrmHandlerDeps,
): QueryHandler<ListContactPayload, Page<Contact>> {
  return {
    queryType: CrmQueryTypes.ListContact,
    authorize(query, ctx) {
      return companyResource(
        "contact",
        CrmPolicyActions.ContactRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, CrmPolicyActions.ContactRead),
      );
    },
    validate() {
      return listContactQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Contact>({
        ctx,
        action: CrmPolicyActions.ContactRead,
        resourceType: "contact",
        request,
        toScope: (c) => ({
          id: c.id,
          companyId: c.companyId,
          ownerUserId: c.userId,
          attributes: {
            accountId: c.accountId,
            leadId: c.leadId,
          },
        }),
        fetchCandidates: createCrmListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.contacts.listByCompany(companyId, page),
          request,
          searchFields: ["displayName", "email", "phone"],
        }),
      });
    },
  };
}

export function createListAccountHandler(
  deps: CrmHandlerDeps,
): QueryHandler<ListAccountPayload, Page<Account>> {
  return {
    queryType: CrmQueryTypes.ListAccount,
    authorize(query, ctx) {
      return companyResource(
        "account",
        CrmPolicyActions.AccountRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, CrmPolicyActions.AccountRead),
      );
    },
    validate() {
      return listAccountQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Account>({
        ctx,
        action: CrmPolicyActions.AccountRead,
        resourceType: "account",
        request,
        toScope: (a) => ({
          id: a.id,
          companyId: a.companyId,
          ownerUserId: a.ownerUserId,
          organizationId: a.identityOrganizationId,
          attributes: {
            primaryContactId: a.primaryContactId,
          },
        }),
        fetchCandidates: createCrmListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.accounts.listByCompany(companyId, page),
          request,
          searchFields: ["name", "code"],
        }),
      });
    },
  };
}

export function createListActivityHandler(
  deps: CrmHandlerDeps,
): QueryHandler<ListActivityPayload, Page<Activity>> {
  return {
    queryType: CrmQueryTypes.ListActivity,
    authorize(query, ctx) {
      return companyResource(
        "activity",
        CrmPolicyActions.ActivityRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, CrmPolicyActions.ActivityRead),
      );
    },
    validate() {
      return listActivityQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Activity>({
        ctx,
        action: CrmPolicyActions.ActivityRead,
        resourceType: "activity",
        request,
        toScope: (a) => ({
          id: a.id,
          companyId: a.companyId,
          ownerUserId: a.ownerUserId,
          attributes: {
            leadId: a.leadId,
            contactId: a.contactId,
            accountId: a.accountId,
            opportunityId: a.opportunityId,
          },
        }),
        fetchCandidates: createCrmListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.activities.listByCompany(companyId, page),
          request,
          searchFields: ["subject", "notes"],
        }),
      });
    },
  };
}

export function createListCampaignHandler(
  deps: CrmHandlerDeps,
): QueryHandler<ListCampaignPayload, Page<Campaign>> {
  return {
    queryType: CrmQueryTypes.ListCampaign,
    authorize(query, ctx) {
      return companyResource(
        "campaign",
        CrmPolicyActions.CampaignRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, CrmPolicyActions.CampaignRead),
      );
    },
    validate() {
      return listCampaignQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Campaign>({
        ctx,
        action: CrmPolicyActions.CampaignRead,
        resourceType: "campaign",
        request,
        toScope: (c) => ({
          id: c.id,
          companyId: c.companyId,
          ownerUserId: c.ownerUserId,
          attributes: {
            audienceId: c.audience?.audienceId ?? null,
          },
        }),
        fetchCandidates: createCrmListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.campaigns.listByCompany(companyId, page),
          request,
          searchFields: ["name", "code"],
        }),
      });
    },
  };
}
