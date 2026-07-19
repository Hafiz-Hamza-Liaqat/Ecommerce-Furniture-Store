/**
 * RC9.2 — Catalog grounding layer.
 * AI never invents products; all recommendations flow through search → rank.
 */

import {
  CATALOGUE,
  formatPkr,
  getCatalogueProduct,
  type CatalogueProduct,
} from "../../data/catalogue";
import type { ConsultantMemory, ProductRecommendation } from "./types";

export type GroundingQuery = {
  text?: string;
  endUse?: string;
  roomType?: string;
  style?: string;
  colours?: readonly string[];
  materials?: readonly string[];
  budgetPkr?: number;
  preference?: string;
  taxonomySlugs?: readonly string[];
  excludeIds?: readonly string[];
  limit?: number;
};

const END_USE_SLUGS: Record<string, readonly string[]> = {
  office: ["office", "workstations", "executive", "executive-chairs", "conference", "reception", "storage-cabinets"],
  coworking: ["office", "workstations", "lounge-chairs", "conference"],
  government: ["office", "executive", "conference", "reception"],
  clinic: ["lounge-chairs", "reception", "side-tables", "cabinets"],
  hospital: ["lounge-chairs", "reception", "cabinets", "visitor-chairs"],
  school: ["workstations", "visitor-chairs", "shelves", "bookcases"],
  university: ["office", "conference", "lounge-chairs", "bookcases"],
  restaurant: ["dining", "dining-tables", "dining-chairs", "sideboards", "reception"],
  hotel: ["bedroom", "beds", "wardrobes", "living-room", "sofas", "reception", "dining"],
  home: ["living-room", "sofas", "coffee-tables", "bedroom", "beds", "dining"],
};

const STYLE_HINTS: Record<string, readonly string[]> = {
  modern: ["studio", "atelier", "mesh", "steel", "ash"],
  executive: ["walnut", "leather", "heritage", "boardroom", "executive"],
  heritage: ["oak", "walnut", "heritage", "timber", "natural"],
  scandinavian: ["oak", "ash", "linen", "light", "natural", "atelier"],
  luxury: ["leather", "walnut", "atelier", "premium", "cognac"],
  minimal: ["studio", "ash", "matte", "clean"],
  industrial: ["steel", "smoked", "graphite", "studio"],
  contemporary: ["atelier", "studio", "linen", "oak"],
};

const PREFERENCE_HINTS: Record<string, readonly string[]> = {
  desk: ["desk", "workstation", "executive"],
  desks: ["desk", "workstation", "executive"],
  lounge: ["sofa", "lounge", "sectional", "recliner"],
  dining: ["dining", "table", "chair"],
  bedroom: ["bed", "wardrobe", "nightstand", "dresser"],
  storage: ["cabinet", "sideboard", "shelf", "bookcase", "wardrobe"],
  balanced: [],
};

let catalogCache: readonly CatalogueProduct[] | null = null;

function catalog(): readonly CatalogueProduct[] {
  if (!catalogCache) catalogCache = CATALOGUE;
  return catalogCache;
}

/** Invalidate after hot catalogue reloads (tests / future). */
export function clearGroundingCache(): void {
  catalogCache = null;
}

