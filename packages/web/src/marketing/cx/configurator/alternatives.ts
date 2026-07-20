/**
 * RC10.3 — Compatible alternative cards (soft-ranked; never invents SKUs).
 */

import { CATALOGUE, getCatalogueProduct, type CatalogueProduct } from "../../data/catalogue";
import type { TemplateRole } from "../intelligent/templates";
import { isProductCompatible } from "./compatibility";
import type { AlternativeCard, DesignPreferences } from "./types";

export type ListCompatibleAlternativesInput = {
  readonly role: TemplateRole;
  readonly currentProductId: string;
  readonly prefs?: DesignPreferences;
  readonly budgetPkr?: number;
  readonly limit?: number;
};

function prefHits(product: CatalogueProduct, prefs?: DesignPreferences): number {
  if (!prefs) return 0;
  let hits = 0;
  const hay = [
    product.name,
    product.summary,
    product.collection,
    product.material ?? "",
    product.color ?? "",
    product.category,
    ...product.tags,
  ]
    .join(" ")
    .toLowerCase();

  if (prefs.style && hay.includes(prefs.style.toLowerCase())) hits += 3;
  if (prefs.color && (product.color ?? "").toLowerCase().includes(prefs.color.toLowerCase())) {
    hits += 4;
  } else if (prefs.color && hay.includes(prefs.color.toLowerCase())) {
    hits += 2;
  }
  if (prefs.material && (product.material ?? "").toLowerCase().includes(prefs.material.toLowerCase())) {
    hits += 4;
  } else if (prefs.material && hay.includes(prefs.material.toLowerCase())) {
    hits += 2;
  }
  if (
    prefs.collection &&
    product.collection.toLowerCase() === prefs.collection.toLowerCase()
  ) {
    hits += 5;
  } else if (prefs.collection && hay.includes(prefs.collection.toLowerCase())) {
    hits += 2;
  }
  return hits;
}

function availabilityBoost(product: CatalogueProduct): number {
  const a = (product.availability ?? "").toLowerCase();
  if (/in stock|available/.test(a)) return 8;
  if (/limited/.test(a)) return 4;
  if (/production|made to order/.test(a)) return 1;
  return 0;
}

/** Prefer shorter lead times when parsed weeks are available. */
function leadTimeScore(product: CatalogueProduct): number {
  const lt = product.leadTime ?? "";
  const nums = [...lt.matchAll(/(\d+)/g)].map((m) => Number(m[1]));
  if (nums.length === 0) return 0;
  const mid = nums.reduce((s, n) => s + n, 0) / nums.length;
  return Math.max(0, 12 - mid);
}

function budgetScore(product: CatalogueProduct, budgetPkr?: number): number {
  if (budgetPkr == null || budgetPkr <= 0) return 0;
  if (product.pricePkr <= budgetPkr) return 6;
  const over = (product.pricePkr - budgetPkr) / budgetPkr;
  return Math.max(-8, -Math.round(over * 10));
}

function softScore(
  product: CatalogueProduct,
  prefs: DesignPreferences | undefined,
  budgetPkr: number | undefined,
): number {
  return (
    prefHits(product, prefs) * 10 +
    budgetScore(product, budgetPkr) +
    (product.rating ?? 0) * 4 +
    availabilityBoost(product) +
    leadTimeScore(product)
  );
}

function relationshipFor(
  priceDeltaPkr: number,
): AlternativeCard["relationship"] {
  if (priceDeltaPkr > 5_000) return "Upgrade";
  if (priceDeltaPkr < -5_000) return "BudgetOption";
  return "Alternatives";
}

export function listCompatibleAlternatives(
  input: ListCompatibleAlternativesInput,
): AlternativeCard[] {
  const { role, currentProductId, prefs, budgetPkr } = input;
  const limit = input.limit ?? 12;
  const current = getCatalogueProduct(currentProductId);
  const currentPrice = current?.pricePkr ?? 0;

  const ranked = CATALOGUE.filter(
    (p) => p.id !== currentProductId && isProductCompatible(p, role),
  )
    .map((product) => ({
      product,
      score: softScore(product, prefs, budgetPkr),
    }))
    .sort((a, b) => b.score - a.score || a.product.pricePkr - b.product.pricePkr)
    .slice(0, Math.max(0, limit));

  return ranked.map(({ product }) => {
    const priceDeltaPkr = product.pricePkr - currentPrice;
    return {
      product,
      priceDeltaPkr,
      relationship: relationshipFor(priceDeltaPkr),
    };
  });
}
