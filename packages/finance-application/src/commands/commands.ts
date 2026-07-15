/**
 * Finance application commands — intent only.
 * Tax/pricing/FX/credit policy remain in Rules (amount refs as opaque Money).
 */

import type {
  CreditAdjustmentKind,
  FinancialAccountType,
  FinancialLedgerKind,
  LedgerEntrySide,
  PaymentMethodKind,
} from "@afh/finance";
import { FinanceCommandTypes } from "../constants.js";

/** Intent money — amountMinor as string to keep command JSON-friendly */
export type MoneyIntent = {
  readonly currencyCode: string;
  readonly amountMinor: string;
};

export type CreateFinancialAccountPayload = {
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly accountType: FinancialAccountType;
  readonly currencyCode?: string | null;
  readonly parentAccountId?: string | null;
};

export type UpdateFinancialAccountPayload = {
  readonly companyId: string;
  readonly accountId: string;
  readonly code?: string | null;
  readonly name?: string | null;
  readonly accountType?: FinancialAccountType | null;
  readonly currencyCode?: string | null;
  readonly parentAccountId?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type InvoiceLineIntent = {
  readonly description: string;
  readonly quantity: number;
  readonly unitCode?: string | null;
  readonly unitAmount?: MoneyIntent | null;
  readonly lineAmount?: MoneyIntent | null;
  readonly taxCategoryId?: string | null;
  readonly productId?: string | null;
  readonly variantId?: string | null;
};

export type CreateInvoicePayload = {
  readonly companyId: string;
  readonly number: string;
  readonly currencyCode: string;
  readonly customerId?: string | null;
  readonly organizationId?: string | null;
  readonly billToAddressId?: string | null;
  readonly issuedAt?: string | null;
  readonly dueAt?: string | null;
  readonly lines: readonly InvoiceLineIntent[];
};

export type UpdateInvoicePayload = {
  readonly companyId: string;
  readonly invoiceId: string;
  readonly number?: string | null;
  readonly customerId?: string | null;
  readonly organizationId?: string | null;
  readonly billToAddressId?: string | null;
  readonly issuedAt?: string | null;
  readonly dueAt?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  readonly requireApproval?: boolean;
};

export type RecordPaymentPayload = {
  readonly companyId: string;
  readonly amount: MoneyIntent;
  readonly invoiceId?: string | null;
  readonly payerCustomerId?: string | null;
  readonly payerOrganizationId?: string | null;
  readonly methodKind?: PaymentMethodKind | null;
  readonly methodId?: string | null;
  readonly methodLabel?: string | null;
  readonly externalRef?: string | null;
  readonly requireApproval?: boolean;
};

export type RecordCreditAdjustmentPayload = {
  readonly companyId: string;
  readonly creditAccountId: string;
  readonly kind: CreditAdjustmentKind;
  readonly amount: MoneyIntent;
  readonly reason?: string | null;
  readonly requireApproval?: boolean;
};

export type CreateLedgerPayload = {
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly kind: FinancialLedgerKind;
  readonly currencyCode?: string | null;
};

export type AppendLedgerEntryPayload = {
  readonly companyId: string;
  readonly ledgerId: string;
  readonly accountId: string;
  readonly side: LedgerEntrySide;
  readonly amount: MoneyIntent;
  readonly postingRef?: string | null;
  readonly balanceRef?: string | null;
  readonly subjectType?: string | null;
  readonly subjectId?: string | null;
  readonly occurredAt?: string | null;
};

export { FinanceCommandTypes };
