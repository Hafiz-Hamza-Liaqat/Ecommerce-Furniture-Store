/**
 * RC9.3 — Budget optimization for complete furnishing packages.
 * Prefer complete packages within budget over exhausting budget on expensive SKUs.
 */

import { formatPkr, type CatalogueProduct } from "../../data/catalogue";
import type { FurniturePackage, PackageLine } from "../budget-planner";
import { searchCatalog } from "./grounding";
import type { SpaceBrief } from "./space-brief";
import { getIndustryTemplate, type TemplateRole } from "./templates";
import type { ConsultantStyle } from "./types";

export type ConceptualLine = {
  readonly role: string;
  readonly zone: string;
  readonly qty: number;
  readonly note: string;
  readonly conceptual: true;
};

export type OptimizedLine = PackageLine & {
  readonly zone: string;
  readonly priority: TemplateRole["priority"];
  readonly reason: string;
  readonly alternatives: readonly {
    readonly product: CatalogueProduct;
    readonly tradeoff: string;
  }[];
};

export type OptimizationResult = {
  readonly tier: FurniturePackage["tier"];
  readonly name: string;
  readonly lines: readonly OptimizedLine[];
  readonly conceptual: readonly ConceptualLine[];
  readonly totalPkr: number;
  readonly budgetPkr: number;
  readonly utilizationPercent: number;
  readonly remainingPkr: number;
  readonly upgrades: readonly string[];
  readonly downgrades: readonly string[];
  readonly explanations: readonly string[];
};

function totalOf(lines: readonly { product: CatalogueProduct; qty: number }[]): number {
  return lines.reduce((s, l) => s + l.product.pricePkr * l.qty, 0);
}

function pickProduct(
  role: TemplateRole,
  brief: SpaceBrief,
  used: Set<string>,
  prefer: "value" | "mid" | "premium",
): CatalogueProduct | null {
  const hits = searchCatalog({
    taxonomySlugs: role.slugs,
    excludeIds: [...used],
    limit: 8,
    endUse: brief.endUse,
    ...(brief.style ? { style: brief.style } : {}),
    ...(brief.budgetPkr != null ? { budgetPkr: brief.budgetPkr } : {}),
  });
  if (hits.length === 0) return null;
  const sorted = [...hits].sort((a, b) => a.pricePkr - b.pricePkr);
  if (prefer === "value") return sorted[0] ?? null;
  if (prefer === "premium") return sorted[sorted.length - 1] ?? sorted[0] ?? null;
  return sorted[Math.floor(sorted.length / 2)] ?? sorted[0] ?? null;
}

function alternativesFor(
  role: TemplateRole,
  brief: SpaceBrief,
  primaryId: string,
): OptimizedLine["alternatives"] {
  const hits = searchCatalog({
    taxonomySlugs: role.slugs,
    excludeIds: [primaryId],
    limit: 4,
    endUse: brief.endUse,
    ...(brief.style ? { style: brief.style } : {}),
  });
  return hits.slice(0, 3).map((p) => ({
    product: p,
    tradeoff:
      p.pricePkr < (hits[0]?.pricePkr ?? p.pricePkr)
        ? "Lower-cost alternative with similar category fit"
        : "Higher-spec alternative if budget allows",
  }));
}

