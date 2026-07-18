/**
 * RC7.2g — Service List* sort/filter allow-lists (validators + handlers).
 */

export const SERVICE_REQUEST_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "number",
  "title",
  "status",
  "priority",
]);

export const SERVICE_REQUEST_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "priority",
  "number",
  "customerId",
  "projectId",
]);

export const WORK_ORDER_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "number",
  "status",
]);

export const WORK_ORDER_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "number",
  "serviceRequestId",
  "projectId",
]);

export const APPOINTMENT_SORT_FIELDS: ReadonlySet<string> = new Set([
  "updatedAt",
  "createdAt",
  "status",
]);

export const APPOINTMENT_FILTER_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "serviceRequestId",
  "workOrderId",
  "projectId",
]);

export const TECHNICIAN_ASSIGNMENT_SORT_FIELDS: ReadonlySet<string> = new Set([
  "assignedAt",
  "workOrderId",
  "appointmentId",
]);

export const TECHNICIAN_ASSIGNMENT_FILTER_FIELDS: ReadonlySet<string> =
  new Set(["workOrderId", "appointmentId"]);
