/**
 * Finance application validators — intent only.
 * Tax/pricing/FX/credit calculations remain in Rules.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import {
  validateFilterAllowList,
  validateSortAllowList,
  validationFail,
  validationOk,
} from "@afh/shared-kernel";
import type {
  AppendLedgerEntryPayload,
  CreateFinancialAccountPayload,
  CreateInvoicePayload,
  CreateLedgerPayload,
  MoneyIntent,
  RecordCreditAdjustmentPayload,
  RecordPaymentPayload,
  UpdateFinancialAccountPayload,
  UpdateInvoicePayload,
} from "../commands/commands.js";
import type {
  GetCreditAccountPayload,
  GetFinancialAccountPayload,
  GetFinancialSummaryPayload,
  GetInvoicePayload,
  GetLedgerPayload,
  GetPaymentPayload,
  ListFinancialAccountPayload,
  ListInvoicePayload,
  ListLedgerPayload,
  ListPaymentPayload,
} from "../queries/queries.js";
import {
  FINANCIAL_ACCOUNT_FILTER_FIELDS,
  FINANCIAL_ACCOUNT_SORT_FIELDS,
  INVOICE_FILTER_FIELDS,
  INVOICE_SORT_FIELDS,
  LEDGER_FILTER_FIELDS,
  LEDGER_SORT_FIELDS,
  PAYMENT_FILTER_FIELDS,
  PAYMENT_SORT_FIELDS,
} from "../list-fields.js";

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

function requireMoney(
  field: string,
  money: MoneyIntent | null | undefined,
): ReturnType<typeof validationFail> | null {
  if (!money) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  if (!money.currencyCode?.trim()) {
    return validationFail([
      {
        field: `${field}.currencyCode`,
        code: "required",
        message: "currencyCode is required",
      },
    ]);
  }
  if (!money.amountMinor?.trim()) {
    return validationFail([
      {
        field: `${field}.amountMinor`,
        code: "required",
        message: "amountMinor is required",
      },
    ]);
  }
  try {
    BigInt(money.amountMinor);
  } catch {
    return validationFail([
      {
        field: `${field}.amountMinor`,
        code: "invalid",
        message: "amountMinor must be an integer string",
      },
    ]);
  }
  return null;
}

export const createFinancialAccountCommandValidator: Validator<
  Command<CreateFinancialAccountPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("code", p.code) ??
      requireField("name", p.name) ??
      requireField("accountType", p.accountType) ??
      validationOk()
    );
  },
};

export const updateFinancialAccountCommandValidator: Validator<
  Command<UpdateFinancialAccountPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("accountId", p.accountId);
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
    if (
      p.expectedVersion !== undefined &&
      (typeof p.expectedVersion !== "number" ||
        !Number.isInteger(p.expectedVersion) ||
        p.expectedVersion < 0)
    ) {
      return validationFail([
        {
          field: "expectedVersion",
          code: "invalid",
          message: "expectedVersion must be a non-negative integer",
        },
      ]);
    }
    return validationOk();
  },
};

export const createInvoiceCommandValidator: Validator<
  Command<CreateInvoicePayload>
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
          message: "at least one invoice line is required",
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

export const updateInvoiceCommandValidator: Validator<
  Command<UpdateInvoicePayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("invoiceId", p.invoiceId);
    if (base) return base;
    if (p.transitionCode && !p.workflowInstanceId && !p.requireApproval) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message:
            "workflowInstanceId is required when transitionCode is set (or set requireApproval)",
        },
      ]);
    }
    return validationOk();
  },
};

export const recordPaymentCommandValidator: Validator<
  Command<RecordPaymentPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireMoney("amount", p.amount) ??
      validationOk()
    );
  },
};

export const recordCreditAdjustmentCommandValidator: Validator<
  Command<RecordCreditAdjustmentPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("creditAccountId", p.creditAccountId) ??
      requireField("kind", p.kind) ??
      requireMoney("amount", p.amount) ??
      validationOk()
    );
  },
};

export const createLedgerCommandValidator: Validator<
  Command<CreateLedgerPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("code", p.code) ??
      requireField("name", p.name) ??
      requireField("kind", p.kind) ??
      validationOk()
    );
  },
};

export const appendLedgerEntryCommandValidator: Validator<
  Command<AppendLedgerEntryPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("ledgerId", p.ledgerId) ??
      requireField("accountId", p.accountId) ??
      requireField("side", p.side) ??
      requireMoney("amount", p.amount) ??
      validationOk()
    );
  },
};

export const getFinancialAccountQueryValidator: Validator<
  Query<GetFinancialAccountPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("accountId", p.accountId) ??
      validationOk()
    );
  },
};

export const getInvoiceQueryValidator: Validator<Query<GetInvoicePayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("invoiceId", p.invoiceId) ??
      validationOk()
    );
  },
};

export const getPaymentQueryValidator: Validator<Query<GetPaymentPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("paymentId", p.paymentId) ??
      validationOk()
    );
  },
};

export const getLedgerQueryValidator: Validator<Query<GetLedgerPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("ledgerId", p.ledgerId) ??
      validationOk()
    );
  },
};

export const getCreditAccountQueryValidator: Validator<
  Query<GetCreditAccountPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("creditAccountId", p.creditAccountId) ??
      validationOk()
    );
  },
};

export const getFinancialSummaryQueryValidator: Validator<
  Query<GetFinancialSummaryPayload>
> = {
  validate(query) {
    return (
      requireField("companyId", query.payload.companyId) ?? validationOk()
    );
  },
};

function listCriteriaViolations(
  payload: ListFinancialAccountPayload,
  sortFields: ReadonlySet<string>,
  filterFields: ReadonlySet<string>,
): ReturnType<typeof validationFail> | null {
  const sort = validateSortAllowList(payload.criteria?.sort, sortFields);
  if (!sort.ok) {
    return validationFail([
      {
        field: "criteria.sort",
        code: sort.error.code,
        message: sort.error.message,
      },
    ]);
  }
  const filters = validateFilterAllowList(
    payload.criteria?.filters,
    filterFields,
  );
  if (!filters.ok) {
    return validationFail([
      {
        field: "criteria.filters",
        code: filters.error.code,
        message: filters.error.message,
      },
    ]);
  }
  return null;
}

export const listFinancialAccountQueryValidator: Validator<
  Query<ListFinancialAccountPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      listCriteriaViolations(
        p,
        FINANCIAL_ACCOUNT_SORT_FIELDS,
        FINANCIAL_ACCOUNT_FILTER_FIELDS,
      ) ??
      validationOk()
    );
  },
};

export const listInvoiceQueryValidator: Validator<Query<ListInvoicePayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      listCriteriaViolations(p, INVOICE_SORT_FIELDS, INVOICE_FILTER_FIELDS) ??
      validationOk()
    );
  },
};

export const listPaymentQueryValidator: Validator<Query<ListPaymentPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      listCriteriaViolations(p, PAYMENT_SORT_FIELDS, PAYMENT_FILTER_FIELDS) ??
      validationOk()
    );
  },
};

export const listLedgerQueryValidator: Validator<Query<ListLedgerPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      listCriteriaViolations(p, LEDGER_SORT_FIELDS, LEDGER_FILTER_FIELDS) ??
      validationOk()
    );
  },
};
