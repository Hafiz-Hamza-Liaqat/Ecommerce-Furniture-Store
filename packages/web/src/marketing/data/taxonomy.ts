/**
 * RC8.1 / RC9.1.1 furniture taxonomy — presentation catalogue tree.
 * Destinations map to `/furniture/:slug` (and nested `/furniture/:parent/:slug`).
 */

export type TaxonomyNode = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly blurb: string;
  readonly image?: string;
  readonly children?: readonly TaxonomyNode[];
  /** Maps legacy product.category labels for filtering */
  readonly productTags?: readonly string[];
};

export const FURNITURE_TAXONOMY: readonly TaxonomyNode[] = [
  {
    id: "living-room",
    slug: "living-room",
    name: "Living Room",
    blurb: "Sofas, tables, and storage for everyday living.",
    productTags: ["Lounge", "Living"],
    children: [
      { id: "sofas", slug: "sofas", name: "Sofas", blurb: "Modular and fixed sofas.", productTags: ["Lounge", "Sofa"] },
      { id: "sectionals", slug: "sectionals", name: "Sectionals", blurb: "Corner and modular sectionals.", productTags: ["Lounge", "Sectional"] },
      { id: "recliners", slug: "recliners", name: "Recliners", blurb: "Reclining lounge seating.", productTags: ["Lounge", "Recliner"] },
      { id: "lounge-chairs", slug: "lounge-chairs", name: "Lounge Chairs", blurb: "Accent and lounge chairs.", productTags: ["Lounge", "Chair"] },
      { id: "coffee-tables", slug: "coffee-tables", name: "Coffee Tables", blurb: "Centre tables for living rooms.", productTags: ["Table", "Coffee"] },
      { id: "side-tables", slug: "side-tables", name: "Side Tables", blurb: "Occasional side tables.", productTags: ["Table", "Side"] },
      { id: "tv-units", slug: "tv-units", name: "TV Units", blurb: "Media consoles and wall units.", productTags: ["Storage", "TV"] },
    ],
  },
  {
    id: "bedroom",
    slug: "bedroom",
    name: "Bedroom",
    blurb: "Beds, wardrobes, and bedside storage.",
    productTags: ["Bedroom"],
    children: [
      { id: "beds", slug: "beds", name: "Beds", blurb: "Upholstered and platform beds.", productTags: ["Bedroom", "Bed"] },
      { id: "wardrobes", slug: "wardrobes", name: "Wardrobes", blurb: "Wardrobe systems.", productTags: ["Storage", "Wardrobe"] },
      { id: "bedside-tables", slug: "bedside-tables", name: "Nightstands", blurb: "Bedside tables.", productTags: ["Table", "Bedside"] },
      { id: "dressers", slug: "dressers", name: "Dressers", blurb: "Bedroom dressers and chests.", productTags: ["Bedroom", "Dresser"] },
    ],
  },
  {
    id: "dining",
    slug: "dining",
    name: "Dining",
    blurb: "Tables and chairs for hospitality and home.",
    productTags: ["Dining"],
    children: [
      { id: "dining-tables", slug: "dining-tables", name: "Dining Tables", blurb: "Solid timber dining tables.", productTags: ["Dining", "Table"] },
      { id: "dining-chairs", slug: "dining-chairs", name: "Dining Chairs", blurb: "Dining seating.", productTags: ["Dining", "Chair"] },
      { id: "sideboards", slug: "sideboards", name: "Sideboards", blurb: "Dining storage.", productTags: ["Storage", "Sideboard"] },
    ],
  },
  {
    id: "office",
    slug: "office",
    name: "Office",
    blurb: "Workstations, executive, conference, and reception.",
    productTags: ["Workspace", "Office"],
    children: [
      { id: "workstations", slug: "workstations", name: "Workstations", blurb: "Collaborative desks.", productTags: ["Workspace", "Workstation"] },
      { id: "executive", slug: "executive", name: "Executive Desks", blurb: "Private office desks and credenzas.", productTags: ["Workspace", "Executive"] },
      { id: "executive-chairs", slug: "executive-chairs", name: "Office Chairs", blurb: "Task and executive seating.", productTags: ["Chair", "Executive"] },
      { id: "conference", slug: "conference", name: "Meeting Tables", blurb: "Board and meeting tables.", productTags: ["Workspace", "Conference"] },
      { id: "reception", slug: "reception", name: "Reception Desks", blurb: "Reception desks and lounge.", productTags: ["Workspace", "Reception"] },
      { id: "storage-cabinets", slug: "storage-cabinets", name: "Storage Cabinets", blurb: "Office storage cabinets.", productTags: ["Storage", "Cabinet", "Office"] },
    ],
  },
  {
    id: "outdoor",
    slug: "outdoor",
    name: "Outdoor",
    blurb: "Weather-ready seating and tables.",
    productTags: ["Outdoor"],
    children: [
      { id: "outdoor-sofas", slug: "outdoor-sofas", name: "Outdoor Sofas", blurb: "Terrace lounges.", productTags: ["Outdoor", "Sofa"] },
      { id: "outdoor-tables", slug: "outdoor-tables", name: "Outdoor Tables", blurb: "Outdoor dining and café tables.", productTags: ["Outdoor", "Table"] },
      { id: "outdoor-chairs", slug: "outdoor-chairs", name: "Outdoor Chairs", blurb: "Outdoor dining and lounge chairs.", productTags: ["Outdoor", "Chair"] },
      { id: "outdoor-seating", slug: "outdoor-seating", name: "Outdoor Seating", blurb: "All outdoor seating.", productTags: ["Outdoor"] },
    ],
  },
  {
    id: "storage",
    slug: "storage",
    name: "Storage",
    blurb: "Cabinets, shelves, and bookcases.",
    productTags: ["Storage"],
    children: [
      { id: "cabinets", slug: "cabinets", name: "Cabinets", blurb: "Storage cabinets.", productTags: ["Storage", "Cabinet"] },
      { id: "shelves", slug: "shelves", name: "Shelving", blurb: "Open shelving.", productTags: ["Storage", "Shelf"] },
      { id: "bookcases", slug: "bookcases", name: "Bookcases", blurb: "Library bookcases.", productTags: ["Storage", "Bookcase"] },
    ],
  },
  {
    id: "tables",
    slug: "tables",
    name: "Tables",
    blurb: "All table families.",
    productTags: ["Table", "Dining"],
    children: [
      { id: "console-tables", slug: "console-tables", name: "Console Tables", blurb: "Hall and lobby consoles.", productTags: ["Table", "Console"] },
      { id: "small-tables", slug: "small-tables", name: "Side Tables", blurb: "Compact occasional tables.", productTags: ["Table", "Side"] },
    ],
  },
  {
    id: "chairs",
    slug: "chairs",
    name: "Chairs",
    blurb: "Lounge, dining, task, and visitor chairs.",
    productTags: ["Chair", "Lounge"],
    children: [
      { id: "accent-chairs", slug: "accent-chairs", name: "Lounge Chairs", blurb: "Statement lounge seating.", productTags: ["Lounge", "Chair"] },
      { id: "visitor-chairs", slug: "visitor-chairs", name: "Visitor Chairs", blurb: "Guest and lobby seating.", productTags: ["Chair", "Visitor"] },
    ],
  },
  {
    id: "sofas-family",
    slug: "sofas-family",
    name: "Sofas",
    blurb: "Sofa family overview.",
    productTags: ["Lounge", "Sofa"],
    children: [
      { id: "fabric-sofas", slug: "fabric-sofas", name: "Fabric Sofas", blurb: "Textile upholstery.", productTags: ["Lounge", "Sofa"] },
      { id: "leather-sofas", slug: "leather-sofas", name: "Leather Sofas", blurb: "Leather upholstery.", productTags: ["Lounge", "Sofa"] },
    ],
  },
] as const;

