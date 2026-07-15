/**
 * Financial domain event contracts — no publishers, no Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type InvoiceCreatedPayload = {
  readonly invoiceId: string;
  readonly companyId: string;
};

export type PaymentRecordedPayload = {
  readonly paymentId: string;
  readonly companyId: string;
  readonly invoiceId: string | null;
};

export type CreditAdjustedPayload = {
  readonly creditAccountId: string;
  readonly companyId: string;
  readonly adjustmentId: string;
};

export type LedgerEntryCreatedPayload = {
  readonly ledgerEntryId: string;
  readonly companyId: string;
  readonly ledgerId: string;
  readonly accountId: string;
};

export const FinancialEventTypes = {
  InvoiceCreated: "finance.invoice.created",
  PaymentRecorded: "finance.payment.recorded",
  CreditAdjusted: "finance.credit.adjusted",
  LedgerEntryCreated: "finance.ledger.entry_created",
} as const;

export type FinancialEventType =
  (typeof FinancialEventTypes)[keyof typeof FinancialEventTypes];

export type FinancialDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: FinancialEventType | string;
  };
};

export type InvoiceCreatedEvent = FinancialDomainEvent<InvoiceCreatedPayload>;
export type PaymentRecordedEvent =
  FinancialDomainEvent<PaymentRecordedPayload>;
export type CreditAdjustedEvent = FinancialDomainEvent<CreditAdjustedPayload>;
export type LedgerEntryCreatedEvent =
  FinancialDomainEvent<LedgerEntryCreatedPayload>;
