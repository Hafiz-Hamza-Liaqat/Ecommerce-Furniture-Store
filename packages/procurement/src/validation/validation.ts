/**
 * Procurement validation — structural only.
 * No approval, stock, pricing, or business rules.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { Supplier } from "../supplier/supplier.js";
import type {
  PurchaseRequisition,
  RequisitionLine,
} from "../requisition/requisition.js";
import type {
  PurchaseOrder,
  PurchaseOrderLine,
} from "../purchase-order/purchase-order.js";

function requireNonEmpty(
  field: string,
  value: string | null | undefined,
): ValidationOutcome | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const supplierStructureValidator: Validator<Supplier> = {
  validate(input: Supplier): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const purchaseRequisitionStructureValidator: Validator<PurchaseRequisition> =
  {
    validate(input: PurchaseRequisition): ValidationOutcome {
      return (
        requireNonEmpty("id", input.id) ??
        requireNonEmpty("companyId", input.companyId) ??
        requireNonEmpty("number", input.number) ??
        validationOk()
      );
    },
  };

export const requisitionLineStructureValidator: Validator<RequisitionLine> = {
  validate(input: RequisitionLine): ValidationOutcome {
    if (!(input.quantity > 0)) {
      return validationFail([
        {
          field: "quantity",
          code: "invalid",
          message: "quantity must be > 0",
        },
      ]);
    }
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("requisitionId", input.requisitionId) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("description", input.description) ??
      validationOk()
    );
  },
};

export const purchaseOrderStructureValidator: Validator<PurchaseOrder> = {
  validate(input: PurchaseOrder): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("number", input.number) ??
      requireNonEmpty("supplierId", input.supplierId) ??
      requireNonEmpty("currencyCode", input.currencyCode) ??
      validationOk()
    );
  },
};

export const purchaseOrderLineStructureValidator: Validator<PurchaseOrderLine> =
  {
    validate(input: PurchaseOrderLine): ValidationOutcome {
      if (!(input.quantity > 0)) {
        return validationFail([
          {
            field: "quantity",
            code: "invalid",
            message: "quantity must be > 0",
          },
        ]);
      }
      return (
        requireNonEmpty("id", input.id) ??
        requireNonEmpty("purchaseOrderId", input.purchaseOrderId) ??
        requireNonEmpty("companyId", input.companyId) ??
        requireNonEmpty("description", input.description) ??
        validationOk()
      );
    },
  };

export type ProcurementValidators = {
  readonly supplier: Validator<Supplier>;
  readonly purchaseRequisition: Validator<PurchaseRequisition>;
  readonly requisitionLine: Validator<RequisitionLine>;
  readonly purchaseOrder: Validator<PurchaseOrder>;
  readonly purchaseOrderLine: Validator<PurchaseOrderLine>;
};

export function createProcurementValidators(): ProcurementValidators {
  return {
    supplier: supplierStructureValidator,
    purchaseRequisition: purchaseRequisitionStructureValidator,
    requisitionLine: requisitionLineStructureValidator,
    purchaseOrder: purchaseOrderStructureValidator,
    purchaseOrderLine: purchaseOrderLineStructureValidator,
  };
}
