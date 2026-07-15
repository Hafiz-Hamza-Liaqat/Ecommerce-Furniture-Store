/**
 * Money foundation — reuses Phase 3A Commerce Money/Currency.
 * Adds precision and rounding references only. No exchange calculations.
 */

export {
  money,
  sameCurrency,
} from "@afh/commerce";
export type {
  CurrencyCode,
  Currency,
  Money,
  ExchangeRateReference,
} from "@afh/commerce";

/** Opaque currency pointer used by financial documents */
export type CurrencyReference = {
  readonly currencyCode: string;
  readonly name: string | null;
};

/**
 * Decimal precision for financial amounts (display / rounding context).
 * Actual Money remains integer minor units from Commerce.
 */
export type Precision = {
  readonly scale: number;
  readonly currencyCode: string | null;
};

export type RoundingMode =
  | "half_up"
  | "half_even"
  | "half_down"
  | "ceiling"
  | "floor"
  | "other";

/** Opaque rounding policy reference — application via Rules Engine later */
export type RoundingModeReference = {
  readonly id: string;
  readonly mode: RoundingMode;
  readonly label: string | null;
};
