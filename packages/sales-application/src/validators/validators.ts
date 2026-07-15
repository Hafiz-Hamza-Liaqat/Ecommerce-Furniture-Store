/**
 * Sales application validators — intent validation only.
 * Business calculations remain in Rules Engine.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type {
  CancelSalesOrderPayload,
  CreateOpportunityPayload,
  CreateQuotePayload,
  CreateSalesOrderPayload,
  ReviseQuotePayload,
  UpdateOpportunityPayload,
} from "../commands/commands.js";
import type {
  GetCustomerSalesSummaryPayload,
  GetOpportunityPayload,
  GetQuotePayload,
  GetSalesOrderPayload,
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

export const createOpportunityCommandValidator: Validator<
  Command<CreateOpportunityPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("title", p.title) ??
      validationOk()
    );
  },
};

export const updateOpportunityCommandValidator: Validator<
  Command<UpdateOpportunityPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("opportunityId", p.opportunityId);
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

export const createQuoteCommandValidator: Validator<Command<CreateQuotePayload>> =
  {
    validate(command) {
      const p = command.payload;
      const base =
        requireField("companyId", p.companyId) ??
        requireField("number", p.number) ??
        requireField("currencyCode", p.currencyCode);
      if (base) return base;
      if (!p.lines || p.lines.length === 0) {
        return validationFail([
          {
            field: "lines",
            code: "required",
            message: "at least one quote line is required",
          },
        ]);
      }
      for (let i = 0; i < p.lines.length; i++) {
        const line = p.lines[i]!;
        if (!line.description?.trim()) {
          return validationFail([
            {
              field: `lines[${i}].description`,
              code: "required",
              message: "line description is required",
            },
          ]);
        }
        if (!(line.quantity > 0)) {
          return validationFail([
            {
              field: `lines[${i}].quantity`,
              code: "invalid",
              message: "quantity must be > 0",
            },
          ]);
        }
      }
      return validationOk();
    },
  };

export const reviseQuoteCommandValidator: Validator<Command<ReviseQuotePayload>> =
  {
    validate(command) {
      const p = command.payload;
      const base =
        requireField("companyId", p.companyId) ??
        requireField("quoteId", p.quoteId);
      if (base) return base;
      if (!p.lines || p.lines.length === 0) {
        return validationFail([
          {
            field: "lines",
            code: "required",
            message: "at least one quote line is required",
          },
        ]);
      }
      for (let i = 0; i < p.lines.length; i++) {
        const line = p.lines[i]!;
        if (!(line.quantity > 0)) {
          return validationFail([
            {
              field: `lines[${i}].quantity`,
              code: "invalid",
              message: "quantity must be > 0",
            },
          ]);
        }
      }
      return validationOk();
    },
  };

export const createSalesOrderCommandValidator: Validator<
  Command<CreateSalesOrderPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("number", p.number) ??
      requireField("currencyCode", p.currencyCode);
    if (base) return base;
    if (!p.lines || p.lines.length === 0) {
      return validationFail([
        {
          field: "lines",
          code: "required",
          message: "at least one order line is required",
        },
      ]);
    }
    for (let i = 0; i < p.lines.length; i++) {
      const line = p.lines[i]!;
      if (!line.description?.trim()) {
        return validationFail([
          {
            field: `lines[${i}].description`,
            code: "required",
            message: "line description is required",
          },
        ]);
      }
      if (!(line.quantity > 0)) {
        return validationFail([
          {
            field: `lines[${i}].quantity`,
            code: "invalid",
            message: "quantity must be > 0",
          },
        ]);
      }
    }
    return validationOk();
  },
};

export const cancelSalesOrderCommandValidator: Validator<
  Command<CancelSalesOrderPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("salesOrderId", p.salesOrderId);
    if (base) return base;
    if (!p.requireApproval && !p.workflowInstanceId?.trim()) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message:
            "workflowInstanceId is required when executing cancel (or set requireApproval)",
        },
      ]);
    }
    return validationOk();
  },
};

export const getOpportunityQueryValidator: Validator<
  Query<GetOpportunityPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("opportunityId", p.opportunityId) ??
      validationOk()
    );
  },
};

export const getQuoteQueryValidator: Validator<Query<GetQuotePayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("quoteId", p.quoteId) ??
      validationOk()
    );
  },
};

export const getSalesOrderQueryValidator: Validator<
  Query<GetSalesOrderPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("salesOrderId", p.salesOrderId) ??
      validationOk()
    );
  },
};

export const getCustomerSalesSummaryQueryValidator: Validator<
  Query<GetCustomerSalesSummaryPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("customerId", p.customerId) ??
      validationOk()
    );
  },
};