export function flattenTaxonomy(
  nodes: readonly TaxonomyNode[] = FURNITURE_TAXONOMY,
  parent: TaxonomyNode | null = null,
): readonly { node: TaxonomyNode; parent: TaxonomyNode | null }[] {
  const out: { node: TaxonomyNode; parent: TaxonomyNode | null }[] = [];
  for (const node of nodes) {
    out.push({ node, parent });
    if (node.children?.length) {
      out.push(...flattenTaxonomy(node.children, node));
    }
  }
  return out;
}

export function findTaxonomyBySlug(slug: string): {
  node: TaxonomyNode;
  parent: TaxonomyNode | null;
} | null {
  const hit = flattenTaxonomy().find((x) => x.node.slug === slug);
  return hit ?? null;
}

export function taxonomyPath(slug: string): readonly TaxonomyNode[] {
  const found = findTaxonomyBySlug(slug);
  if (!found) return [];
  return found.parent ? [found.parent, found.node] : [found.node];
}

/** Leaf nodes that should each have ≥2 demo products. */
export function taxonomyLeaves(
  nodes: readonly TaxonomyNode[] = FURNITURE_TAXONOMY,
): readonly TaxonomyNode[] {
  const leaves: TaxonomyNode[] = [];
  for (const node of nodes) {
    if (node.children?.length) leaves.push(...taxonomyLeaves(node.children));
    else leaves.push(node);
  }
  return leaves;
}
