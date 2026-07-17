/**
 * RC6.1 frozen default approval type definitions.
 *
 * Types mirror the seven `*-application` ApprovalTypes constants.
 * Registration is catalog/consistency only for RC6.1 — ApprovalEngine.submit
 * does not currently require a registered definition.
 */

export type CatalogApprovalDefinition = {
  readonly companyId: null;
  readonly type: string;
  readonly name: string;
};

export const APPROVAL_CATALOG: readonly CatalogApprovalDefinition[] = [
  { companyId: null, type: "crm.lead_qualify", name: "CRM Lead Qualify" },
  { companyId: null, type: "crm.lead_convert", name: "CRM Lead Convert" },
  { companyId: null, type: "sales.order_cancel", name: "Sales Order Cancel" },
  {
    companyId: null,
    type: "finance.invoice_issue",
    name: "Finance Invoice Issue",
  },
  {
    companyId: null,
    type: "finance.credit_write_off",
    name: "Finance Credit Write-Off",
  },
  {
    companyId: null,
    type: "finance.large_payment",
    name: "Finance Large Payment",
  },
  {
    companyId: null,
    type: "procurement.requisition_submit",
    name: "Procurement Requisition Submit",
  },
  {
    companyId: null,
    type: "procurement.purchase_order_issue",
    name: "Procurement Purchase Order Issue",
  },
  {
    companyId: null,
    type: "procurement.purchase_order_cancel",
    name: "Procurement Purchase Order Cancel",
  },
  {
    companyId: null,
    type: "inventory.stock_adjustment",
    name: "Inventory Stock Adjustment",
  },
  {
    companyId: null,
    type: "inventory.stock_transfer",
    name: "Inventory Stock Transfer",
  },
  {
    companyId: null,
    type: "projects.project_archive",
    name: "Projects Project Archive",
  },
  {
    companyId: null,
    type: "projects.resource_assign",
    name: "Projects Resource Assign",
  },
  {
    companyId: null,
    type: "service.service_request_close",
    name: "Service Request Close",
  },
  {
    companyId: null,
    type: "service.work_order_complete",
    name: "Service Work Order Complete",
  },
  {
    companyId: null,
    type: "service.technician_assign",
    name: "Service Technician Assign",
  },
];

export const APPROVAL_CATALOG_TYPES: readonly string[] = APPROVAL_CATALOG.map(
  (d) => d.type,
);
