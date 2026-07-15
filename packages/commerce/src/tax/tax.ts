/**
 * Tax contracts only — no tax calculation.
 */

export type TaxCategoryCode = string;

export type TaxCategory = {
  readonly id: string;
  readonly companyId: string;
  readonly code: TaxCategoryCode;
  readonly name: string;
  readonly description: string | null;
};

export type TaxIdentifierKind =
  | "vat"
  | "gst"
  | "sales_tax"
  | "withholding"
  | "other";

export type TaxIdentifier = {
  readonly id: string;
  readonly companyId: string;
  readonly kind: TaxIdentifierKind;
  readonly value: string;
  readonly countryCode: string;
  readonly ownerType: "customer" | "organization" | "company";
  readonly ownerId: string;
};

/** Opaque tax rule / rate reference — computation elsewhere */
export type TaxReference = {
  readonly id: string;
  readonly companyId: string;
  readonly categoryId: string | null;
  readonly jurisdictionCode: string | null;
  readonly rateRef: string;
};
