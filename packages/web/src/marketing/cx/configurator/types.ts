/**
 * RC10.3 — Smart Product Configuration types.
 * Additive contracts only; does not alter optimize / consultant engines.
 */

import type { CatalogueProduct } from "../../data/catalogue";

export type DesignPreferences = {
  readonly style?: string;
  readonly color?: string;
  readonly material?: string;
  readonly collection?: string;
};

export type ProductRelationshipType =
  | "Recommended"
  | "Alternatives"
  | "Upgrade"
  | "BudgetOption"
  | "MatchingCollection"
  | "Accessories";

export type AlternativeCard = {
  readonly product: CatalogueProduct;
  readonly priceDeltaPkr: number;
  /** Soft relationship hint from price vs current. */
  readonly relationship: Extract<
    ProductRelationshipType,
    "Alternatives" | "Upgrade" | "BudgetOption"
  >;
};

export type CatalogGapRecord = {
  readonly id: string;
  readonly role: string;
  readonly templateId?: string;
  readonly requiredQty: number;
  readonly availableCount: number;
  /** requiredQty − availableCount (floored at 0). */
  readonly gap: number;
  readonly recordedAt: string;
};

/** Internal ranking / explanation tone — not customer-facing in RC10.3. */
export type RecommendationConfidence = "High" | "Medium" | "Low";

export type CatalogueCollection = {
  readonly id: string;
  readonly name: string;
};
