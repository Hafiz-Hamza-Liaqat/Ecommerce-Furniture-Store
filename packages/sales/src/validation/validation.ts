/**
 * Sales validation — structural only.
 * No pricing, tax, discount, or business rules.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { Opportunity } from "../opportunity/opportunity.js";
import type { Quote, QuoteLine, QuoteRevision } from "../quote/quote.js";
import type { SalesOrder, SalesOrderLine } from "../order/order.js";

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

export const opportunityStructureValidator: Validator<Opportunity> = {
  validate(input: Opportunity): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("title", input.title) ??
      validationOk()
    );
  },
};

export const quoteStructureValidator: Validator<Quote> = {
  validate(input: Quote): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("number", input.number) ??
      requireNonEmpty("currencyCode", input.currencyCode) ??
      validationOk()
    );
  },
};

export const quoteRevisionStructureValidator: Validator<QuoteRevision> = {
  validate(input: QuoteRevision): ValidationOutcome {
    if (input.revisionNumber < 1) {
      return validationFail([
        {
          field: "revisionNumber",
          code: "invalid",
          message: "revisionNumber must be >= 1",
        },
      ]);
    }
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("quoteId", input.quoteId) ??
      requireNonEmpty("companyId", input.companyId) ??
      validationOk()
    );
  },
};

export const quoteLineStructureValidator: Validator<QuoteLine> = {
  validate(input: QuoteLine): ValidationOutcome {
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
      requireNonEmpty("quoteId", input.quoteId) ??
      requireNonEmpty("revisionId", input.revisionId) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("description", input.description) ??
      validationOk()
    );
  },
};

export const salesOrderStructureValidator: Validator<SalesOrder> = {
  validate(input: SalesOrder): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("number", input.number) ??
      requireNonEmpty("currencyCode", input.currencyCode) ??
      validationOk()
    );
  },
};

export const salesOrderLineStructureValidator: Validator<SalesOrderLine> = {
  validate(input: SalesOrderLine): ValidationOutcome {
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
      requireNonEmpty("salesOrderId", input.salesOrderId) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("description", input.description) ??
      validationOk()
    );
  },
};

export type SalesValidators = {
  readonly opportunity: Validator<Opportunity>;
  readonly quote: Validator<Quote>;
  readonly quoteRevision: Validator<QuoteRevision>;
  readonly quoteLine: Validator<QuoteLine>;
  readonly salesOrder: Validator<SalesOrder>;
  readonly salesOrderLine: Validator<SalesOrderLine>;
};

export function createSalesValidators(): SalesValidators {
  return {
    opportunity: opportunityStructureValidator,
    quote: quoteStructureValidator,
    quoteRevision: quoteRevisionStructureValidator,
    quoteLine: quoteLineStructureValidator,
    salesOrder: salesOrderStructureValidator,
    salesOrderLine: salesOrderLineStructureValidator,
  };
}
