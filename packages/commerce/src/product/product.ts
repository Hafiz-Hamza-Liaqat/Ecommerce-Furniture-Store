/**
 * Product foundation — no pricing, inventory, stock, or search.
 */

import type { Dimensions, Weight } from "../units/units.js";

export type ProductStatus = "draft" | "active" | "inactive" | "discontinued";

export type ProductVisibility = "public" | "authenticated" | "b2b" | "internal";

export type ProductType = "ready" | "made_to_order" | "customizable" | "service_sku";

export type BrandReference = {
  readonly id: string;
  readonly code: string;
  readonly name: string;
};

export type CategoryReference = {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly parentId: string | null;
};

export type Product = {
  readonly id: string;
  readonly companyId: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly productType: ProductType;
  readonly status: ProductStatus;
  readonly visibility: ProductVisibility;
  readonly category: CategoryReference | null;
  readonly brand: BrandReference | null;
  readonly defaultUnitCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ProductVariant = {
  readonly id: string;
  readonly companyId: string;
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly status: ProductStatus;
  readonly visibility: ProductVisibility;
  readonly unitCode: string | null;
  readonly dimensions: Dimensions | null;
  readonly weight: Weight | null;
  readonly attributes: Readonly<Record<string, string>>;
  readonly createdAt: string;
  readonly updatedAt: string;
};
