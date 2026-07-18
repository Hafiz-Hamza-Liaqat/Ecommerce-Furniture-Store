/**
 * Finance application constants.
 */

export const FinanceCommandTypes = {
  CreateFinancialAccount: "finance.CreateFinancialAccount",
  UpdateFinancialAccount: "finance.UpdateFinancialAccount",
  CreateInvoice: "finance.CreateInvoice",
  UpdateInvoice: "finance.UpdateInvoice",
  RecordPayment: "finance.RecordPayment",
  RecordCreditAdjustment: "finance.RecordCreditAdjustment",
  CreateLedger: "finance.CreateLedger",
  AppendLedgerEntry: "finance.AppendLedgerEntry",
} as const;

export const FinanceQueryTypes = {
  GetFinancialAccount: "finance.GetFinancialAccount",
  GetInvoice: "finance.GetInvoice",
  GetPayment: "finance.GetPayment",
  GetLedger: "finance.GetLedger",
  GetCreditAccount: "finance.GetCreditAccount",
  GetFinancialSummary: "finance.GetFinancialSummary",
  ListFinancialAccount: "finance.ListFinancialAccount",
  ListInvoice: "finance.ListInvoice",
  ListPayment: "finance.ListPayment",
  ListLedger: "finance.ListLedger",
} as const;

export const FinanceWorkflowCodes = {
  FinancialAccount: "finance_account_v1",
  Invoice: "finance_invoice_v1",
  Payment: "finance_payment_v1",
} as const;

export const FinanceSubjectTypes = {
  FinancialAccount: "finance.account",
  Invoice: "finance.invoice",
  Payment: "finance.payment",
  Ledger: "finance.ledger",
  CreditAccount: "finance.credit_account",
} as const;

/** Rules remain external — tax, pricing, FX, credit policy */
export const FinanceRuleSetCodes = {
  Tax: "finance.tax",
  CreditPolicy: "finance.credit_policy",
  ExchangeRate: "finance.exchange_rate",
  Pricing: "finance.pricing",
  Discount: "finance.discount",
  PaymentPolicy: "finance.payment_policy",
  PostingPolicy: "finance.posting_policy",
} as const;

/**
 * Canonical RC5 permission codes (`<module>.<resource>.<action>`), normalized
 * from legacy executable keys in RC5.3 per the frozen RC5.1 mapping. The seed
 * keeps granting the legacy compatibility codes as the documented overlap
 * window for rollback.
 */
export const FinancePolicyActions = {
  AccountCreate: "finance.accounts.create",
  AccountUpdate: "finance.accounts.update",
  AccountRead: "finance.accounts.read",
  InvoiceCreate: "finance.invoices.create",
  InvoiceUpdate: "finance.invoices.update",
  InvoiceRead: "finance.invoices.read",
  PaymentRecord: "finance.payments.record",
  PaymentRead: "finance.payments.read",
  CreditAdjust: "finance.credit_accounts.adjust",
  CreditRead: "finance.credit_accounts.read",
  LedgerCreate: "finance.ledgers.create",
  LedgerAppend: "finance.ledgers.append",
  LedgerRead: "finance.ledgers.read",
  SummaryRead: "finance.summary.read",
} as const;

export const FinanceApprovalTypes = {
  InvoiceIssue: "finance.invoice_issue",
  CreditWriteOff: "finance.credit_write_off",
  LargePayment: "finance.large_payment",
} as const;
