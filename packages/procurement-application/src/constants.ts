/**
 * Procurement application constants — workflow, rules, policy, approval codes.
 */

export const ProcurementCommandTypes = {
  CreateSupplier: "procurement.CreateSupplier",
  UpdateSupplier: "procurement.UpdateSupplier",
  CreatePurchaseRequisition: "procurement.CreatePurchaseRequisition",
  SubmitPurchaseRequisition: "procurement.SubmitPurchaseRequisition",
  CreatePurchaseOrder: "procurement.CreatePurchaseOrder",
  IssuePurchaseOrder: "procurement.IssuePurchaseOrder",
  CancelPurchaseOrder: "procurement.CancelPurchaseOrder",
} as const;

export const ProcurementQueryTypes = {
  GetSupplier: "procurement.GetSupplier",
  GetPurchaseRequisition: "procurement.GetPurchaseRequisition",
  GetPurchaseOrder: "procurement.GetPurchaseOrder",
  GetProcurementSummary: "procurement.GetProcurementSummary",
} as const;

export const ProcurementWorkflowCodes = {
  PurchaseRequisition: "purchase_requisition_v1",
  PurchaseOrder: "purchase_order_v1",
} as const;

export const ProcurementSubjectTypes = {
  Supplier: "procurement.supplier",
  PurchaseRequisition: "procurement.purchase_requisition",
  PurchaseOrder: "procurement.purchase_order",
} as const;

export const ProcurementRuleSetCodes = {
  SupplierEligibility: "procurement.supplier_eligibility",
  PurchasingLimits: "procurement.purchasing_limits",
  ApprovalThresholds: "procurement.approval_thresholds",
  FinancialPolicy: "procurement.financial_policy",
} as const;

/**
 * Canonical RC5 permission codes (`<module>.<resource>.<action>`), normalized
 * from legacy executable keys in RC5.3 per the frozen RC5.1 mapping. The seed
 * keeps granting the legacy compatibility codes as the documented overlap
 * window for rollback.
 */
export const ProcurementPolicyActions = {
  SupplierCreate: "procurement.suppliers.create",
  SupplierUpdate: "procurement.suppliers.update",
  SupplierRead: "procurement.suppliers.read",
  RequisitionCreate: "procurement.requisitions.create",
  RequisitionSubmit: "procurement.requisitions.submit",
  RequisitionRead: "procurement.requisitions.read",
  PurchaseOrderCreate: "procurement.purchase_orders.create",
  PurchaseOrderIssue: "procurement.purchase_orders.issue",
  PurchaseOrderCancel: "procurement.purchase_orders.cancel",
  PurchaseOrderRead: "procurement.purchase_orders.read",
  ProcurementSummaryRead: "procurement.purchase_orders.read",
} as const;

export const ProcurementApprovalTypes = {
  PurchaseRequisitionSubmit: "procurement.requisition_submit",
  PurchaseOrderIssue: "procurement.purchase_order_issue",
  PurchaseOrderCancel: "procurement.purchase_order_cancel",
} as const;
