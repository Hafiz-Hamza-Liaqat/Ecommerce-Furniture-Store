/**
 * RC7.2b — Procurement List* sort/filter allow-lists (validators + handlers).
 */

export const SUPPLIER_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "name",
  "code",
  "status",
]);

export const SUPPLIER_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "code",
  "name",
  "categoryId",
  "identityOrganizationId",
]);

export const REQUISITION_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "number",
  "status",
]);

export const REQUISITION_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "number",
  "requestedByUserId",
  "projectId",
  "warehouseId",
]);

export const PURCHASE_ORDER_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "number",
  "status",
]);

export const PURCHASE_ORDER_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "number",
  "supplierId",
  "requisitionId",
  "projectId",
  "warehouseId",
]);
