/**
 * RC10.3 — Typed related-product lists (catalogue-grounded only).
 */

import {
  CATALOGUE,
  getCatalogueProduct,
  type CatalogueProduct,
} from "../../data/catalogue";
import type { ProductRelationshipType } from "./types";

function resolveIds(ids: readonly string[]): CatalogueProduct[] {
  const out: CatalogueProduct[] = [];
  for (const id of ids) {
    const p = getCatalogueProduct(id);
    if (p) out.push(p);
  }
  return out;
}

function sameTaxonomyPeers(product: CatalogueProduct): CatalogueProduct[] {
  const slugs = new Set(product.taxonomySlugs);
  return CATALOGUE.filter((p) => {
    if (p.id === product.id) return false;
    return p.taxonomySlugs.some((s) => slugs.has(s));
  });
}

/**
 * Related products by relationship type. Never invents ids — only catalogue lookups.
 */
export function relatedProducts(
  product: CatalogueProduct,
  type: ProductRelationshipType,
): CatalogueProduct[] {
  switch (type) {
    case "Recommended":
      return [product];

    case "Accessories": {
      const ids = [
        ...(product.complementaryIds ?? []),
        ...(product.pairedIds ?? []),
      ];
      return resolveIds([...new Set(ids)]);
    }

    case "MatchingCollection":
      return CATALOGUE.filter(
        (p) => p.id !== product.id && p.collection === product.collection,
      );

    case "BudgetOption":
      return sameTaxonomyPeers(product)
        .filter((p) => p.pricePkr < product.pricePkr)
        .sort((a, b) => a.pricePkr - b.pricePkr);

    case "Upgrade":
      return sameTaxonomyPeers(product)
        .filter((p) => p.pricePkr > product.pricePkr)
        .sort((a, b) => a.pricePkr - b.pricePkr);

    case "Alternatives":
      return sameTaxonomyPeers(product).sort((a, b) => a.pricePkr - b.pricePkr);

    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
