/**
 * RC9.2 — Quotation draft from grounded recommendations.
 * Integrates with existing /quote flow via query params — does not replace Sales.
 */

import { formatPkr } from "../../data/catalogue";
import type { FurniturePackage } from "../budget-planner";
import type { ConsultantCard, ConsultantMemory } from "./types";

export function buildQuoteQuery(pkg: FurniturePackage): string {
  const lines = pkg.lines.map((l) => `${l.product.id}:${l.qty}`).join(",");
  const params = new URLSearchParams({
    from: "consultant",
    package: pkg.id,
    lines,
    total: String(pkg.totalPkr),
  });
  if (pkg.lines[0]) params.set("focus", pkg.lines[0].product.id);
  return `/quote?${params.toString()}`;
}

export function quoteCardFromPackage(
  pkg: FurniturePackage,
  memory: ConsultantMemory,
): Extract<ConsultantCard, { type: "quote" }> {
  const notes = [
    "Prices are catalogue display estimates — Sales / Rules remain authoritative for formal quotations.",
    memory.budgetPkr
      ? `Customer stated budget: ${formatPkr(memory.budgetPkr)}.`
      : "No budget captured yet.",
    memory.endUse || memory.roomType
      ? `Programme: ${memory.endUse ?? memory.roomType}.`
      : "Programme not fully specified.",
    "Downloadable PDF and formal workflow remain on the quotation path.",
  ];
  return {
    type: "quote",
    title: `Draft quotation — ${pkg.name}`,
    lines: pkg.lines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      qty: l.qty,
      unitLabel: formatPkr(l.product.pricePkr),
      lineTotalLabel: formatPkr(l.product.pricePkr * l.qty),
    })),
    subtotalLabel: formatPkr(pkg.totalPkr),
    notes,
    quoteHref: buildQuoteQuery(pkg),
  };
}
