/**
 * Currency and Money value objects — no exchange service.
 */

export type CurrencyCode = string;

export type Currency = {
  readonly code: CurrencyCode;
  readonly name: string;
  readonly minorUnits: number;
  readonly symbol: string | null;
};

/**
 * Monetary amount in minor units (e.g. cents) to avoid floating-point drift.
 */
export type Money = {
  readonly currencyCode: CurrencyCode;
  readonly amountMinor: bigint;
};

export function money(currencyCode: CurrencyCode, amountMinor: bigint): Money {
  return { currencyCode, amountMinor };
}

export function sameCurrency(a: Money, b: Money): boolean {
  return a.currencyCode === b.currencyCode;
}

/**
 * Exchange rate reference only — no conversion engine.
 */
export type ExchangeRateReference = {
  readonly id: string;
  readonly baseCurrencyCode: CurrencyCode;
  readonly quoteCurrencyCode: CurrencyCode;
  readonly rateRef: string;
  readonly asOf: string;
};
