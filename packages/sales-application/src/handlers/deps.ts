/**
 * Shared handler dependencies injected by createSalesApplication().
 */

import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  OpportunityRepository,
  QuoteRepository,
  SalesOrderRepository,
} from "@afh/sales";

export type SalesHandlerDeps = {
  readonly opportunities: OpportunityRepository;
  readonly quotes: QuoteRepository;
  readonly orders: SalesOrderRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
};
