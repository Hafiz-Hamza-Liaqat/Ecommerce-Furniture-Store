/**
 * Financial repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { FinancialAccount } from "../account/account.js";
import type {
  FinancialLedger,
  FinancialLedgerEntry,
} from "../ledger/ledger.js";
import type { Invoice, InvoiceLine } from "../invoice/invoice.js";
import type { Payment } from "../payment/payment.js";
import type {
  CreditAccount,
  CreditAdjustment,
  CreditLimit,
} from "../credit/credit.js";
import type { TaxProfile, TaxRegistration } from "../tax/tax.js";

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

export interface AccountRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<FinancialAccount | null, PlatformError>>;
  findByIdWithVersion(
    key: CompanyScopedId,
  ): Promise<
    Result<{ entity: FinancialAccount; version: number } | null, PlatformError>
  >;
  save(
    account: FinancialAccount,
    options?: { readonly expectedVersion?: number },
  ): Promise<Result<void, PlatformError>>;
  remove(key: CompanyScopedId): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<FinancialAccount>, PlatformError>>;
}

export interface LedgerRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<FinancialLedger | null, PlatformError>>;
  save(ledger: FinancialLedger): Promise<Result<void, PlatformError>>;
  /** Append-only contract — no update/delete of entries */
  appendEntry(
    entry: FinancialLedgerEntry,
  ): Promise<Result<void, PlatformError>>;
  listEntries(
    companyId: string,
    ledgerId: string,
    page?: PageRequest,
  ): Promise<Result<Page<FinancialLedgerEntry>, PlatformError>>;
  /**
   * RC7.2d — company-scoped bounded candidates for ListLedger (headers only).
   * Repository contract completion for RC7.1 authorized-list; not a new capability.
   */
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<FinancialLedger>, PlatformError>>;
}

export interface InvoiceRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Invoice | null, PlatformError>>;
  save(invoice: Invoice): Promise<Result<void, PlatformError>>;
  saveLine(line: InvoiceLine): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Invoice>, PlatformError>>;
  listLines(
    companyId: string,
    invoiceId: string,
  ): Promise<Result<readonly InvoiceLine[], PlatformError>>;
}

export interface PaymentRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Payment | null, PlatformError>>;
  save(payment: Payment): Promise<Result<void, PlatformError>>;
  listByInvoice(
    companyId: string,
    invoiceId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Payment>, PlatformError>>;
  /**
   * RC7.2d — company-scoped bounded candidates for ListPayment.
   * Repository contract completion for RC7.1 authorized-list; not a new capability.
   */
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Payment>, PlatformError>>;
}

export interface CreditRepository {
  findAccountById(
    key: CompanyScopedId,
  ): Promise<Result<CreditAccount | null, PlatformError>>;
  saveAccount(account: CreditAccount): Promise<Result<void, PlatformError>>;
  saveLimit(limit: CreditLimit): Promise<Result<void, PlatformError>>;
  saveAdjustment(
    adjustment: CreditAdjustment,
  ): Promise<Result<void, PlatformError>>;
  listAdjustments(
    companyId: string,
    creditAccountId: string,
    page?: PageRequest,
  ): Promise<Result<Page<CreditAdjustment>, PlatformError>>;
}

export interface TaxProfileRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<TaxProfile | null, PlatformError>>;
  save(profile: TaxProfile): Promise<Result<void, PlatformError>>;
  saveRegistration(
    registration: TaxRegistration,
  ): Promise<Result<void, PlatformError>>;
}
