import type { CatalogueProduct } from "../data/catalogue.js";
import { CATALOGUE, formatPkr } from "../data/catalogue.js";

export type EndUse =
  | "office"
  | "home"
  | "hotel"
  | "restaurant"
  | "school"
  | "hospital"
  | "coworking"
  | "clinic"
  | "government"
  | "university";

export type PlannerStyle = "modern" | "executive" | "heritage";

export type PackageLine = {
  readonly product: CatalogueProduct;
  readonly qty: number;
  readonly role: string;
};

export type FurniturePackage = {
  readonly id: string;
  readonly name: string;
  readonly tier: "economy" | "recommended" | "premium";
  readonly lines: readonly PackageLine[];
  readonly totalPkr: number;
};

const ROLE_MAP: Record<string, readonly string[]> = {
  office: ["northline-desk", "grove-lounge", "harbor-conference", "folio-sideboard", "atrium-reception"],
  coworking: ["northline-desk", "grove-lounge", "harbor-conference", "folio-sideboard"],
  government: ["northline-desk", "harbor-conference", "atrium-reception", "folio-sideboard"],
  clinic: ["grove-lounge", "folio-sideboard", "atrium-reception"],
  hospital: ["grove-lounge", "folio-sideboard", "atrium-reception"],
  school: ["northline-desk", "grove-lounge", "folio-sideboard"],
  university: ["northline-desk", "harbor-conference", "grove-lounge", "folio-sideboard"],
  restaurant: ["cascade-table", "grove-lounge", "folio-sideboard"],
  hotel: ["meridian-sofa", "solstice-bed", "folio-sideboard", "cascade-table"],
  home: ["meridian-sofa", "cascade-table", "solstice-bed", "folio-sideboard", "grove-lounge"],
};

function byId(id: string): CatalogueProduct | undefined {
  return CATALOGUE.find((p) => p.id === id);
}

function buildLines(
  endUse: EndUse,
  seats: number,
  multiplier: number,
): PackageLine[] {
  const ids = ROLE_MAP[endUse] ?? ROLE_MAP.office!;
  const lines: PackageLine[] = [];
  for (const id of ids) {
    const product = byId(id);
    if (!product) continue;
    let qty = 1;
    let role = "Featured";
    if (id.includes("desk") || product.tags.includes("Executive")) {
      qty = Math.max(1, Math.ceil(seats / 1));
      role = "Desk";
      if (seats > 8) qty = Math.ceil(seats * 0.85);
    } else if (product.tags.includes("Chair") || id.includes("lounge")) {
      qty = Math.max(2, Math.ceil(seats * 0.9));
      role = "Chair";
    } else if (product.tags.includes("Conference")) {
      qty = seats >= 8 ? 1 : 0;
      role = "Conference";
    } else if (product.tags.includes("Reception")) {
      qty = seats >= 6 ? 1 : 0;
      role = "Reception";
    } else if (product.tags.includes("Storage") || product.tags.includes("Sideboard")) {
      qty = Math.max(1, Math.ceil(seats / 8));
      role = "Storage";
    } else if (product.tags.includes("Sofa")) {
      qty = Math.max(1, Math.ceil(seats / 10));
      role = "Lounge";
    } else if (product.tags.includes("Bed")) {
      qty = Math.max(1, Math.ceil(seats / 2));
      role = "Bedroom";
    } else if (product.tags.includes("Dining") || product.tags.includes("Table")) {
      qty = Math.max(1, Math.ceil(seats / 8));
      role = "Table";
    }
    if (qty <= 0) continue;
    qty = Math.max(1, Math.round(qty * multiplier));
    lines.push({ product, qty, role });
  }
  return lines;
}

function totalOf(lines: readonly PackageLine[]): number {
  return lines.reduce((s, l) => s + l.product.pricePkr * l.qty, 0);
}

function trimToBudget(lines: PackageLine[], budget: number): PackageLine[] {
  const sorted = [...lines].sort((a, b) => b.product.pricePkr - a.product.pricePkr);
  const out: PackageLine[] = [];
  let spent = 0;
  for (const line of sorted) {
    let qty = line.qty;
    while (qty > 0 && spent + line.product.pricePkr * qty > budget) {
      qty -= 1;
    }
    if (qty > 0) {
      out.push({ ...line, qty });
      spent += line.product.pricePkr * qty;
    }
  }
  return out.length ? out : lines.slice(0, 1).map((l) => ({ ...l, qty: 1 }));
}

export function buildPackages(input: {
  budgetPkr: number;
  endUse: EndUse;
  style: PlannerStyle;
  seats: number;
}): readonly FurniturePackage[] {
  const { budgetPkr, endUse, style, seats } = input;
  const styleMult = style === "executive" ? 1.1 : style === "heritage" ? 1.05 : 1;

  const recommendedLines = trimToBudget(buildLines(endUse, seats, styleMult), budgetPkr);
  const economyLines = trimToBudget(buildLines(endUse, seats, 0.75), Math.floor(budgetPkr * 0.85));
  const premiumLines = buildLines(endUse, seats, 1.25);

  return [
    {
      id: "economy",
      name: "Economy package",
      tier: "economy",
      lines: economyLines,
      totalPkr: totalOf(economyLines),
    },
    {
      id: "recommended",
      name: "Recommended package",
      tier: "recommended",
      lines: recommendedLines,
      totalPkr: totalOf(recommendedLines),
    },
    {
      id: "premium",
      name: "Premium upgrade",
      tier: "premium",
      lines: premiumLines,
      totalPkr: totalOf(premiumLines),
    },
  ];
}

/** Alias kept for callers that want the explicit classic path. */
export const buildClassicPackages = buildPackages;

export function utilization(budgetPkr: number, totalPkr: number): {
  remaining: number;
  percent: number;
} {
  const remaining = Math.max(0, budgetPkr - totalPkr);
  const percent = budgetPkr <= 0 ? 0 : Math.min(100, Math.round((totalPkr / budgetPkr) * 100));
  return { remaining, percent };
}

export function plannerSummaryText(pkg: FurniturePackage, budgetPkr: number): string {
  const { remaining, percent } = utilization(budgetPkr, pkg.totalPkr);
  return `${pkg.name}: ${formatPkr(pkg.totalPkr)} · ${percent}% of budget · ${formatPkr(remaining)} remaining`;
}