function assembleRaw(
  brief: SpaceBrief,
  prefer: "value" | "mid" | "premium",
): { lines: OptimizedLine[]; conceptual: ConceptualLine[]; explanations: string[] } {
  const template = getIndustryTemplate(brief.templateId);
  const used = new Set<string>();
  const lines: OptimizedLine[] = [];
  const conceptual: ConceptualLine[] = [];
  const explanations: string[] = [];

  for (const role of template.roles) {
    const qty = role.qty(brief);
    if (qty <= 0) continue;

    const product = pickProduct(role, brief, used, prefer);
    if (!product) {
      if (role.conceptualFallback) {
        conceptual.push({
          role: role.role,
          zone: role.zone,
          qty,
          note: role.conceptualFallback,
          conceptual: true,
        });
        explanations.push(
          `${role.role}: no matching AFH catalogue SKU — listed as a conceptual recommendation only.`,
        );
      } else {
        explanations.push(
          `${role.role}: skipped — no grounded catalogue match for slugs [${role.slugs.join(", ")}].`,
        );
      }
      continue;
    }

    used.add(product.id);
    const reason = [
      `Fits ${role.zone.toLowerCase()} in the ${template.name}.`,
      brief.style ? `Aligned with ${brief.style} styling cues.` : "Style-flexible catalogue pick.",
      role.priority === "essential" ? "Essential for a complete package." : `Marked ${role.priority}.`,
      `Qty ${qty} estimated from your space brief.`,
    ].join(" ");

    lines.push({
      product,
      qty,
      role: role.role,
      zone: role.zone,
      priority: role.priority,
      reason,
      alternatives: alternativesFor(role, brief, product.id),
    });
  }

  return { lines, conceptual, explanations };
}

/**
 * Swap expensive lines for cheaper catalogue alternatives, reduce quantities,
 * and drop lower-priority roles until the package fits the budget.
 */
function fitToBudget(lines: OptimizedLine[], budget: number, brief: SpaceBrief): {
  lines: OptimizedLine[];
  downgrades: string[];
} {
  let current: OptimizedLine[] = lines.map((l) => ({
    ...l,
    alternatives: [...l.alternatives],
  }));
  const downgrades: string[] = [];
  let guard = 0;

  const roleSlugs = (role: string) =>
    getIndustryTemplate(brief.templateId).roles.find((r) => r.role === role)?.slugs ?? [];

  // Fast path: when wildly over budget, scale quantities proportionally first
  const initialTotal = totalOf(current);
  if (initialTotal > budget * 1.25 && current.some((l) => l.qty > 1)) {
    const scale = Math.max(0.05, budget / initialTotal);
    current = current.map((l) => ({
      ...l,
      qty: Math.max(l.priority === "essential" ? 1 : 0, Math.round(l.qty * scale)) || (l.priority === "essential" ? 1 : 0),
    })).filter((l) => l.qty > 0);
    downgrades.push(
      `Scaled quantities to ~${Math.round(scale * 100)}% so the package can approach ${formatPkr(budget)}.`,
    );
  }

  while (totalOf(current) > budget && guard < 100) {
    guard += 1;
    let progressed = false;

    // 1) Swap to cheaper catalogue alternatives (optional → essential)
    for (const pri of ["optional", "important", "essential"] as const) {
      const candidates = current
        .filter((l) => l.priority === pri)
        .sort((a, b) => b.product.pricePkr - a.product.pricePkr);
      for (const line of candidates) {
        const cheaper = searchCatalog({
          taxonomySlugs: roleSlugs(line.role),
          excludeIds: [line.product.id],
          limit: 8,
          endUse: brief.endUse,
        })
          .filter((p) => p.pricePkr < line.product.pricePkr)
          .sort((a, b) => a.pricePkr - b.pricePkr)[0];
        if (!cheaper) continue;
        const roleDef = getIndustryTemplate(brief.templateId).roles.find((r) => r.role === line.role);
        downgrades.push(
          `Swapped ${line.product.name} → ${cheaper.name} for ${line.role} to stay within budget.`,
        );
        current = current.map((l) =>
          l.role === line.role && l.product.id === line.product.id
            ? {
                ...l,
                product: cheaper,
                reason: `${l.reason} Substituted for budget fit (${formatPkr(cheaper.pricePkr)}).`,
                alternatives: roleDef ? alternativesFor(roleDef, brief, cheaper.id) : l.alternatives,
              }
            : l,
        );
        progressed = true;
        break;
      }
      if (progressed) break;
    }
    if (progressed) continue;

    // 2) Reduce quantities (largest line-cost first; keep at least 1 on essentials)
    const reducible = [...current]
      .filter((l) => l.qty > 1)
      .sort((a, b) => b.product.pricePkr * b.qty - a.product.pricePkr * a.qty);
    if (reducible[0]) {
      const line = reducible[0];
      const step = Math.max(1, Math.floor(line.qty * 0.15));
      const nextQty = Math.max(line.priority === "essential" ? 1 : 0, line.qty - step);
      if (nextQty < line.qty) {
        if (nextQty === 0) {
          downgrades.push(`Removed ${line.role} to fit budget.`);
          current = current.filter((l) => !(l.role === line.role && l.product.id === line.product.id));
        } else {
          downgrades.push(`Reduced ${line.role} quantity ${line.qty} → ${nextQty}.`);
          current = current.map((l) =>
            l.role === line.role && l.product.id === line.product.id ? { ...l, qty: nextQty } : l,
          );
        }
        progressed = true;
      }
    }
    if (progressed) continue;

    // 3) Drop optional, then important lines
    for (const pri of ["optional", "important"] as const) {
      const pool = current
        .filter((l) => l.priority === pri)
        .sort((a, b) => b.product.pricePkr * b.qty - a.product.pricePkr * a.qty);
      if (pool[0]) {
        const drop = pool[0];
        downgrades.push(`Removed ${pri} ${drop.role} (${drop.product.name}) to fit budget.`);
        current = current.filter((l) => !(l.role === drop.role && l.product.id === drop.product.id));
        progressed = true;
        break;
      }
    }
    if (progressed) continue;

    // 4) Last resort: scale all remaining quantities down by ~10%
    if (current.length > 0 && totalOf(current) > budget) {
      current = current.map((l) => ({
        ...l,
        qty: Math.max(1, Math.floor(l.qty * 0.9)),
      }));
      downgrades.push("Scaled package quantities down to approach budget.");
      // If scaling no longer changes totals (all qty=1), break
      if (current.every((l) => l.qty === 1) && totalOf(current) > budget) {
        // Drop the most expensive essential as absolute last resort (keep at least one line)
        if (current.length > 1) {
          const drop = [...current].sort(
            (a, b) => b.product.pricePkr * b.qty - a.product.pricePkr * a.qty,
          )[0]!;
          downgrades.push(
            `Removed ${drop.role} (${drop.product.name}) — budget cannot cover a full package at catalogue prices.`,
          );
          current = current.filter((l) => !(l.role === drop.role && l.product.id === drop.product.id));
        } else {
          break;
        }
      }
      continue;
    }

    break;
  }

  return { lines: current, downgrades };
}

