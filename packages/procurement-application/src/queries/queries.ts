/**
 * Procurement application queries — no transport DTOs.
 */

import type { ListQueryRequest } from "@afh/shared-kernel";
import { ProcurementQueryTypes } from "../constants.js";

/** RC7.2b — shared List* envelope (companyId + optional criteria / q). */
export type ListSupplierPayload = ListQueryRequest;
export type ListPurchaseRequisitionPayload = ListQueryRequest;
export type ListPurchaseOrderPayload = ListQueryRequest;

export type GetSupplierPayload = {
  readonly companyId: string;
  readonly supplierId: string;
};

export type GetPurchaseRequisitionPayload = {
  readonly companyId: string;
  readonly requisitionId: string;
  readonly includeLines?: boolean;
};

export type GetPurchaseOrderPayload = {
  readonly companyId: string;
  readonly purchaseOrderId: string;
  readonly includeLines?: boolean;
};

export type GetProcurementSummaryPayload = {
  readonly companyId: string;
  readonly supplierId?: string | null;
};

export type ProcurementSummary = {
  readonly companyId: string;
  readonly supplierId: string | null;
  readonly supplierCount: number;
  readonly requisitionCount: number;
  readonly purchaseOrderCount: number;
  readonly draftRequisitionIds: readonly string[];
  readonly submittedRequisitionIds: readonly string[];
  readonly draftPurchaseOrderIds: readonly string[];
  readonly issuedPurchaseOrderIds: readonly string[];
};

export { ProcurementQueryTypes };
