/**
 * Finance application queries — no transport DTOs.
 */

import type { ListQueryRequest, PageRequest } from "@afh/shared-kernel";
import { FinanceQueryTypes } from "../constants.js";

/** RC7.2d — shared List* envelope (companyId + optional criteria / q). */
export type ListFinancialAccountPayload = ListQueryRequest;
export type ListInvoicePayload = ListQueryRequest;
export type ListPaymentPayload = ListQueryRequest;
export type ListLedgerPayload = ListQueryRequest;

export type GetFinancialAccountPayload = {
  readonly companyId: string;
  readonly accountId: string;
};

export type GetInvoicePayload = {
  readonly companyId: string;
  readonly invoiceId: string;
  readonly includeLines?: boolean;
};

export type GetPaymentPayload = {
  readonly companyId: string;
  readonly paymentId: string;
};

export type GetLedgerPayload = {
  readonly companyId: string;
  readonly ledgerId: string;
  readonly includeEntries?: boolean;
  readonly page?: PageRequest;
};

export type GetCreditAccountPayload = {
  readonly companyId: string;
  readonly creditAccountId: string;
  readonly includeAdjustments?: boolean;
  readonly page?: PageRequest;
};

export type GetFinancialSummaryPayload = {
  readonly companyId: string;
};

export type FinancialSummary = {
  readonly companyId: string;
  readonly accountCount: number;
  readonly invoiceCount: number;
  readonly draftInvoiceIds: readonly string[];
  readonly issuedInvoiceIds: readonly string[];
  readonly activeCreditAccountIds: readonly string[];
};

export { FinanceQueryTypes };
