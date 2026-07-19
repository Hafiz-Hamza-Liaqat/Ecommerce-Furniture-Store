/**
 * RC8.1 extended catalogue presentation model.
 * Prices are display estimates — Rules/Sales remain authoritative for quotes.
 */

import { IMG } from "./content.js";

export type ProductMedia = {
  readonly id: string;
  readonly type: "image" | "video" | "pdf";
  readonly url: string;
  readonly alt: string;
  readonly damAssetId?: string;
};

export type ProductVariant = {
  readonly id: string;
  readonly label: string;
  readonly group: "color" | "finish" | "material" | "dimensions" | "hardware" | "configuration";
  readonly swatch?: string;
  readonly mediaIds?: readonly string[];
  readonly specOverrides?: readonly { label: string; value: string }[];
  readonly priceDeltaPkr?: number;
};

export type CatalogueProduct = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly collection: string;
  readonly summary: string;
  /** Base price in PKR (numeric for planner) */
  readonly pricePkr: number;
  readonly priceFrom: string;
  readonly image: string;
  readonly specs: readonly { label: string; value: string }[];
  readonly featured?: boolean;
  readonly taxonomySlugs: readonly string[];
  readonly tags: readonly string[];
  readonly media: readonly ProductMedia[];
  readonly spinFrames?: readonly string[];
  readonly variants: readonly ProductVariant[];
  readonly warranty?: string;
  readonly availability?: string;
  readonly leadTime?: string;
  readonly downloads?: readonly { label: string; url: string; kind: "pdf" | "brochure" | "spec" }[];
  readonly complementaryIds?: readonly string[];
  readonly pairedIds?: readonly string[];
  readonly brand?: string;
  readonly material?: string;
  readonly color?: string;
  readonly rating?: number;
  readonly dimensions?: string;
};

function money(pkr: number): string {
  return `PKR ${pkr.toLocaleString("en-PK")}`;
}

