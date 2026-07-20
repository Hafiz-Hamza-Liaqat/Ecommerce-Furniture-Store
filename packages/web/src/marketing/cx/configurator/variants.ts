/**
 * RC10.3 — Variant price + grouping helpers.
 */

import {
  resolveVariantPrice,
  type CatalogueProduct,
  type ProductVariant,
} from "../../data/catalogue";

export type VariantGroup = {
  readonly group: ProductVariant["group"];
  readonly variants: readonly ProductVariant[];
};

const GROUP_ORDER: readonly ProductVariant["group"][] = [
  "color",
  "material",
  "finish",
  "dimensions",
  "hardware",
  "configuration",
];

export function unitPriceForSelection(
  product: CatalogueProduct,
  variantIds: readonly string[],
): number {
  return resolveVariantPrice(product, new Set(variantIds));
}

export function groupVariants(product: CatalogueProduct): readonly VariantGroup[] {
  const map = new Map<ProductVariant["group"], ProductVariant[]>();
  for (const v of product.variants) {
    const list = map.get(v.group) ?? [];
    list.push(v);
    map.set(v.group, list);
  }
  const groups: VariantGroup[] = [];
  for (const group of GROUP_ORDER) {
    const variants = map.get(group);
    if (variants && variants.length > 0) {
      groups.push({ group, variants });
      map.delete(group);
    }
  }
  for (const [group, variants] of map) {
    groups.push({ group, variants });
  }
  return groups;
}
