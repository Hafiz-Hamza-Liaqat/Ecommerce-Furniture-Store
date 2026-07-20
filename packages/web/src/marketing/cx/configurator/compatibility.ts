/**
 * RC10.3 — Role ↔ product compatibility (hard gate for alternatives drawer).
 */

import type { CatalogueProduct } from "../../data/catalogue";
import type { SpaceTemplateId } from "../intelligent/space-brief";
import { getIndustryTemplate, type TemplateRole } from "../intelligent/templates";

function roleHaystack(role: TemplateRole): string {
  return `${role.role} ${role.zone} ${role.slugs.join(" ")}`.toLowerCase();
}

function productHaystack(product: CatalogueProduct): string {
  return [
    product.name,
    product.category,
    product.summary,
    product.collection,
    ...product.tags,
    ...product.taxonomySlugs,
  ]
    .join(" ")
    .toLowerCase();
}

function isChairLikeRole(role: TemplateRole): boolean {
  return /chair/.test(roleHaystack(role)) || role.slugs.some((s) => /chair/.test(s));
}

function isChairLikeProduct(product: CatalogueProduct): boolean {
  return (
    product.taxonomySlugs.some((s) => /chair/.test(s)) ||
    /\bchairs?\b/.test(productHaystack(product))
  );
}

function isDeskOrWorkstationRole(role: TemplateRole): boolean {
  // Chair roles (often zoned under "Workstations") must never be treated as desk roles.
  if (isChairLikeRole(role) && !/\bdesk\b|\btable\b/.test(role.role.toLowerCase())) {
    return false;
  }
  const text = `${role.role} ${role.slugs.join(" ")}`.toLowerCase();
  return (
    /desk|workstation|reception desk/.test(text) ||
    role.slugs.some((s) => /^(workstations|desks|executive|reception)$/.test(s))
  );
}

function isDeskLikeProduct(product: CatalogueProduct): boolean {
  const slugs = product.taxonomySlugs.join(" ");
  const hay = productHaystack(product);
  if (isChairLikeProduct(product)) return false;
  return (
    /desk|workstation|reception/.test(slugs) ||
    /\bdesks?\b|\bworkstation\b|\breception\b/.test(hay) ||
    product.taxonomySlugs.includes("executive")
  );
}

function isSofaLikeRole(role: TemplateRole): boolean {
  const text = roleHaystack(role);
  return /sofa|lounge/.test(text) || role.slugs.some((s) => /sofa|lounge/.test(s));
}

function isSofaLikeProduct(product: CatalogueProduct): boolean {
  return (
    product.taxonomySlugs.some((s) => /sofa|lounge/.test(s)) ||
    /\bsofas?\b|\blounge\b/.test(productHaystack(product))
  );
}

function isTableLikeRole(role: TemplateRole): boolean {
  const text = roleHaystack(role);
  return (
    (/table|conference/.test(text) && !/chair/.test(text)) ||
    role.slugs.some((s) => /table/.test(s) && !/chair/.test(s))
  );
}

function isCoffeeTableProduct(product: CatalogueProduct): boolean {
  return (
    product.taxonomySlugs.includes("coffee-tables") ||
    /\bcoffee table\b/.test(productHaystack(product))
  );
}

function isOfficeChairRole(role: TemplateRole): boolean {
  const text = roleHaystack(role);
  return (
    /chair/.test(text) &&
    (/office|executive|ergonomic|task|visitor|conference|cabin/.test(text) ||
      role.slugs.some((s) => /executive-chairs|visitor-chairs/.test(s)))
  );
}

function isDiningRole(role: TemplateRole): boolean {
  const text = roleHaystack(role);
  return /dining/.test(text) || role.slugs.some((s) => s.includes("dining"));
}

function isSchoolRole(role: TemplateRole): boolean {
  return /school|classroom|student|faculty/.test(roleHaystack(role));
}

function isHospitalRole(role: TemplateRole): boolean {
  return /hospital|medical|patient|clinic|doctor/.test(roleHaystack(role));
}

function isBedRole(role: TemplateRole): boolean {
  const text = roleHaystack(role);
  return /\bbeds?\b/.test(text) || role.slugs.some((s) => /^(beds|medical-beds)$/.test(s));
}

/**
 * Derive human/category keywords the role may accept.
 * Built from taxonomy slugs + role name cues (office chairs, dining, school, medical, …).
 */
