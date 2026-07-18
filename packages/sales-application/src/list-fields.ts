/**
 * RC7.2a — Sales List* sort/filter allow-lists (validators + handlers).
 */

export const OPPORTUNITY_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "title",
  "status",
  "code",
]);

export const OPPORTUNITY_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "customerId",
  "salesRepUserId",
  "organizationId",
  "source",
  "code",
  "title",
]);

export const QUOTE_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "number",
  "status",
]);

export const QUOTE_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "customerId",
  "salesRepUserId",
  "organizationId",
  "number",
  "opportunityId",
]);

export const SALES_ORDER_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "number",
  "status",
]);

export const SALES_ORDER_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "customerId",
  "salesRepUserId",
  "organizationId",
  "number",
  "quoteId",
  "opportunityId",
]);
