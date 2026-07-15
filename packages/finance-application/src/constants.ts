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

export const FinancePolicyActions = {
  AccountCreate: "finance.account.create",
  AccountUpdate: "finance.account.update",
  AccountRead: "finance.account.read",
  InvoiceCreate: "finance.invoice.create",
  InvoiceUpdate: "finance.invoice.update",
  InvoiceRead: "finance.invoice.read",
  PaymentRecord: "finance.payment.record",
  PaymentRead: "finance.payment.read",
  CreditAdjust: "finance.credit.adjust",
  CreditRead: "finance.credit.read",
  LedgerCreate: "finance.ledger.create",
  LedgerAppend: "finance.ledger.append",
  LedgerRead: "finance.ledger.read",
  SummaryRead: "finance.summary.read",
} as const;

export const FinanceApprovalTypes = {
  InvoiceIssue: "finance.invoice_issue",
  CreditWriteOff: "finance.credit_write_off",
  LargePayment: "finance.large_payment",
} as const;
