/**
 * Sales application queries — no transport DTOs.
 */

import type { ListQueryRequest } from "@afh/shared-kernel";
import { SalesQueryTypes } from "../constants.js";

/** RC7.2a — shared List* envelope (companyId + optional criteria / q). */
export type ListOpportunityPayload = ListQueryRequest;
export type ListQuotePayload = ListQueryRequest;
export type ListSalesOrderPayload = ListQueryRequest;

export type GetOpportunityPayload = {
  readonly companyId: string;
  readonly opportunityId: string;
};

export type GetQuotePayload = {
  readonly companyId: string;
  readonly quoteId: string;
  readonly includeLines?: boolean;
};

export type GetSalesOrderPayload = {
  readonly companyId: string;
  readonly salesOrderId: string;
  readonly includeLines?: boolean;
};

export type GetCustomerSalesSummaryPayload = {
  readonly companyId: string;
  readonly customerId: string;
};

export type CustomerSalesSummary = {
  readonly companyId: string;
  readonly customerId: string;
  readonly opportunityCount: number;
  readonly quoteCount: number;
  readonly orderCount: number;
  readonly openOpportunityIds: readonly string[];
  readonly draftQuoteIds: readonly string[];
  readonly activeOrderIds: readonly string[];
};

export { SalesQueryTypes };
