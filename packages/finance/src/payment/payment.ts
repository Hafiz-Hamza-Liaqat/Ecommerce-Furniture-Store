/**
 * Payment abstractions — no gateway integration, capture, or refund execution.
 */

import type { Money } from "../money/money.js";

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

export type PaymentMethodKind =
  | "card"
  | "bank_transfer"
  | "cash"
  | "wallet"
  | "credit"
  | "other";

export type PaymentMethodReference = {
  readonly methodId: string;
  readonly kind: PaymentMethodKind;
  readonly label: string | null;
};

export type Payment = {
  readonly id: string;
  readonly companyId: string;
  readonly status: PaymentStatus;
  readonly amount: Money;
  readonly method: PaymentMethodReference | null;
  readonly invoiceId: string | null;
  readonly payerCustomerId: string | null;
  readonly payerOrganizationId: string | null;
  readonly externalRef: string | null;
  readonly correlationId: string | null;
  readonly recordedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type PaymentReference = {
  readonly paymentId: string;
  readonly companyId: string;
  readonly externalRef: string | null;
};
