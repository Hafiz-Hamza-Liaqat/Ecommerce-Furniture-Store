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

export const ProcurementPolicyActions = {
  SupplierCreate: "supplier.create",
  SupplierUpdate: "supplier.update",
  SupplierRead: "supplier.read",
  RequisitionCreate: "requisition.create",
  RequisitionSubmit: "requisition.submit",
  RequisitionRead: "requisition.read",
  PurchaseOrderCreate: "po.create",
  PurchaseOrderIssue: "po.issue",
  PurchaseOrderCancel: "po.cancel",
  PurchaseOrderRead: "po.read",
  ProcurementSummaryRead: "po.read",
} as const;

export const ProcurementApprovalTypes = {
  PurchaseRequisitionSubmit: "procurement.requisition_submit",
  PurchaseOrderIssue: "procurement.purchase_order_issue",
  PurchaseOrderCancel: "procurement.purchase_order_cancel",
} as const;
