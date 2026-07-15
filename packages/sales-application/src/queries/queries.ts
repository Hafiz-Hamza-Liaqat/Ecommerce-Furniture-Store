/**
 * Sales application queries — no transport DTOs.
 */

import { SalesQueryTypes } from "../constants.js";

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
