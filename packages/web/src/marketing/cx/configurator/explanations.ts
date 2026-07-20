/**
 * RC10.3 — Deterministic line explanations for configured products.
 */

import type { CatalogueProduct } from "../../data/catalogue";
import type { SpaceBrief } from "../intelligent/space-brief";
import type { TemplateRole } from "../intelligent/templates";
import { isProductCompatible } from "./compatibility";
import { collectionLabel } from "./collections";
import type { DesignPreferences } from "./types";

export type BuildLineExplanationsInput = {
  readonly product: CatalogueProduct;
  readonly role: TemplateRole;
  readonly brief?: SpaceBrief;
  readonly prefs?: DesignPreferences;
  readonly variantLabels?: readonly string[];
};

/**
 * Stable, non-AI bullets: project type, style, budget, stock, lead time, collection, compatibility.
 */
export function buildLineExplanations(input: BuildLineExplanationsInput): string[] {
  const { product, role, brief, prefs, variantLabels } = input;
  const bullets: string[] = [];

  if (brief?.templateId) {
    bullets.push(`Selected for a ${brief.templateId} project as ${role.role}.`);
  } else {
    bullets.push(`Fits the ${role.role} role in ${role.zone}.`);
  }

  if (prefs?.style) {
    bullets.push(`Soft-matched to your ${prefs.style} style preference.`);
  } else if (brief?.style) {
    bullets.push(`Aligned with ${brief.style} styling cues from the brief.`);
  }

  if (brief?.budgetPkr != null && brief.budgetPkr > 0) {
    if (product.pricePkr <= brief.budgetPkr) {
      bullets.push(
        `Unit price sits within the ${brief.budgetPkr.toLocaleString("en-PK")} PKR budget band.`,
      );
    } else {
      bullets.push(
        `Unit price is above the ${brief.budgetPkr.toLocaleString("en-PK")} PKR budget — consider a budget option if needed.`,
      );
    }
  }

  if (product.availability) {
    bullets.push(`Availability: ${product.availability}.`);
  }

  if (product.leadTime) {
    bullets.push(`Estimated lead time: ${product.leadTime}.`);
  }

  if (product.collection) {
    bullets.push(`From the ${collectionLabel(product.collection)} collection.`);
  }

  if (isProductCompatible(product, role)) {
    bullets.push(`Compatible with ${role.role} category rules.`);
  } else {
    bullets.push(`Review compatibility — this SKU may not match ${role.role} rules.`);
  }

  if (prefs?.color || prefs?.material) {
    const bits = [prefs.color, prefs.material].filter(Boolean);
    bullets.push(`Preference cues considered: ${bits.join(", ")}.`);
  }

  if (variantLabels && variantLabels.length > 0) {
    bullets.push(`Configured variant: ${variantLabels.join(" · ")}.`);
  }

  return bullets;
}
