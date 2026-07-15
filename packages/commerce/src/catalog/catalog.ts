/**
 * Catalog foundation — grouping and visibility metadata only.
 * No search indexing. No CMS.
 */

import type { ProductVisibility } from "../product/product.js";

export type CatalogStatus = "draft" | "published" | "archived";

export type Catalog = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly status: CatalogStatus;
  readonly visibility: ProductVisibility;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CatalogEntry = {
  readonly id: string;
  readonly catalogId: string;
  readonly productId: string;
  readonly variantId: string | null;
  readonly sortOrder: number;
  readonly visibilityOverride: ProductVisibility | null;
};
