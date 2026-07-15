/**
 * SQL adapters for Sales domain repositories.
 */

import type { Clock } from "@afh/shared-kernel";
import type {
  Opportunity,
  OpportunityRepository,
  Quote,
  QuoteLine,
  QuoteRepository,
  QuoteRevision,
  SalesOrder,
  SalesOrderLine,
  SalesOrderRepository,
} from "@afh/sales";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlDocumentRepository } from "../mapping/document-repository.js";

export function createSqlOpportunityRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): OpportunityRepository {
  const docs = new SqlDocumentRepository<Opportunity>(
    client,
    "sales.opportunity",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlQuoteRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): QuoteRepository {
  const docs = new SqlDocumentRepository<Quote>(client, "sales.quote", clock);
  const revisions = new SqlDocumentRepository<QuoteRevision>(
    client,
    "sales.quote_revision",
    clock,
  );
  const lines = new SqlDocumentRepository<QuoteLine>(
    client,
    "sales.quote_line",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveRevision: (revision) => revisions.save(revision, revision.quoteId),
    saveLine: (line) =>
      lines.save(line, `${line.quoteId}:${line.revisionId}`),
    listLines: (companyId, quoteId, revisionId) =>
      lines.listByParent(companyId, `${quoteId}:${revisionId}`),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlSalesOrderRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SalesOrderRepository {
  const docs = new SqlDocumentRepository<SalesOrder>(
    client,
    "sales.sales_order",
    clock,
  );
  const lines = new SqlDocumentRepository<SalesOrderLine>(
    client,
    "sales.sales_order_line",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveLine: (line) => lines.save(line, line.salesOrderId),
    listLines: (companyId, salesOrderId) =>
      lines.listByParent(companyId, salesOrderId),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}