function haystack(p: CatalogueProduct): string {
  return [
    p.name,
    p.summary,
    p.category,
    p.collection,
    p.brand ?? "",
    p.material ?? "",
    p.color ?? "",
    p.tags.join(" "),
    p.taxonomySlugs.join(" "),
    p.availability ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function scoreProduct(p: CatalogueProduct, q: GroundingQuery): number {
  let score = 0;
  const h = haystack(p);
  const exclude = new Set(q.excludeIds ?? []);
  if (exclude.has(p.id)) return -Infinity;

  const slugs = q.taxonomySlugs?.length
    ? q.taxonomySlugs
    : END_USE_SLUGS[q.endUse ?? q.roomType ?? ""] ?? [];
  for (const slug of slugs) {
    if (p.taxonomySlugs.includes(slug)) score += 12;
  }

  if (q.style) {
    for (const hint of STYLE_HINTS[q.style] ?? []) {
      if (h.includes(hint)) score += 6;
    }
  }

  if (q.preference) {
    const key = q.preference.toLowerCase();
    for (const [pref, hints] of Object.entries(PREFERENCE_HINTS)) {
      if (key.includes(pref)) {
        for (const hint of hints) {
          if (h.includes(hint)) score += 8;
        }
      }
    }
  }

  for (const colour of q.colours ?? []) {
    if (h.includes(colour.toLowerCase())) score += 5;
  }
  for (const material of q.materials ?? []) {
    if (h.includes(material.toLowerCase())) score += 5;
  }

  if (q.budgetPkr && q.budgetPkr > 0) {
    if (p.pricePkr <= q.budgetPkr) score += 4;
    if (p.pricePkr <= q.budgetPkr * 0.35) score += 3;
    if (p.pricePkr > q.budgetPkr) score -= 20;
  }

  if (q.text) {
    const tokens = q.text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2);
    for (const t of tokens) {
      if (h.includes(t)) score += 3;
    }
  }

  if (p.featured) score += 2;
  if (p.rating) score += p.rating;

  return score;
}

export function searchCatalog(query: GroundingQuery): readonly CatalogueProduct[] {
  const limit = query.limit ?? 12;
  const ranked = catalog()
    .map((p) => ({ p, s: scoreProduct(p, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.pricePkr - b.p.pricePkr);
  return ranked.slice(0, limit).map((x) => x.p);
}

function explain(p: CatalogueProduct, memory: ConsultantMemory): string[] {
  const reasons: string[] = [];
  if (memory.endUse || memory.roomType) {
    reasons.push(
      `Fits ${memory.endUse ?? memory.roomType} programmes via ${p.category.toLowerCase()} positioning.`,
    );
  }
  if (memory.style) {
    reasons.push(`Aligns with a ${memory.style} direction (${p.collection} collection).`);
  }
  if (p.material) reasons.push(`Material story: ${p.material}.`);
  if (p.color) reasons.push(`Finish / colour: ${p.color}.`);
  if (memory.budgetPkr) {
    if (p.pricePkr <= memory.budgetPkr) {
      reasons.push(`Priced within the stated budget at ${formatPkr(p.pricePkr)}.`);
    } else {
      reasons.push(`Above single-piece budget share — confirm before committing.`);
    }
  }
  if (p.dimensions) reasons.push(`Dimensions: ${p.dimensions}.`);
  if (p.warranty) reasons.push(`Durability signal: ${p.warranty}.`);
  if (p.availability) reasons.push(`Availability note: ${p.availability}.`);
  if (reasons.length === 0) {
    reasons.push("Selected from the AFH catalogue based on category and collection fit.");
  }
  return reasons.slice(0, 5);
}

function tradeoff(primary: CatalogueProduct, alt: CatalogueProduct): string {
  if (alt.pricePkr < primary.pricePkr) {
    return `Lower investment (${formatPkr(alt.pricePkr)}) with a different ${alt.collection} expression.`;
  }
  if (alt.pricePkr > primary.pricePkr) {
    return `Premium step-up (${formatPkr(alt.pricePkr)}) — richer ${alt.material ?? "specification"}.`;
  }
  return `Same price band; alternate ${alt.collection} look and ${alt.color ?? "finish"}.`;
}

export function recommendFromCatalog(
  memory: ConsultantMemory,
  opts?: { limit?: number; seedText?: string },
): readonly ProductRecommendation[] {
  const query: GroundingQuery = {
    limit: 18,
    ...(memory.rejectedProductIds ? { excludeIds: memory.rejectedProductIds } : {}),
    ...((opts?.seedText ?? memory.lastQuery) ? { text: opts?.seedText ?? memory.lastQuery } : {}),
    ...(memory.endUse ? { endUse: memory.endUse } : {}),
    ...(memory.roomType ? { roomType: memory.roomType } : {}),
    ...(memory.style ? { style: memory.style } : {}),
    ...(memory.colours ? { colours: memory.colours } : {}),
    ...(memory.materials ? { materials: memory.materials } : {}),
    ...(memory.budgetPkr != null ? { budgetPkr: memory.budgetPkr } : {}),
    ...(memory.preference ? { preference: memory.preference } : {}),
  };

  const hits = searchCatalog(query);
  const limit = opts?.limit ?? 3;
  const out: ProductRecommendation[] = [];
  for (let i = 0; i < Math.min(limit, hits.length); i++) {
    const product = hits[i]!;
    const alts = hits
      .filter((p) => p.id !== product.id)
      .slice(0, 3)
      .map((p) => ({ product: p, tradeoff: tradeoff(product, p) }));
    const scoreQuery: GroundingQuery = {
      ...(memory.endUse ? { endUse: memory.endUse } : {}),
      ...(memory.roomType ? { roomType: memory.roomType } : {}),
      ...(memory.style ? { style: memory.style } : {}),
      ...(memory.budgetPkr != null ? { budgetPkr: memory.budgetPkr } : {}),
      ...(memory.preference ? { preference: memory.preference } : {}),
    };
    out.push({
      product,
      score: scoreProduct(product, scoreQuery),
      reasons: explain(product, memory),
      alternatives: alts,
    });
  }
  return out;
}

export function groundedProductOrNull(id: string): CatalogueProduct | undefined {
  return getCatalogueProduct(id);
}

export function assertGroundedIds(ids: readonly string[]): {
  readonly ok: readonly string[];
  readonly missing: readonly string[];
} {
  const ok: string[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    if (getCatalogueProduct(id)) ok.push(id);
    else missing.push(id);
  }
  return { ok, missing };
}