export const CATALOGUE: readonly CatalogueProduct[] = [
  {
    id: "meridian-sofa",
    name: "Meridian Sofa",
    category: "Lounge",
    collection: "Atelier",
    summary: "Modular lounge system with kiln-dried hardwood frame and performance textiles.",
    pricePkr: 285000,
    priceFrom: money(285000),
    image: IMG.lounge,
    featured: true,
    taxonomySlugs: ["living-room", "sofas", "sectionals", "fabric-sofas", "sofas-family"],
    tags: ["Lounge", "Sofa", "Sectional", "Living"],
    warranty: "5 years structural",
    availability: "Made to order",
    leadTime: "6–8 weeks",
    brand: "AFH Atelier",
    material: "Beech / Textile",
    color: "Sand",
    rating: 4.8,
    dimensions: "2400 × 980 mm",
    specs: [
      { label: "Frame", value: "Seasoned beech" },
      { label: "Depth", value: "980 mm" },
      { label: "Finish", value: "Natural oil" },
      { label: "Width", value: "2400 mm" },
    ],
    media: [
      { id: "m1", type: "image", url: IMG.lounge, alt: "Meridian Sofa front view" },
      { id: "m2", type: "image", url: IMG.catalog2, alt: "Meridian Sofa detail" },
      { id: "m3", type: "image", url: IMG.wood, alt: "Meridian frame timber" },
      { id: "m4", type: "image", url: IMG.finish, alt: "Meridian textile close-up" },
      {
        id: "mv",
        type: "video",
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        alt: "Meridian material study film",
      },
    ],
    spinFrames: [IMG.lounge, IMG.catalog2, IMG.catalog1, IMG.finish, IMG.wood, IMG.catalog3, IMG.lounge, IMG.catalog2],
    variants: [
      { id: "sand", label: "Sand", group: "color", swatch: "#c4b59a", mediaIds: ["m1", "m2"] },
      { id: "ink", label: "Ink", group: "color", swatch: "#2a3238", mediaIds: ["m3", "m4"], priceDeltaPkr: 12000 },
      { id: "wool", label: "Wool blend", group: "material" },
      { id: "leather", label: "Leather", group: "material", priceDeltaPkr: 45000 },
      { id: "oil", label: "Natural oil", group: "finish" },
      { id: "lacquer", label: "Matte lacquer", group: "finish" },
      { id: "w240", label: "2400 mm", group: "dimensions" },
      { id: "w280", label: "2800 mm", group: "dimensions", priceDeltaPkr: 28000 },
    ],
    downloads: [
      { label: "Product sheet", url: "/catalogue.pdf", kind: "spec" },
      { label: "Collection brochure", url: "/catalogue.pdf", kind: "brochure" },
    ],
    complementaryIds: ["grove-lounge", "folio-sideboard"],
    pairedIds: ["cascade-table"],
  },
  {
    id: "cascade-table",
    name: "Cascade Dining Table",
    category: "Dining",
    collection: "Heritage",
    summary: "Solid oak top with sculpted pedestal — seats eight with quiet presence.",
    pricePkr: 410000,
    priceFrom: money(410000),
    image: IMG.dining,
    featured: true,
    taxonomySlugs: ["dining", "dining-tables", "tables"],
    tags: ["Dining", "Table"],
    warranty: "5 years",
    availability: "In production",
    leadTime: "5–7 weeks",
    brand: "AFH Heritage",
    material: "European oak",
    color: "Natural",
    rating: 4.7,
    dimensions: "2400 × 1000 mm",
    specs: [
      { label: "Top", value: "European oak" },
      { label: "Length", value: "2400 mm" },
      { label: "Finish", value: "Matte lacquer" },
      { label: "Seats", value: "8" },
    ],
    media: [
      { id: "c1", type: "image", url: IMG.dining, alt: "Cascade Dining Table" },
      { id: "c2", type: "image", url: IMG.wood, alt: "Oak grain detail" },
      { id: "c3", type: "image", url: IMG.finish, alt: "Finish sample" },
    ],
    spinFrames: [IMG.dining, IMG.wood, IMG.finish, IMG.catalog1, IMG.dining, IMG.wood],
    variants: [
      { id: "oak", label: "Oak", group: "material" },
      { id: "walnut", label: "Walnut", group: "material", priceDeltaPkr: 35000 },
      { id: "matte", label: "Matte lacquer", group: "finish" },
      { id: "oil", label: "Natural oil", group: "finish" },
      { id: "l240", label: "2400 mm", group: "dimensions" },
      { id: "l280", label: "2800 mm", group: "dimensions", priceDeltaPkr: 40000 },
    ],
    downloads: [{ label: "Spec sheet", url: "/catalogue.pdf", kind: "spec" }],
    complementaryIds: ["grove-lounge"],
    pairedIds: ["meridian-sofa"],
  },
  {
    id: "northline-desk",
    name: "Northline Executive Desk",
    category: "Workspace",
    collection: "Studio",
    summary: "Cable-integrated executive desk for boardrooms and private offices.",
    pricePkr: 195000,
    priceFrom: money(195000),
    image: IMG.office,
    featured: true,
    taxonomySlugs: ["office", "executive", "workstations"],
    tags: ["Workspace", "Executive", "Office"],
    warranty: "3 years",
    availability: "Made to order",
    leadTime: "4–6 weeks",
    brand: "AFH Studio",
    material: "Walnut veneer",
    color: "Walnut",
    rating: 4.6,
    dimensions: "1800 × 800 mm",
    specs: [
      { label: "Surface", value: "Walnut veneer" },
      { label: "Width", value: "1800 mm" },
      { label: "Hardware", value: "Brushed steel" },
    ],
    media: [
      { id: "n1", type: "image", url: IMG.office, alt: "Northline desk" },
      { id: "n2", type: "image", url: IMG.catalog4, alt: "Northline detail" },
      { id: "n3", type: "image", url: IMG.cnc, alt: "Workshop machining" },
    ],
    spinFrames: [IMG.office, IMG.catalog4, IMG.cnc, IMG.wood, IMG.office],
    variants: [
      { id: "walnut", label: "Walnut", group: "finish" },
      { id: "oak", label: "Oak", group: "finish" },
      { id: "steel", label: "Brushed steel", group: "hardware" },
      { id: "black", label: "Black powder", group: "hardware", priceDeltaPkr: 8000 },
      { id: "w180", label: "1800 mm", group: "dimensions" },
      { id: "w200", label: "2000 mm", group: "dimensions", priceDeltaPkr: 22000 },
    ],
    downloads: [{ label: "Brochure", url: "/catalogue.pdf", kind: "brochure" }],
    complementaryIds: ["folio-sideboard", "grove-lounge"],
    pairedIds: ["solstice-bed"],
  },
  {
    id: "solstice-bed",
    name: "Solstice Bed",
    category: "Bedroom",
    collection: "Atelier",
    summary: "Upholstered headboard with floating platform base and soft radius edges.",
    pricePkr: 320000,
    priceFrom: money(320000),
    image: IMG.bedroom,
    featured: true,
    taxonomySlugs: ["bedroom", "beds"],
    tags: ["Bedroom", "Bed"],
    warranty: "5 years",
    availability: "Made to order",
    leadTime: "6–8 weeks",
    brand: "AFH Atelier",
    material: "Wool blend",
    color: "Ivory",
    rating: 4.9,
    dimensions: "King / Queen",
    specs: [
      { label: "Size", value: "King / Queen" },
      { label: "Upholstery", value: "Wool blend" },
      { label: "Base", value: "Ash plywood" },
    ],
    media: [
      { id: "s1", type: "image", url: IMG.bedroom, alt: "Solstice Bed" },
      { id: "s2", type: "image", url: IMG.catalog3, alt: "Headboard detail" },
      { id: "s3", type: "image", url: IMG.finish, alt: "Textile" },
    ],
    spinFrames: [IMG.bedroom, IMG.catalog3, IMG.finish, IMG.wood, IMG.bedroom],
    variants: [
      { id: "queen", label: "Queen", group: "dimensions" },
      { id: "king", label: "King", group: "dimensions", priceDeltaPkr: 35000 },
      { id: "wool", label: "Wool blend", group: "material" },
      { id: "linen", label: "Linen", group: "material" },
    ],
    downloads: [{ label: "Care guide", url: "/catalogue.pdf", kind: "pdf" }],
    complementaryIds: ["folio-sideboard"],
  },
  {
    id: "grove-lounge",
    name: "Grove Lounge Chair",
    category: "Lounge",
    collection: "Heritage",
    summary: "Steam-bent armrests and hand-tied springs for all-day comfort.",
    pricePkr: 148000,
    priceFrom: money(148000),
    image: IMG.catalog2,
    taxonomySlugs: ["living-room", "chairs", "accent-chairs", "executive-chairs"],
    tags: ["Lounge", "Chair"],
    warranty: "5 years",
    availability: "In stock samples",
    leadTime: "3–5 weeks",
    brand: "AFH Heritage",
    material: "Walnut / Down",
    color: "Sand",
    rating: 4.8,
    dimensions: "760 × 820 mm",
    specs: [
      { label: "Wood", value: "Walnut" },
      { label: "Seat", value: "Down wrap" },
      { label: "Width", value: "760 mm" },
    ],
    media: [
      { id: "g1", type: "image", url: IMG.catalog2, alt: "Grove Lounge Chair" },
      { id: "g2", type: "image", url: IMG.wood, alt: "Walnut arm" },
    ],
    spinFrames: [IMG.catalog2, IMG.wood, IMG.finish, IMG.catalog2],
    variants: [
      { id: "walnut", label: "Walnut", group: "material" },
      { id: "oak", label: "Oak", group: "material" },
      { id: "sand", label: "Sand", group: "color", swatch: "#c4b59a" },
      { id: "forest", label: "Forest", group: "color", swatch: "#2f4f3f" },
    ],
    complementaryIds: ["meridian-sofa", "cascade-table"],
  },
  {
    id: "folio-sideboard",
    name: "Folio Sideboard",
    category: "Storage",
    collection: "Studio",
    summary: "Fluted doors and soft-close drawers for living and hospitality spaces.",
    pricePkr: 265000,
    priceFrom: money(265000),
    image: IMG.catalog1,
    taxonomySlugs: ["storage", "cabinets", "sideboards", "dining", "tv-units"],
    tags: ["Storage", "Sideboard", "Cabinet", "TV"],
    warranty: "3 years",
    availability: "Made to order",
    leadTime: "5–7 weeks",
    brand: "AFH Studio",
    material: "Smoked oak",
    color: "Smoked",
    rating: 4.5,
    dimensions: "2000 × 450 mm",
    specs: [
      { label: "Width", value: "2000 mm" },
      { label: "Finish", value: "Smoked oak" },
      { label: "Hardware", value: "Concealed" },
    ],
    media: [
      { id: "f1", type: "image", url: IMG.catalog1, alt: "Folio Sideboard" },
      { id: "f2", type: "image", url: IMG.wood, alt: "Fluted detail" },
      { id: "f3", type: "image", url: IMG.finish, alt: "Finish" },
    ],
    spinFrames: [IMG.catalog1, IMG.wood, IMG.finish, IMG.catalog1],
    variants: [
      { id: "smoked", label: "Smoked oak", group: "finish" },
      { id: "natural", label: "Natural oak", group: "finish" },
      { id: "concealed", label: "Concealed", group: "hardware" },
      { id: "brass", label: "Brass pull", group: "hardware", priceDeltaPkr: 15000 },
    ],
    complementaryIds: ["cascade-table", "meridian-sofa"],
  },
  {
    id: "harbor-conference",
    name: "Harbor Conference Table",
    category: "Workspace",
    collection: "Studio",
    summary: "Cable-ready conference table for twelve with quiet power integration.",
    pricePkr: 520000,
    priceFrom: money(520000),
    image: IMG.projectA,
    featured: true,
    taxonomySlugs: ["office", "conference"],
    tags: ["Workspace", "Conference", "Office"],
    warranty: "5 years",
    availability: "Project schedule",
    leadTime: "8–10 weeks",
    brand: "AFH Studio",
    material: "Walnut veneer",
    color: "Walnut",
    rating: 4.7,
    dimensions: "3600 × 1400 mm",
    specs: [
      { label: "Length", value: "3600 mm" },
      { label: "Seats", value: "12" },
      { label: "Finish", value: "Walnut veneer" },
    ],
    media: [
      { id: "h1", type: "image", url: IMG.projectA, alt: "Harbor Conference Table" },
      { id: "h2", type: "image", url: IMG.office, alt: "Conference setting" },
    ],
    spinFrames: [IMG.projectA, IMG.office, IMG.wood, IMG.projectA],
    variants: [
      { id: "l360", label: "3600 mm", group: "dimensions" },
      { id: "l420", label: "4200 mm", group: "dimensions", priceDeltaPkr: 80000 },
      { id: "walnut", label: "Walnut", group: "finish" },
    ],
    complementaryIds: ["northline-desk", "grove-lounge"],
  },
  {
    id: "atrium-reception",
    name: "Atrium Reception Desk",
    category: "Workspace",
    collection: "Studio",
    summary: "Sculpted reception desk with accessible transaction height and storage.",
    pricePkr: 380000,
    priceFrom: money(380000),
    image: IMG.projectC,
    taxonomySlugs: ["office", "reception"],
    tags: ["Workspace", "Reception", "Office"],
    warranty: "3 years",
    availability: "Made to order",
    leadTime: "7–9 weeks",
    brand: "AFH Studio",
    material: "Stone + timber",
    color: "Stone",
    rating: 4.6,
    dimensions: "2800 × 900 mm",
    specs: [
      { label: "Width", value: "2800 mm" },
      { label: "Finish", value: "Stone + timber" },
    ],
    media: [
      { id: "a1", type: "image", url: IMG.projectC, alt: "Atrium Reception" },
      { id: "a2", type: "image", url: IMG.catalog4, alt: "Detail" },
    ],
    spinFrames: [IMG.projectC, IMG.catalog4, IMG.finish, IMG.projectC],
    variants: [
      { id: "stone", label: "Stone facing", group: "configuration", priceDeltaPkr: 45000 },
      { id: "timber", label: "Full timber", group: "configuration" },
    ],
    complementaryIds: ["harbor-conference", "grove-lounge"],
  },
];

export function getCatalogueProduct(id: string): CatalogueProduct | undefined {
  return CATALOGUE.find((p) => p.id === id);
}

export function productsForTaxonomySlug(slug: string): readonly CatalogueProduct[] {
  return CATALOGUE.filter((p) => p.taxonomySlugs.includes(slug));
}

export function formatPkr(pkr: number): string {
  return money(pkr);
}

export function resolveVariantPrice(product: CatalogueProduct, selected: ReadonlySet<string>): number {
  let total = product.pricePkr;
  for (const v of product.variants) {
    if (selected.has(v.id) && v.priceDeltaPkr) total += v.priceDeltaPkr;
  }
  return total;
}