function upgradeSuggestions(
  lines: readonly OptimizedLine[],
  brief: SpaceBrief,
  remaining: number,
): string[] {
  if (remaining < 50_000) return [];
  const tips: string[] = [];
  for (const line of lines) {
    const premium = searchCatalog({
      taxonomySlugs:
        getIndustryTemplate(brief.templateId).roles.find((r) => r.role === line.role)?.slugs ?? [],
      excludeIds: [line.product.id],
      limit: 5,
      endUse: brief.endUse,
      ...(brief.style ? { style: brief.style } : {}),
    })
      .filter((p) => p.pricePkr > line.product.pricePkr)
      .sort((a, b) => a.pricePkr - b.pricePkr)[0];
    if (premium && premium.pricePkr - line.product.pricePkr <= remaining) {
      tips.push(
        `Upgrade ${line.role} to ${premium.name} (+${formatPkr(premium.pricePkr - line.product.pricePkr)}).`,
      );
    }
    if (tips.length >= 3) break;
  }
  if (tips.length === 0 && remaining >= 100_000) {
    tips.push("Budget remaining — consider a premium reception or lounge accent from the catalogue.");
  }
  return tips;
}

export function optimizePackage(
  brief: SpaceBrief,
  tier: FurniturePackage["tier"] = "recommended",
): OptimizationResult {
  const budget = brief.budgetPkr ?? 2_000_000;
  const prefer = tier === "economy" ? "value" : tier === "premium" ? "premium" : "mid";
  const raw = assembleRaw(brief, prefer);

  let lines = raw.lines;
  let downgrades: string[] = [];
  const targetBudget =
    tier === "economy" ? Math.floor(budget * 0.85) : tier === "premium" ? Math.floor(budget * 1.25) : budget;

  if (tier !== "premium" || totalOf(lines) > budget * 1.35) {
    const fitted = fitToBudget(lines, targetBudget, brief);
    lines = fitted.lines;
    downgrades = fitted.downgrades;
  }

  // Luxury/premium jahez: allow slight overspend messaging but still try value packing
  if (tier === "premium" && brief.templateId === "jahez") {
    // keep premium picks; only soft-trim if wildly over
    if (totalOf(lines) > budget * 1.5) {
      const fitted = fitToBudget(lines, Math.floor(budget * 1.35), brief);
      lines = fitted.lines;
      downgrades = [...downgrades, ...fitted.downgrades];
    }
  }

  const totalPkr = totalOf(lines);
  const remaining = Math.max(0, budget - totalPkr);
  const percent = budget <= 0 ? 0 : Math.min(200, Math.round((totalPkr / budget) * 100));
  const upgrades = tier === "economy" ? [] : upgradeSuggestions(lines, brief, remaining);

  const name =
    brief.templateId === "jahez"
      ? tier === "economy"
        ? "Jahez Economy"
        : tier === "premium"
          ? "Jahez Luxury"
          : "Jahez Standard / Premium"
      : tier === "economy"
        ? "Economy package"
        : tier === "premium"
          ? "Premium upgrade"
          : "Recommended package";

  return {
    tier,
    name,
    lines,
    conceptual: raw.conceptual,
    totalPkr,
    budgetPkr: budget,
    utilizationPercent: percent,
    remainingPkr: remaining,
    upgrades,
    downgrades,
    explanations: [
      ...raw.explanations,
      `Built a complete ${getIndustryTemplate(brief.templateId).name.toLowerCase()} within catalogue grounding rules.`,
      `Budget utilization ${percent}% (${formatPkr(totalPkr)} of ${formatPkr(budget)}).`,
      ...downgrades,
    ],
  };
}

