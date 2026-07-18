/**
 * SQL adapters for CRM domain repositories.
 */

import {
  isOffsetPagination,
  ok,
  type Clock,
  type Page,
  type PageRequest,
} from "@afh/shared-kernel";
import type {
  Account,
  AccountRelationship,
  AccountRepository,
  Activity,
  ActivityRepository,
  Campaign,
  CampaignRepository,
  CommunicationRecord,
  CommunicationRepository,
  Contact,
  ContactMethod,
  ContactRepository,
  Lead,
  LeadRepository,
} from "@afh/crm";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlDocumentRepository } from "../mapping/document-repository.js";

type ContactMethodDoc = ContactMethod & { readonly companyId: string };

function pageBounds(page?: PageRequest): {
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
} {
  if (page && isOffsetPagination(page)) {
    const pageSize = Math.max(1, page.pageSize);
    const pageNum = Math.max(1, page.page);
    return {
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      page: pageNum,
      pageSize,
    };
  }
  return { limit: 100, offset: 0, page: 1, pageSize: 100 };
}

function toPage<T>(
  items: readonly T[],
  bounds: { page: number; pageSize: number; offset: number },
): Page<T> {
  const slice = items.slice(bounds.offset, bounds.offset + bounds.pageSize);
  return {
    items: slice,
    totalCount: items.length,
    page: bounds.page,
    pageSize: bounds.pageSize,
    nextCursor: null,
    hasMore: bounds.offset + slice.length < items.length,
  };
}

export function createSqlLeadRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): LeadRepository {
  const docs = new SqlDocumentRepository<Lead>(client, "crm.lead", clock);
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlContactRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ContactRepository {
  const docs = new SqlDocumentRepository<Contact>(client, "crm.contact", clock);
  const methods = new SqlDocumentRepository<ContactMethodDoc>(
    client,
    "crm.contact_method",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveMethod: (method) =>
      methods.save(
        { ...method, companyId: method.contactId },
        method.contactId,
      ),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlCrmAccountRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): AccountRepository {
  const docs = new SqlDocumentRepository<Account>(client, "crm.account", clock);
  const relationships = new SqlDocumentRepository<AccountRelationship>(
    client,
    "crm.account_relationship",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveRelationship: (relationship) =>
      relationships.save(relationship, relationship.fromAccountId),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlActivityRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ActivityRepository {
  const docs = new SqlDocumentRepository<Activity>(
    client,
    "crm.activity",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    listBySubject: async (companyId, subjectType, subjectId, page) => {
      const listed = await docs.listByCompany(companyId);
      if (!listed.ok) return listed;
      const filtered = listed.value.items.filter((a) => {
        switch (subjectType) {
          case "lead":
            return a.leadId === subjectId;
          case "contact":
            return a.contactId === subjectId;
          case "account":
            return a.accountId === subjectId;
          case "opportunity":
            return a.opportunityId === subjectId;
          default:
            return false;
        }
      });
      return ok(toPage(filtered, pageBounds(page)));
    },
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlCampaignRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): CampaignRepository {
  const docs = new SqlDocumentRepository<Campaign>(
    client,
    "crm.campaign",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlCommunicationRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): CommunicationRepository {
  const docs = new SqlDocumentRepository<CommunicationRecord>(
    client,
    "crm.communication",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
  };
}