export function deriveCompatibleCategories(role: TemplateRole): string[] {
  const out = new Set<string>();
  for (const slug of role.slugs) {
    out.add(slug);
    out.add(slug.replace(/-/g, " "));
  }

  const text = roleHaystack(role);

  if (isOfficeChairRole(role) || (isChairLikeRole(role) && !isDiningRole(role))) {
    out.add("office chairs");
    out.add("executive chairs");
    out.add("ergonomic chairs");
    out.add("task chairs");
    out.add("visitor chairs");
    out.add("conference chairs");
    out.add("chairs");
  }

  if (isDeskOrWorkstationRole(role)) {
    out.add("desks");
    out.add("workstations");
    out.add("workspace");
  }

  if (isDiningRole(role)) {
    out.add("dining");
    out.add("dining chairs");
    out.add("dining tables");
  }

  if (/school|classroom|student|faculty/.test(text)) {
    out.add("school");
    out.add("school desks");
    out.add("classroom");
  }

  if (/hospital|medical|patient|clinic|doctor/.test(text)) {
    out.add("hospital");
    out.add("medical");
    out.add("medical beds");
    out.add("clinic");
  }

  if (/bed|bedroom|nightstand|wardrobe/.test(text) || role.slugs.some((s) => /bed|wardrobe|bedroom/.test(s))) {
    out.add("bedroom");
    out.add("beds");
    out.add("wardrobes");
  }

  if (isSofaLikeRole(role)) {
    out.add("lounge");
    out.add("sofas");
    out.add("living");
    out.add("lounge chairs");
  }

  if (/storage|cabinet|shelf|bookcase|sideboard|pedestal/.test(text)) {
    out.add("storage");
    out.add("cabinets");
    out.add("shelves");
  }

  if (isTableLikeRole(role)) {
    out.add("tables");
    out.add("conference");
  }

  return [...out];
}

/** Reject category mismatches that slug overlap alone might miss. */
function isObviousMismatch(product: CatalogueProduct, role: TemplateRole): boolean {
  const hay = productHaystack(product);
  const slugs = new Set(product.taxonomySlugs);

  // Family hard-gates — the differentiator of the planner.
  if (isChairLikeRole(role) && !isChairLikeProduct(product)) return true;
  if (isDeskOrWorkstationRole(role)) {
    const allowsTables =
      /table/.test(roleHaystack(role)) || role.slugs.some((s) => /table/.test(s));
    const tableOk =
      allowsTables &&
      (product.taxonomySlugs.some((s) => /table/.test(s)) || /\btables?\b/.test(hay));
    if (!isDeskLikeProduct(product) && !tableOk) return true;
  }
  if (isSofaLikeRole(role) && !isSofaLikeProduct(product) && !isChairLikeProduct(product)) {
    return true;
  }

  if (isOfficeChairRole(role)) {
    if (/\bdining\b/.test(hay)) return true;
    if (/\boutdoor\b/.test(hay)) return true;
    if (/\bschool\b/.test(hay) || /\bclassroom\b/.test(hay)) return true;
    if (/\bhospital\b/.test(hay) || /\bmedical\b/.test(hay)) return true;
  }

  if (isDiningRole(role)) {
    if (/\boutdoor\b/.test(hay) && !/\bdining\b/.test(hay)) return true;
    if (/executive-chairs/.test(hay) && !/\bdining\b/.test(hay)) return true;
  }

  if (isSchoolRole(role)) {
    if (/\boutdoor\b/.test(hay)) return true;
    if (/\bdining\b/.test(hay) && !role.slugs.some((s) => s.includes("dining"))) return true;
    if (isCoffeeTableProduct(product)) return true;
    if (slugs.has("beds") || slugs.has("bedroom")) return true;
  }

  if (isDeskOrWorkstationRole(role)) {
    if (isCoffeeTableProduct(product)) return true;
    if (slugs.has("beds") || /\bsofa\b/.test(hay)) return true;
  }

  if (isHospitalRole(role)) {
    if (/\bdining\b/.test(hay) || /\boutdoor\b/.test(hay)) return true;
    if (isCoffeeTableProduct(product)) return true;
    if ((slugs.has("beds") || slugs.has("bedroom")) && !/\bmedical\b|\bhospital\b/.test(hay)) {
      return true;
    }
  }

  if (isBedRole(role) && isHospitalRole(role)) {
    if ((slugs.has("beds") || slugs.has("bedroom")) && !/\bmedical\b|\bhospital\b/.test(hay)) {
      return true;
    }
  }

  if (isTableLikeRole(role) && isCoffeeTableProduct(product) && isSchoolRole(role)) {
    return true;
  }

  return false;
}

function matchesCompatibleCategory(product: CatalogueProduct, categories: readonly string[]): boolean {
  const hay = productHaystack(product);
  for (const raw of categories) {
    const cat = raw.toLowerCase().trim();
    if (!cat) continue;
    // Avoid partial token traps (e.g. "executive" matching "executive-chairs" roles via desk SKUs).
    if (cat === "office" || cat === "executive" || cat === "workspace") continue;
    if (hay.includes(cat)) return true;
    const asSlug = cat.replace(/\s+/g, "-");
    if (product.taxonomySlugs.includes(asSlug)) return true;
  }
  return false;
}

/**
 * Product must share taxonomy slug with the role OR match derived categories
 * via category / tags / name — and must not be an obvious mismatch.
 */
export function isProductCompatible(product: CatalogueProduct, role: TemplateRole): boolean {
  if (isObviousMismatch(product, role)) return false;

  const slugOverlap = role.slugs.some((s) => product.taxonomySlugs.includes(s));
  if (slugOverlap) return true;

  const categories = deriveCompatibleCategories(role);
  return matchesCompatibleCategory(product, categories);
}

export function findTemplateRole(
  templateId: SpaceTemplateId | string,
  roleName: string,
): TemplateRole | null {
  const template = getIndustryTemplate(templateId as SpaceTemplateId);
  return template.roles.find((r) => r.role === roleName) ?? null;
}
