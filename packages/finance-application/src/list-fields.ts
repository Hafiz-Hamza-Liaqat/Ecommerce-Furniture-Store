/**
 * RC7.2d — Finance List* sort/filter allow-lists (validators + handlers).
 */

export const FINANCIAL_ACCOUNT_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "name",
  "code",
  "status",
  "accountType",
]);

export const FINANCIAL_ACCOUNT_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "code",
  "name",
  "accountType",
  "currencyCode",
  "parentAccountId",
]);

export const INVOICE_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "number",
  "status",
  "issuedAt",
  "dueAt",
]);

export const INVOICE_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "number",
  "customerId",
  "organizationId",
  "currencyCode",
]);

export const PAYMENT_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "recordedAt",
  "status",
]);

export const PAYMENT_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "invoiceId",
  "payerCustomerId",
  "payerOrganizationId",
  "externalRef",
]);

export const LEDGER_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "name",
  "code",
  "kind",
]);

export const LEDGER_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "kind",
  "code",
  "name",
  "currencyCode",
]);
