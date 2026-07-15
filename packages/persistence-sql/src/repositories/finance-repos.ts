/**
 * SQL adapters for Finance domain repositories.
 */

import {
  isOffsetPagination,
  ok,
  type Clock,
  type Page,
  type PageRequest,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type {
  AccountRepository,
  CreditAccount,
  CreditAdjustment,
  CreditLimit,
  CreditRepository,
  FinancialAccount,
  FinancialLedger,
  FinancialLedgerEntry,
  Invoice,
  InvoiceLine,
  InvoiceRepository,
  LedgerRepository,
  Payment,
  PaymentRepository,
  TaxProfile,
  TaxProfileRepository,
  TaxRegistration,
} from "@afh/finance";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlDocumentRepository } from "../mapping/document-repository.js";

type FinLedgerRow = {
  id: string;
  company_id: string;
  ledger_id: string | null;
  payload_json: string;
  created_at: string;
};

function pageBounds(page?: PageRequest): {
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
} {
  if (page && isOffsetPagination(page)) {
    const pageSize = Math.max(1, page.pageSize);
    const pageNum = Math.max(1, page.page);
    return {
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      page: pageNum,
      pageSize,
    };
  }
  return { limit: 100, offset: 0, page: 1, pageSize: 100 };
}

export function createSqlFinancialAccountRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): AccountRepository {
  const docs = new SqlDocumentRepository<FinancialAccount>(
    client,
    "finance.account",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    remove: (key) => docs.remove(key),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlFinanceLedgerRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): LedgerRepository {
  const docs = new SqlDocumentRepository<FinancialLedger>(
    client,
    "finance.ledger",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (ledger) => docs.save(ledger),
    appendEntry: async (
      entry,
    ): Promise<Result<void, PlatformError>> => {
      const now = clock.now().toISOString();
      client.run(
        `INSERT INTO financial_ledger_entries
          (id, company_id, ledger_id, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.companyId,
          entry.ledgerId,
          JSON.stringify(entry),
          now,
        ],
      );
      return ok(undefined);
    },
    listEntries: async (
      companyId,
      ledgerId,
      page,
    ): Promise<Result<Page<FinancialLedgerEntry>, PlatformError>> => {
      const bounds = pageBounds(page);
      const total = client.get<{ c: number }>(
        `SELECT COUNT(1) AS c FROM financial_ledger_entries
         WHERE company_id = ? AND ledger_id = ?`,
        [companyId, ledgerId],
      );
      const rows = client.all<FinLedgerRow>(
        `SELECT * FROM financial_ledger_entries
         WHERE company_id = ? AND ledger_id = ?
         ORDER BY created_at ASC
         LIMIT ? OFFSET ?`,
        [companyId, ledgerId, bounds.limit, bounds.offset],
      );
      const items = rows.map(
        (r) => JSON.parse(r.payload_json) as FinancialLedgerEntry,
      );
      return ok({
        items,
        totalCount: total?.c ?? items.length,
        page: bounds.page,
        pageSize: bounds.pageSize,
        nextCursor: null,
        hasMore: (total?.c ?? 0) > bounds.offset + items.length,
      });
    },
  };
}

export function createSqlInvoiceRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): InvoiceRepository {
  const docs = new SqlDocumentRepository<Invoice>(
    client,
    "finance.invoice",
    clock,
  );
  const lines = new SqlDocumentRepository<InvoiceLine>(
    client,
    "finance.invoice_line",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveLine: (line) => lines.save(line, line.invoiceId),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
    listLines: (companyId, invoiceId) =>
      lines.listByParent(companyId, invoiceId),
  };
}

export function createSqlPaymentRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): PaymentRepository {
  const docs = new SqlDocumentRepository<Payment>(
    client,
    "finance.payment",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (payment) => docs.save(payment, payment.invoiceId),
    listByInvoice: (companyId, invoiceId, page) =>
      docs.listByParentScoped(companyId, invoiceId, page),
  };
}

export function createSqlCreditRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): CreditRepository {
  const accounts = new SqlDocumentRepository<CreditAccount>(
    client,
    "finance.credit_account",
    clock,
  );
  const limits = new SqlDocumentRepository<CreditLimit>(
    client,
    "finance.credit_limit",
    clock,
  );
  const adjustments = new SqlDocumentRepository<CreditAdjustment>(
    client,
    "finance.credit_adjustment",
    clock,
  );
  return {
    findAccountById: (key) => accounts.findById(key),
    saveAccount: (account) => accounts.save(account),
    saveLimit: (limit) => limits.save(limit, limit.creditAccountId),
    saveAdjustment: (adjustment) =>
      adjustments.save(adjustment, adjustment.creditAccountId),
    listAdjustments: (companyId, creditAccountId, page) =>
      adjustments.listByParentScoped(companyId, creditAccountId, page),
  };
}

export function createSqlTaxProfileRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): TaxProfileRepository {
  const profiles = new SqlDocumentRepository<TaxProfile>(
    client,
    "finance.tax_profile",
    clock,
  );
  const registrations = new SqlDocumentRepository<TaxRegistration>(
    client,
    "finance.tax_registration",
    clock,
  );
  return {
    findById: (key) => profiles.findById(key),
    save: (profile) => profiles.save(profile),
    saveRegistration: (registration) =>
      registrations.save(registration, registration.profileId),
  };
}