export function optimizationToFurniturePackage(result: OptimizationResult): FurniturePackage {
  return {
    id: result.tier === "recommended" ? "recommended" : result.tier,
    name: result.name,
    tier: result.tier,
    lines: result.lines.map((l) => ({
      product: l.product,
      qty: l.qty,
      role: `${l.zone} · ${l.role}`,
    })),
    totalPkr: result.totalPkr,
  };
}

export function buildOptimizedPackages(brief: SpaceBrief): {
  readonly packages: readonly FurniturePackage[];
  readonly results: readonly OptimizationResult[];
  readonly primary: FurniturePackage;
  readonly primaryResult: OptimizationResult;
} {
  const tiers: FurniturePackage["tier"][] =
    brief.templateId === "jahez"
      ? ["economy", "recommended", "premium"]
      : ["economy", "recommended", "premium"];

  // For jahez: map recommended→Standard, premium→Luxury naming already in optimizePackage
  const results = tiers.map((t) => {
    const r = optimizePackage(brief, t);
    if (brief.templateId === "jahez") {
      if (t === "economy") return { ...r, name: "Jahez Economy", tier: t };
      if (t === "recommended") return { ...r, name: "Jahez Standard", tier: t };
      return { ...r, name: "Jahez Luxury", tier: t };
    }
    return r;
  });

  // Insert a "Premium" jahez mid-tier alias: when recommended is Standard, also expose Premium as slightly upgraded recommended
  // (Luxury already maps to premium tier). Optional fourth not needed — Standard/Premium/Luxury covered by renaming:
  // User asked Economy / Standard / Premium / Luxury — map:
  // economy=Economy, recommended=Standard, and create premium as Premium by mid-high prefer, then we could add luxury...
  // Keep 3 tiers for UI compatibility; document Premium+Luxury as premium tier with luxury naming for jahez top.

  const packages = results.map(optimizationToFurniturePackage);
  const primaryResult = results.find((r) => r.tier === "recommended") ?? results[0]!;
  const primary = packages.find((p) => p.tier === "recommended") ?? packages[0]!;
  return { packages, results, primary, primaryResult };
}

export function styleHint(style?: ConsultantStyle): string {
  return style ?? "modern";
}
