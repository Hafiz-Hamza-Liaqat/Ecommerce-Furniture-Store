/**
 * Procurement application commands — intent only.
 */

import { ProcurementCommandTypes } from "../constants.js";

export type CreateSupplierPayload = {
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly identityOrganizationId?: string | null;
  readonly categoryId?: string | null;
};

export type UpdateSupplierPayload = {
  readonly companyId: string;
  readonly supplierId: string;
  readonly code?: string | null;
  readonly name?: string | null;
  readonly identityOrganizationId?: string | null;
  readonly categoryId?: string | null;
  /** Lifecycle — Workflow SSoT when activating/blocking */
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type RequisitionLineIntent = {
  readonly description: string;
  readonly quantity: number;
  readonly productId?: string | null;
  readonly variantId?: string | null;
  readonly inventoryItemId?: string | null;
  readonly unitCode?: string | null;
  readonly neededBy?: string | null;
};

export type CreatePurchaseRequisitionPayload = {
  readonly companyId: string;
  readonly number: string;
  readonly requestedByUserId?: string | null;
  readonly projectId?: string | null;
  readonly warehouseId?: string | null;
  readonly notes?: string | null;
  readonly lines: readonly RequisitionLineIntent[];
};

export type SubmitPurchaseRequisitionPayload = {
  readonly companyId: string;
  readonly requisitionId: string;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  readonly requireApproval?: boolean;
};

export type PurchaseOrderLineIntent = {
  readonly description: string;
  readonly quantity: number;
  readonly productId?: string | null;
  readonly variantId?: string | null;
  readonly inventoryItemId?: string | null;
  readonly unitCode?: string | null;
};

export type DeliveryTermsIntent = {
  readonly termsCode?: string | null;
  readonly notes?: string | null;
  readonly expectedDeliveryAt?: string | null;
};

export type CreatePurchaseOrderPayload = {
  readonly companyId: string;
  readonly number: string;
  readonly supplierId: string;
  readonly currencyCode: string;
  readonly requisitionId?: string | null;
  readonly projectId?: string | null;
  readonly warehouseId?: string | null;
  readonly deliveryTerms?: DeliveryTermsIntent | null;
  readonly lines: readonly PurchaseOrderLineIntent[];
};

export type IssuePurchaseOrderPayload = {
  readonly companyId: string;
  readonly purchaseOrderId: string;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  readonly requireApproval?: boolean;
};

export type CancelPurchaseOrderPayload = {
  readonly companyId: string;
  readonly purchaseOrderId: string;
  readonly reason?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  readonly requireApproval?: boolean;
};

export { ProcurementCommandTypes };
