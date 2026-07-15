/**
 * Pricing contracts only — no calculations (Rules Engine owns those).
 */

import type { CurrencyCode } from "../currency/currency.js";

export type PriceSource =
  | "list"
  | "contract"
  | "promotional"
  | "manual"
  | "rules_engine"
  | "other";

export type PriceReference = {
  readonly id: string;
  readonly companyId: string;
  readonly productId: string | null;
  readonly variantId: string | null;
  readonly currencyCode: CurrencyCode;
  /** Opaque reference to a priced amount (not computed here) */
  readonly amountRef: string;
  readonly source: PriceSource;
  readonly validFrom: string | null;
  readonly validTo: string | null;
};

export type DiscountReference = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly label: string | null;
  /** Opaque discount definition ref — evaluation via Rules Engine */
  readonly definitionRef: string;
};
