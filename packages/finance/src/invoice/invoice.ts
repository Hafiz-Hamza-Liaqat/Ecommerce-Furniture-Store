/**
 * Invoice contracts — no invoice lifecycle / workflow.
 */

import type { Money } from "../money/money.js";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "void"
  | "cancelled";

export type Invoice = {
  readonly id: string;
  readonly companyId: string;
  readonly number: string;
  readonly status: InvoiceStatus;
  readonly currencyCode: string;
  readonly customerId: string | null;
  readonly organizationId: string | null;
  readonly billToAddressId: string | null;
  readonly issuedAt: string | null;
  readonly dueAt: string | null;
  readonly subtotal: Money | null;
  readonly taxTotal: Money | null;
  readonly total: Money | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type InvoiceLine = {
  readonly id: string;
  readonly invoiceId: string;
  readonly companyId: string;
  readonly lineNumber: number;
  readonly description: string;
  readonly quantity: number;
  readonly unitCode: string | null;
  readonly unitAmount: Money | null;
  readonly lineAmount: Money | null;
  readonly taxCategoryId: string | null;
  readonly productId: string | null;
  readonly variantId: string | null;
};

export type InvoiceReference = {
  readonly invoiceId: string;
  readonly companyId: string;
  readonly number: string | null;
};
