import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  AccountRepository,
  CreditRepository,
  InvoiceRepository,
  LedgerRepository,
  PaymentRepository,
} from "@afh/finance";

export type FinanceHandlerDeps = {
  readonly accounts: AccountRepository;
  readonly invoices: InvoiceRepository;
  readonly payments: PaymentRepository;
  readonly ledgers: LedgerRepository;
  readonly credits: CreditRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
};
