/**
 * Financial account foundation — no chart-of-accounts behavior.
 */

export type FinancialAccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense"
  | "clearing"
  | "memo"
  | "other";

export type FinancialAccountStatus = "draft" | "active" | "inactive" | "closed";

export type FinancialAccount = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly accountType: FinancialAccountType;
  readonly status: FinancialAccountStatus;
  readonly currencyCode: string | null;
  readonly parentAccountId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type AccountReference = {
  readonly accountId: string;
  readonly companyId: string;
  readonly code: string | null;
};
