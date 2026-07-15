/**
 * Sales repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { Opportunity } from "../opportunity/opportunity.js";
import type { Quote, QuoteLine, QuoteRevision } from "../quote/quote.js";
import type { SalesOrder, SalesOrderLine } from "../order/order.js";

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

export interface OpportunityRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Opportunity | null, PlatformError>>;
  save(opportunity: Opportunity): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Opportunity>, PlatformError>>;
}

export interface QuoteRepository {
  findById(key: CompanyScopedId): Promise<Result<Quote | null, PlatformError>>;
  save(quote: Quote): Promise<Result<void, PlatformError>>;
  saveRevision(revision: QuoteRevision): Promise<Result<void, PlatformError>>;
  saveLine(line: QuoteLine): Promise<Result<void, PlatformError>>;
  listLines(
    companyId: string,
    quoteId: string,
    revisionId: string,
  ): Promise<Result<readonly QuoteLine[], PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Quote>, PlatformError>>;
}

export interface SalesOrderRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<SalesOrder | null, PlatformError>>;
  save(order: SalesOrder): Promise<Result<void, PlatformError>>;
  saveLine(line: SalesOrderLine): Promise<Result<void, PlatformError>>;
  listLines(
    companyId: string,
    salesOrderId: string,
  ): Promise<Result<readonly SalesOrderLine[], PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<SalesOrder>, PlatformError>>;
}
