/**
 * Procurement application validators — intent only. Calculations stay in Rules.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type {
  CancelPurchaseOrderPayload,
  CreatePurchaseOrderPayload,
  CreatePurchaseRequisitionPayload,
  CreateSupplierPayload,
  IssuePurchaseOrderPayload,
  SubmitPurchaseRequisitionPayload,
  UpdateSupplierPayload,
} from "../commands/commands.js";
import type {
  GetProcurementSummaryPayload,
  GetPurchaseOrderPayload,
  GetPurchaseRequisitionPayload,
  GetSupplierPayload,
} from "../queries/queries.js";

function requireField(
  field: string,
  value: string | null | undefined,
): ReturnType<typeof validationFail> | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

function requirePositiveLines(
  lines: readonly { description?: string; quantity: number }[] | undefined,
  fieldName: string,
) {
  if (!lines || lines.length === 0) {
    return validationFail([
      {
        field: fieldName,
        code: "required",
        message: `at least one ${fieldName} line is required`,
      },
    ]);
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.description?.trim()) {
      return validationFail([
        {
          field: `${fieldName}[${i}].description`,
          code: "required",
          message: "line description is required",
        },
      ]);
    }
    if (!(line.quantity > 0)) {
      return validationFail([
        {
          field: `${fieldName}[${i}].quantity`,
          code: "invalid",
          message: "quantity must be > 0",
        },
      ]);
    }
  }
  return null;
}

export const createSupplierCommandValidator: Validator<
  Command<CreateSupplierPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("code", p.code) ??
      requireField("name", p.name) ??
      validationOk()
    );
  },
};

export const updateSupplierCommandValidator: Validator<
  Command<UpdateSupplierPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("supplierId", p.supplierId);
    if (base) return base;
    if (p.transitionCode && !p.workflowInstanceId) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message: "workflowInstanceId is required when transitionCode is set",
        },
      ]);
    }
    return validationOk();
  },
};

export const createPurchaseRequisitionCommandValidator: Validator<
  Command<CreatePurchaseRequisitionPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("number", p.number);
    if (base) return base;
    return requirePositiveLines(p.lines, "lines") ?? validationOk();
  },
};

export const submitPurchaseRequisitionCommandValidator: Validator<
  Command<SubmitPurchaseRequisitionPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("requisitionId", p.requisitionId);
    if (base) return base;
    if (!p.requireApproval && !p.workflowInstanceId?.trim()) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message:
            "workflowInstanceId is required when submitting (or set requireApproval)",
        },
      ]);
    }
    return validationOk();
  },
};

export const createPurchaseOrderCommandValidator: Validator<
  Command<CreatePurchaseOrderPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("number", p.number) ??
      requireField("supplierId", p.supplierId) ??
      requireField("currencyCode", p.currencyCode);
    if (base) return base;
    return requirePositiveLines(p.lines, "lines") ?? validationOk();
  },
};

export const issuePurchaseOrderCommandValidator: Validator<
  Command<IssuePurchaseOrderPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("purchaseOrderId", p.purchaseOrderId);
    if (base) return base;
    if (!p.requireApproval && !p.workflowInstanceId?.trim()) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message:
            "workflowInstanceId is required when issuing (or set requireApproval)",
        },
      ]);
    }
    return validationOk();
  },
};

export const cancelPurchaseOrderCommandValidator: Validator<
  Command<CancelPurchaseOrderPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("purchaseOrderId", p.purchaseOrderId);
    if (base) return base;
    if (!p.requireApproval && !p.workflowInstanceId?.trim()) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message:
            "workflowInstanceId is required when cancelling (or set requireApproval)",
        },
      ]);
    }
    return validationOk();
  },
};

export const getSupplierQueryValidator: Validator<Query<GetSupplierPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("supplierId", p.supplierId) ??
      validationOk()
    );
  },
};

export const getPurchaseRequisitionQueryValidator: Validator<
  Query<GetPurchaseRequisitionPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("requisitionId", p.requisitionId) ??
      validationOk()
    );
  },
};

export const getPurchaseOrderQueryValidator: Validator<
  Query<GetPurchaseOrderPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("purchaseOrderId", p.purchaseOrderId) ??
      validationOk()
    );
  },
};

export const getProcurementSummaryQueryValidator: Validator<
  Query<GetProcurementSummaryPayload>
> = {
  validate(query) {
    return (
      requireField("companyId", query.payload.companyId) ?? validationOk()
    );
  },
};
