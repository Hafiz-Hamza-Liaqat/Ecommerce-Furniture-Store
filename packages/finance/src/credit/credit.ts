/**
 * Credit foundation — no approval logic.
 */

import type { Money } from "../money/money.js";

export type CreditAccountStatus = "active" | "suspended" | "closed";

export type CreditAccount = {
  readonly id: string;
  readonly companyId: string;
  readonly ownerType: "customer" | "organization";
  readonly ownerId: string;
  readonly status: CreditAccountStatus;
  readonly currencyCode: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CreditLimit = {
  readonly id: string;
  readonly companyId: string;
  readonly creditAccountId: string;
  readonly limitAmount: Money;
  readonly effectiveFrom: string | null;
  readonly effectiveTo: string | null;
};

export type CreditAdjustmentKind =
  | "increase"
  | "decrease"
  | "write_off"
  | "reinstatement"
  | "other";

export type CreditAdjustment = {
  readonly id: string;
  readonly companyId: string;
  readonly creditAccountId: string;
  readonly kind: CreditAdjustmentKind;
  readonly amount: Money;
  readonly reason: string | null;
  readonly correlationId: string | null;
  readonly occurredAt: string;
  readonly createdAt: string;
};

export type CreditReference = {
  readonly creditAccountId: string;
  readonly companyId: string;
};
