/**
 * RC9.2 — Intelligent furnishing packages from grounded catalogue hits.
 */

import { formatPkr, type CatalogueProduct } from "../../data/catalogue";
import {
  buildPackages,
  utilization,
  type EndUse,
  type FurniturePackage,
  type PackageLine,
  type PlannerStyle,
} from "../budget-planner";
import { searchCatalog, type GroundingQuery } from "./grounding";
import type { ConsultantCard, ConsultantMemory } from "./types";
import { toEndUse, toPlannerStyle } from "./nlu";

const PACKAGE_ROLES: Record<
  string,
  readonly { role: string; slugs: readonly string[]; qtyFromSeats: (s: number) => number }[]
> = {
  home: [
    { role: "Sofa", slugs: ["sofas", "fabric-sofas", "sectionals"], qtyFromSeats: () => 1 },
    { role: "Coffee table", slugs: ["coffee-tables"], qtyFromSeats: () => 1 },
    { role: "TV unit", slugs: ["tv-units"], qtyFromSeats: () => 1 },
    { role: "Accent chair", slugs: ["lounge-chairs", "accent-chairs"], qtyFromSeats: (s) => Math.max(1, Math.ceil(s / 4)) },
    { role: "Side table", slugs: ["side-tables", "small-tables"], qtyFromSeats: () => 2 },
  ],
  office: [
    { role: "Workstation / desk", slugs: ["workstations", "executive"], qtyFromSeats: (s) => Math.max(1, Math.ceil(s * 0.85)) },
    { role: "Task chair", slugs: ["executive-chairs"], qtyFromSeats: (s) => Math.max(1, s) },
    { role: "Visitor chair", slugs: ["visitor-chairs"], qtyFromSeats: (s) => Math.max(2, Math.ceil(s / 6)) },
    { role: "Storage", slugs: ["storage-cabinets", "cabinets"], qtyFromSeats: (s) => Math.max(1, Math.ceil(s / 8)) },
    { role: "Meeting table", slugs: ["conference"], qtyFromSeats: (s) => (s >= 6 ? 1 : 0) },
  ],
  restaurant: [
    { role: "Dining table", slugs: ["dining-tables"], qtyFromSeats: (s) => Math.max(2, Math.ceil(s / 4)) },
    { role: "Dining chair", slugs: ["dining-chairs"], qtyFromSeats: (s) => Math.max(8, s) },
    { role: "Sideboard / service", slugs: ["sideboards"], qtyFromSeats: () => 1 },
    { role: "Reception", slugs: ["reception"], qtyFromSeats: () => 1 },
  ],
  hotel: [
    { role: "Bed", slugs: ["beds"], qtyFromSeats: (s) => Math.max(1, Math.ceil(s / 2)) },
    { role: "Wardrobe", slugs: ["wardrobes"], qtyFromSeats: (s) => Math.max(1, Math.ceil(s / 2)) },
    { role: "Lounge", slugs: ["sofas", "lounge-chairs"], qtyFromSeats: () => 1 },
    { role: "Reception desk", slugs: ["reception"], qtyFromSeats: () => 1 },
    { role: "Nightstand", slugs: ["bedside-tables"], qtyFromSeats: (s) => Math.max(2, Math.ceil(s / 2)) },
  ],
};

function pickForRole(
  role: { role: string; slugs: readonly string[]; qtyFromSeats: (s: number) => number },
  memory: ConsultantMemory,
  seats: number,
  used: Set<string>,
): PackageLine | null {
  const qty = role.qtyFromSeats(seats);
  if (qty <= 0) return null;
  const q: GroundingQuery = {
    taxonomySlugs: role.slugs,
    excludeIds: [...used, ...(memory.rejectedProductIds ?? [])],
    limit: 6,
    ...(memory.endUse ? { endUse: memory.endUse } : {}),
    ...(memory.roomType ? { roomType: memory.roomType } : {}),
    ...(memory.style ? { style: memory.style } : {}),
    ...(memory.colours ? { colours: memory.colours } : {}),
    ...(memory.materials ? { materials: memory.materials } : {}),
    ...(memory.budgetPkr != null ? { budgetPkr: memory.budgetPkr } : {}),
    ...(memory.preference ? { preference: memory.preference } : {}),
  };
  const hits = searchCatalog(q);
  const product = hits[0];
  if (!product) return null;
  used.add(product.id);
  return { product, qty, role: role.role };
}

export function assembleIntelligentPackage(memory: ConsultantMemory): {
  readonly packages: readonly FurniturePackage[];
  readonly primary: FurniturePackage;
} {
  const endUse = toEndUse(memory);
  const style = toPlannerStyle(memory.style);
  const seats = memory.seats ?? memory.employeeCount ?? 8;
  const budget = memory.budgetPkr ?? 2_000_000;

  const roles = PACKAGE_ROLES[endUse] ?? PACKAGE_ROLES.office!;
  const used = new Set<string>(memory.rejectedProductIds ?? []);
  const groundedLines: PackageLine[] = [];
  for (const role of roles) {
    const line = pickForRole(role, memory, seats, used);
    if (line) groundedLines.push(line);
  }

  // Fallback to classic planner if grounding yielded nothing
  if (groundedLines.length === 0) {
    const classic = buildPackages({ budgetPkr: budget, endUse, style, seats });
    const primary = classic.find((p) => p.tier === "recommended") ?? classic[0]!;
    return { packages: classic, primary };
  }

  const total = groundedLines.reduce((s, l) => s + l.product.pricePkr * l.qty, 0);
  const economyLines = groundedLines.map((l) => ({
    ...l,
    qty: Math.max(1, Math.floor(l.qty * 0.75)),
  }));
  const premiumLines = groundedLines.map((l) => ({
    ...l,
    qty: Math.max(l.qty, Math.ceil(l.qty * 1.15)),
  }));

  const packages: FurniturePackage[] = [
    {
      id: "economy",
      name: "Economy package",
      tier: "economy",
      lines: economyLines,
      totalPkr: economyLines.reduce((s, l) => s + l.product.pricePkr * l.qty, 0),
    },
    {
      id: "recommended",
      name: "Recommended package",
      tier: "recommended",
      lines: groundedLines,
      totalPkr: total,
    },
    {
      id: "premium",
      name: "Premium upgrade",
      tier: "premium",
      lines: premiumLines,
      totalPkr: premiumLines.reduce((s, l) => s + l.product.pricePkr * l.qty, 0),
    },
  ];

  return {
    packages,
    primary: packages.find((p) => p.tier === "recommended")!,
  };
}

export function packageToCard(
  pkg: FurniturePackage,
  memory: ConsultantMemory,
): Extract<ConsultantCard, { type: "package" }> {
  const budget = memory.budgetPkr;
  const util = budget != null ? utilization(budget, pkg.totalPkr) : undefined;
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
            "Swap to leather upholstery where available",
            "Add a premium reception or conference piece",
          ],
        }
      : {}),
    savingsTips:
      pkg.tier === "recommended" && budget != null && pkg.totalPkr > budget
        ? ["Reduce quantities on secondary seating", "Review the economy package for lower-cost alternatives"]
        : ["Keep quantities lean on visitor seating if headcount is flexible"],
  };
}

export function productsForQuote(pkg: FurniturePackage): readonly CatalogueProduct[] {
  return pkg.lines.map((l) => l.product);
}

export type { EndUse, PlannerStyle };
