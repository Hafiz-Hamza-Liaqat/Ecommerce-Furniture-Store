/**
 * Tax foundation — reuses Phase 3A TaxCategory / TaxReference / TaxIdentifier.
 * Adds TaxProfile and TaxRegistration. No tax calculations.
 */

export type {
  TaxCategoryCode,
  TaxCategory,
  TaxIdentifierKind,
  TaxIdentifier,
  TaxReference,
} from "@afh/commerce";

export type TaxProfileStatus = "draft" | "active" | "inactive";

export type TaxProfile = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly status: TaxProfileStatus;
  readonly defaultCategoryId: string | null;
  readonly jurisdictionCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type TaxRegistration = {
  readonly id: string;
  readonly companyId: string;
  readonly taxIdentifierId: string;
  readonly profileId: string | null;
  readonly registeredName: string | null;
  readonly countryCode: string;
  readonly validFrom: string | null;
  readonly validTo: string | null;
};
