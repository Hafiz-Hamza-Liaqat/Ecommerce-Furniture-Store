/**
 * Sales application composition root.
 * Registers handlers into the Phase 5B HandlerRegistry. No HTTP/APIs.
 */

import { HandlerRegistry } from "@afh/application";
import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  OpportunityRepository,
  QuoteRepository,
  SalesOrderRepository,
} from "@afh/sales";
import {
  createCancelSalesOrderHandler,
  createCreateOpportunityHandler,
  createCreateQuoteHandler,
  createCreateSalesOrderHandler,
  createGetCustomerSalesSummaryHandler,
  createGetOpportunityHandler,
  createGetQuoteHandler,
  createGetSalesOrderHandler,
  createReviseQuoteHandler,
  createUpdateOpportunityHandler,
} from "../handlers/index.js";
import type { SalesHandlerDeps } from "../handlers/deps.js";

export type CreateSalesApplicationOptions = {
  readonly opportunities: OpportunityRepository;
  readonly quotes: QuoteRepository;
  readonly orders: SalesOrderRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
  /** Existing registry to register into (e.g. shared with createApplicationRuntime) */
  readonly handlers?: HandlerRegistry;
};

export type SalesApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: SalesHandlerDeps;
};

/**
 * Wires Sales command/query handlers and validators into a HandlerRegistry.
 * Host then passes `handlers` to `createApplicationRuntime({ handlers, ... })`.
 */
export function createSalesApplication(
  options: CreateSalesApplicationOptions,
): SalesApplication {
  const deps: SalesHandlerDeps = {
    opportunities: options.opportunities,
    quotes: options.quotes,
    orders: options.orders,
    outbox: options.outbox,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();

  handlers.registerCommand(createCreateOpportunityHandler(deps));
  handlers.registerCommand(createUpdateOpportunityHandler(deps));
  handlers.registerCommand(createCreateQuoteHandler(deps));
  handlers.registerCommand(createReviseQuoteHandler(deps));
  handlers.registerCommand(createCreateSalesOrderHandler(deps));
  handlers.registerCommand(createCancelSalesOrderHandler(deps));

  handlers.registerQuery(createGetOpportunityHandler(deps));
  handlers.registerQuery(createGetQuoteHandler(deps));
  handlers.registerQuery(createGetSalesOrderHandler(deps));
  handlers.registerQuery(createGetCustomerSalesSummaryHandler(deps));

  return { handlers, deps };
}
