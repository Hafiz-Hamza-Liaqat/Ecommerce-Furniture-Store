/**
 * RC9.2/9.3 — Intelligent furnishing packages from grounded catalogue hits.
 * RC9.3: delegates to space templates + budget optimization.
 */

import { formatPkr, type CatalogueProduct } from "../../data/catalogue";
import {
  utilization,
  type EndUse,
  type FurniturePackage,
  type PlannerStyle,
} from "../budget-planner";
import { planFromConsultantMemory, planFromBrief } from "./planner";
import type { SpaceBrief } from "./space-brief";
import type { ConsultantCard, ConsultantMemory } from "./types";
import { toEndUse } from "./nlu";

export function assembleIntelligentPackage(memory: ConsultantMemory): {
  readonly packages: readonly FurniturePackage[];
  readonly primary: FurniturePackage;
} {
  const plan = planFromConsultantMemory(memory);
  return { packages: plan.packages, primary: plan.primary };
}

export function assembleFromBrief(brief: SpaceBrief): {
  readonly packages: readonly FurniturePackage[];
  readonly primary: FurniturePackage;
} {
  const plan = planFromBrief(brief);
  return { packages: plan.packages, primary: plan.primary };
}

export function packageToCard(
  pkg: FurniturePackage,
  memory: ConsultantMemory,
): Extract<ConsultantCard, { type: "package" }> {
  const budget = memory.budgetPkr;
  const util = budget != null ? utilization(budget, pkg.totalPkr) : undefined;
  const endUse = toEndUse(memory);
  return {
    type: "package",
    packageId: pkg.id,
    name: pkg.name,
    tier: pkg.tier,
    totalPkr: pkg.totalPkr,
    totalLabel: formatPkr(pkg.totalPkr),
    ...(budget != null ? { budgetPkr: budget, budgetLabel: formatPkr(budget) } : {}),
    ...(util ? { utilizationPercent: util.percent, remainingLabel: formatPkr(util.remaining) } : {}),
    lines: pkg.lines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      role: l.role,
      qty: l.qty,
      lineTotalLabel: formatPkr(l.product.pricePkr * l.qty),
      href: `/products/${l.product.id}`,
    })),
    ...(pkg.tier === "recommended"
      ? {
          upgrades: [
            "Open the Budget Planner for zone-by-zone optimization",
            endUse === "home"
              ? "Consider a Jahez workflow if this is a wedding package"
              : "Add premium reception or conference pieces if budget remains",
          ],
        }
      : {}),
    savingsTips:
      pkg.tier === "recommended" && budget != null && pkg.totalPkr > budget
        ? ["Review economy tier substitutions", "Reduce optional décor quantities"]
        : ["Keep visitor seating lean if headcount is flexible"],
  };
}

export function productsForQuote(pkg: FurniturePackage): readonly CatalogueProduct[] {
  return pkg.lines.map((l) => l.product);
}

export type { EndUse, PlannerStyle };
