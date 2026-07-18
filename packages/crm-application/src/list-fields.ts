/**
 * RC7.2e — CRM List* sort/filter allow-lists (validators + handlers).
 */

export const LEAD_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "title",
  "code",
  "status",
  "classification",
]);

export const LEAD_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "classification",
  "code",
  "contactId",
  "accountId",
  "ownerUserId",
]);

export const CONTACT_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "displayName",
  "contactType",
]);

export const CONTACT_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "contactType",
  "accountId",
  "leadId",
  "userId",
]);

export const ACCOUNT_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "name",
  "code",
  "accountType",
]);

export const ACCOUNT_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "accountType",
  "code",
  "identityOrganizationId",
  "ownerUserId",
]);

export const ACTIVITY_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "subject",
  "activityType",
  "dueAt",
  "completedAt",
]);

export const ACTIVITY_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "activityType",
  "outcome",
  "leadId",
  "contactId",
  "accountId",
  "opportunityId",
  "ownerUserId",
]);

export const CAMPAIGN_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "name",
  "code",
  "status",
  "startAt",
  "endAt",
]);

export const CAMPAIGN_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "code",
  "ownerUserId",
]);
