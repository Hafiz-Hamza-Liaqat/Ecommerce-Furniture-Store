/**
 * Financial ledger contracts — no posting engine, no balancing logic.
 * Money movements remain append-only in later phases (Architecture Law).
 */

import type { Money } from "../money/money.js";

export type FinancialLedgerKind =
  | "general"
  | "accounts_receivable"
  | "accounts_payable"
  | "commission"
  | "other";

export type FinancialLedger = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly kind: FinancialLedgerKind;
  readonly currencyCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type LedgerEntrySide = "debit" | "credit";

export type FinancialLedgerEntry = {
  readonly id: string;
  readonly companyId: string;
  readonly ledgerId: string;
  readonly accountId: string;
  readonly side: LedgerEntrySide;
  readonly amount: Money;
  readonly postingRef: string | null;
  readonly balanceRef: string | null;
  readonly correlationId: string | null;
  readonly causationId: string | null;
  readonly subjectType: string | null;
  readonly subjectId: string | null;
  readonly occurredAt: string;
  readonly recordedAt: string;
};

/** Opaque posting batch / journal reference */
export type PostingReference = {
  readonly postingId: string;
  readonly ledgerId: string;
  readonly companyId: string;
};

/** Opaque balance snapshot reference — no calculation here */
export type BalanceReference = {
  readonly accountId: string;
  readonly ledgerId: string;
  readonly asOf: string;
  readonly balanceRef: string;
};
