/**
 * Finance application composition root.
 * Registers handlers into the Phase 5B HandlerRegistry. No HTTP/APIs.
 */

import { HandlerRegistry } from "@afh/application";
import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  AccountRepository,
  CreditRepository,
  InvoiceRepository,
  LedgerRepository,
  PaymentRepository,
} from "@afh/finance";
import {
  createAppendLedgerEntryHandler,
  createCreateFinancialAccountHandler,
  createCreateInvoiceHandler,
  createCreateLedgerHandler,
  createGetCreditAccountHandler,
  createGetFinancialAccountHandler,
  createGetFinancialSummaryHandler,
  createGetInvoiceHandler,
  createGetLedgerHandler,
  createGetPaymentHandler,
  createListFinancialAccountHandler,
  createListInvoiceHandler,
  createListLedgerHandler,
  createListPaymentHandler,
  createRecordCreditAdjustmentHandler,
  createRecordPaymentHandler,
  createUpdateFinancialAccountHandler,
  createUpdateInvoiceHandler,
} from "../handlers/index.js";
import type { FinanceHandlerDeps } from "../handlers/deps.js";

export type CreateFinanceApplicationOptions = {
  readonly accounts: AccountRepository;
  readonly invoices: InvoiceRepository;
  readonly payments: PaymentRepository;
  readonly ledgers: LedgerRepository;
  readonly credits: CreditRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type FinanceApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: FinanceHandlerDeps;
};

/**
 * Wires Finance command/query handlers into a HandlerRegistry.
 * Host then passes `handlers` to `createApplicationRuntime({ handlers, ... })`.
 */
export function createFinanceApplication(
  options: CreateFinanceApplicationOptions,
): FinanceApplication {
  const deps: FinanceHandlerDeps = {
    accounts: options.accounts,
    invoices: options.invoices,
    payments: options.payments,
    ledgers: options.ledgers,
    credits: options.credits,
    outbox: options.outbox,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();

  handlers.registerCommand(createCreateFinancialAccountHandler(deps));
  handlers.registerCommand(createUpdateFinancialAccountHandler(deps));
  handlers.registerCommand(createCreateInvoiceHandler(deps));
  handlers.registerCommand(createUpdateInvoiceHandler(deps));
  handlers.registerCommand(createRecordPaymentHandler(deps));
  handlers.registerCommand(createRecordCreditAdjustmentHandler(deps));
  handlers.registerCommand(createCreateLedgerHandler(deps));
  handlers.registerCommand(createAppendLedgerEntryHandler(deps));

  handlers.registerQuery(createGetFinancialAccountHandler(deps));
  handlers.registerQuery(createGetInvoiceHandler(deps));
  handlers.registerQuery(createGetPaymentHandler(deps));
  handlers.registerQuery(createGetLedgerHandler(deps));
  handlers.registerQuery(createGetCreditAccountHandler(deps));
  handlers.registerQuery(createGetFinancialSummaryHandler(deps));
  handlers.registerQuery(createListFinancialAccountHandler(deps));
  handlers.registerQuery(createListInvoiceHandler(deps));
  handlers.registerQuery(createListPaymentHandler(deps));
  handlers.registerQuery(createListLedgerHandler(deps));

  return { handlers, deps };
}
