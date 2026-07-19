/**
 * RC9.1.1 — AFH Blog demo content (original copy; not sourced from third-party sites).
 */

import { DEMO_IMG } from "./demo-images";

export type BlogCategory = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
};

export type BlogBlock =
  | { readonly type: "p"; readonly text: string }
  | { readonly type: "h2"; readonly text: string }
  | { readonly type: "quote"; readonly text: string; readonly attribution?: string }
  | { readonly type: "image"; readonly src: string; readonly alt: string; readonly caption?: string };

export type BlogArticle = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly categoryId: string;
  readonly author: string;
  readonly publishedAt: string;
  readonly readingMinutes: number;
  readonly heroImage: string;
  readonly tags: readonly string[];
  readonly featured?: boolean;
  readonly blocks: readonly BlogBlock[];
};

export const BLOG_CATEGORIES: readonly BlogCategory[] = [
  { id: "industry-news", slug: "industry-news", name: "Industry News", description: "Market and manufacturing signals." },
  { id: "interior-design", slug: "interior-design", name: "Interior Design", description: "Spatial ideas for lasting interiors." },
  { id: "product-releases", slug: "product-releases", name: "Product Releases", description: "New collections and updates." },
  { id: "office-design", slug: "office-design", name: "Office Design", description: "Workplace furniture strategy." },
  { id: "residential", slug: "residential", name: "Residential Inspiration", description: "Homes and apartments." },
  { id: "hospitality", slug: "hospitality", name: "Hospitality", description: "Hotels, restaurants, lobbies." },
  { id: "healthcare", slug: "healthcare", name: "Healthcare", description: "Care environments and durability." },
  { id: "manufacturing", slug: "manufacturing", name: "Manufacturing", description: "Factory craft and process." },
  { id: "sustainability", slug: "sustainability", name: "Sustainability", description: "Materials and longevity." },
  { id: "materials", slug: "materials", name: "Materials", description: "Timber, textiles, finishes." },
  { id: "buying-guides", slug: "buying-guides", name: "Buying Guides", description: "Practical selection advice." },
  { id: "case-studies", slug: "case-studies", name: "Case Studies", description: "Project stories." },
  { id: "knowledge-base", slug: "knowledge-base", name: "Knowledge Base", description: "Care, specs, and FAQs." },
];

const authors = ["Maya Chen", "Omar Rahman", "Sofia Alvarez", "James Okonkwo", "Elena Vasquez"] as const;
const imgs = DEMO_IMG.blog;

function article(
  partial: Omit<BlogArticle, "blocks" | "author" | "readingMinutes" | "heroImage"> & {
    readonly author?: string;
    readonly readingMinutes?: number;
    readonly heroIndex?: number;
    readonly paragraphs: readonly string[];
    readonly quote?: string;
  },
): BlogArticle {
  const hero = imgs[(partial.heroIndex ?? 0) % imgs.length]!;
  const blocks: BlogBlock[] = [
    { type: "p", text: partial.paragraphs[0]! },
    { type: "h2", text: "What this means for project teams" },
    { type: "p", text: partial.paragraphs[1] ?? partial.paragraphs[0]! },
    {
      type: "image",
      src: imgs[((partial.heroIndex ?? 0) + 1) % imgs.length]!,
      alt: `${partial.title} — detail`,
      caption: "AFH studio and project photography placeholders.",
    },
    { type: "p", text: partial.paragraphs[2] ?? partial.paragraphs[0]! },
  ];
  if (partial.quote) {
    blocks.splice(3, 0, { type: "quote", text: partial.quote, attribution: "AFH Design Studio" });
  }
  return {
    id: partial.id,
    slug: partial.slug,
    title: partial.title,
    excerpt: partial.excerpt,
    categoryId: partial.categoryId,
    author: partial.author ?? authors[(partial.heroIndex ?? 0) % authors.length]!,
    publishedAt: partial.publishedAt,
    readingMinutes: partial.readingMinutes ?? 5,
    heroImage: hero,
    tags: partial.tags,
    ...(partial.featured ? { featured: true as const } : {}),
    blocks,
  };
}

export const BLOG_ARTICLES: readonly BlogArticle[] = [
  article({
    id: "b1",
    slug: "quiet-luxury-in-contract-furniture",
    title: "Quiet luxury in contract furniture",
    excerpt: "How restrained materials and durable construction create premium spaces without visual noise.",
    categoryId: "interior-design",
    publishedAt: "2026-06-02",
    tags: ["design", "contract", "materials"],
    featured: true,
    heroIndex: 0,
    quote: "Luxury is the absence of distraction — not the presence of ornament.",
    paragraphs: [
      "Premium furniture brands earn trust through calm detailing: honest joinery, balanced proportions, and finishes that age with dignity. For AFH clients, that means specifying pieces that feel intentional in daylight and artificial light alike.",
      "Contract environments amplify every decision. A sofa’s seam placement, a desk’s cable path, and a table’s edge radius become part of daily ritual. Designing for those rituals is how quiet luxury becomes operational.",
      "When photography eventually replaces placeholders, the same principles apply: show the product in context, keep motion restrained, and let craftsmanship lead the frame.",
    ],
  }),
  article({
    id: "b2",
    slug: "office-furniture-trends-2026",
    title: "Office furniture trends that still respect focus",
    excerpt: "Hybrid work continues to reshape desks, meeting tables, and lounge adjacency.",
    categoryId: "office-design",
    publishedAt: "2026-05-28",
    tags: ["office", "workplace", "trends"],
    heroIndex: 3,
    paragraphs: [
      "Open offices are no longer chasing density alone. Teams want acoustic calm, power within reach, and furniture that supports both heads-down work and short collaboration.",
      "Executive desks remain, but with quieter cable integration. Meeting tables shrink for project rooms while boardroom pieces keep presence for leadership moments.",
      "Specify finishes that survive high traffic without looking institutional — matte woods, performance textiles, and hardware that does not shout.",
    ],
  }),
  article({
    id: "b3",
    slug: "atelier-collection-preview",
    title: "Atelier collection preview: soft geometry",
    excerpt: "A look at upcoming residential silhouettes with kiln-dried frames and performance textiles.",
    categoryId: "product-releases",
    publishedAt: "2026-05-20",
    tags: ["atelier", "release", "residential"],
    featured: true,
    heroIndex: 7,
    paragraphs: [
      "The Atelier line continues AFH’s residential language: soft radii, honest timber, and textiles chosen for longevity rather than trend cycles.",
      "Sofa and lounge chair modules share a common frame language so living rooms can evolve without visual fragmentation.",
      "Spec sheets and finishes will publish with each SKU; until then, the demo catalogue mirrors the intended proportions.",
    ],
  }),
  article({
    id: "b4",
    slug: "hotel-lobby-furniture-checklist",
    title: "Hotel lobby furniture checklist",
    excerpt: "Durability, circulation, and guest photography — what hospitality teams should verify early.",
    categoryId: "hospitality",
    publishedAt: "2026-05-12",
    tags: ["hospitality", "lobby", "checklist"],
    heroIndex: 1,
    paragraphs: [
      "Lobbies are brand stages. Furniture must photograph well and survive continuous use — luggage, children, and late-night check-ins included.",
      "Prioritize cleanable textiles, replaceable cushions, and tables that hide wear at edges. Reception desks need accessible heights without breaking the silhouette.",
      "AFH project teams typically sequence mockups before full production so finishes can be validated under site lighting.",
    ],
  }),
  article({
    id: "b5",
    slug: "timber-sourcing-transparency",
    title: "Timber sourcing with transparency",
    excerpt: "Why chain-of-custody language matters to architects and procurement.",
    categoryId: "sustainability",
    publishedAt: "2026-05-05",
    tags: ["timber", "sustainability", "procurement"],
    heroIndex: 6,
    paragraphs: [
      "Clients increasingly ask where timber originates and how finishes are formulated. Clear documentation reduces risk in public and institutional projects.",
      "Longevity is sustainability: a desk that lasts fifteen years outperforms a disposable alternative regardless of short-term cost.",
      "AFH packaging for quotes keeps Sales authoritative while marketing surfaces explain the material story.",
    ],
  }),
  article({
    id: "b6",
    slug: "choosing-dining-tables-for-eight",
    title: "Choosing dining tables for eight",
    excerpt: "Clearances, pedestal vs legs, and finishes that survive hospitality service.",
    categoryId: "buying-guides",
    publishedAt: "2026-04-28",
    tags: ["dining", "guide", "tables"],
    heroIndex: 4,
    paragraphs: [
      "Seating eight comfortably usually starts around 2200–2400 mm in length, with edge profiles that forgive chair movement.",
      "Pedestal bases improve legroom; four-leg tables can feel more traditional. Match chairs early — seat height and arm clearance decide comfort.",
      "Matte finishes hide micro-scratches better than high gloss in busy dining rooms.",
    ],
  }),
  article({
    id: "b7",
    slug: "factory-cnc-to-hand-finish",
    title: "From CNC precision to hand finish",
    excerpt: "How digital machining and craftsmanship share a single production line.",
    categoryId: "manufacturing",
    publishedAt: "2026-04-21",
    tags: ["factory", "cnc", "craft"],
    heroIndex: 5,
    paragraphs: [
      "CNC accuracy sets joinery tolerances; hand finishing brings surfaces to life. Both matter for furniture that must feel premium up close.",
      "AFH workshop photography placeholders stand in for process chapters — dust extraction, jigging, and QA checkpoints.",
      "When clients tour, they see the same discipline that later appears as quiet edges on a dining table.",
    ],
  }),
  article({
    id: "b8",
    slug: "residential-living-room-layers",
    title: "Layering a residential living room",
    excerpt: "Sofa, lounge chair, and coffee table — a calm composition method.",
    categoryId: "residential",
    publishedAt: "2026-04-14",
    tags: ["residential", "living-room", "styling"],
    heroIndex: 0,
    paragraphs: [
      "Start with circulation: walk paths should not collide with coffee table corners. Sofas face conversation, not only screens.",
      "Lounge chairs add asymmetry without chaos when they share a finish family with the sofa frame.",
      "Keep lighting warmer than showroom LEDs; timber reads richer and textiles feel more inviting.",
    ],
  }),
  article({
    id: "b9",
    slug: "healthcare-furniture-durability",
    title: "Durability cues for healthcare waiting",
    excerpt: "Cleanability and calm design for clinics and wellness centers.",
    categoryId: "healthcare",
    publishedAt: "2026-04-07",
    tags: ["healthcare", "durability", "waiting"],
    heroIndex: 2,
    paragraphs: [
      "Healthcare waiting rooms need soft visual tone with hard-wearing surfaces. Avoid deep crevices that trap debris.",
      "Rounded edges reduce injury risk; replaceable covers extend service life between refurbishment cycles.",
      "Specify finishes approved for the facility’s cleaning protocols before finalizing upholstery.",
    ],
  }),
  article({
    id: "b10",
    slug: "performance-textiles-explained",
    title: "Performance textiles explained",
    excerpt: "Abrasion, cleanability, and colorfastness without heavy jargon.",
    categoryId: "materials",
    publishedAt: "2026-03-30",
    tags: ["textiles", "materials", "specs"],
    heroIndex: 7,
    paragraphs: [
      "Performance textiles balance hand-feel with resistance to staining and abrasion. Not every project needs the highest Martindale rating — match to use.",
      "Darker colors hide wear in hospitality; lighter tones suit residential calm but may need stronger cleanability.",
      "Ask for sample yards under project lighting before locking a large order.",
    ],
  }),
  article({
    id: "b11",
    slug: "case-study-boutique-hotel-lobby",
    title: "Case study: boutique hotel lobby",
    excerpt: "How a compact lobby used modular seating and a sculpted reception desk.",
    categoryId: "case-studies",
    publishedAt: "2026-03-22",
    tags: ["case-study", "hotel", "lobby"],
    heroIndex: 1,
    paragraphs: [
      "A boutique hotel needed a lobby that photographed well for bookings yet survived continuous luggage traffic.",
      "Modular sofas created flexible groupings; a reception desk with accessible height preserved hospitality etiquette.",
      "Lead times aligned with renovation phases so soft seating arrived after flooring cured.",
    ],
  }),
  article({
    id: "b12",
    slug: "care-guide-oil-finished-timber",
    title: "Care guide: oil-finished timber",
    excerpt: "Simple maintenance that protects natural oil finishes over years.",
    categoryId: "knowledge-base",
    publishedAt: "2026-03-15",
    tags: ["care", "timber", "finish"],
    heroIndex: 6,
    paragraphs: [
      "Dust with a soft cloth; avoid silicone polishes that build residue. Use coasters and pads under hot or wet vessels.",
      "Periodic re-oiling restores sheen. Frequency depends on climate and use — hospitality may refresh sooner than homes.",
      "Deep scratches may need professional attention; AFH can advise through the project team.",
    ],
  }),
  article({
    id: "b13",
    slug: "industry-brief-contract-lead-times",
    title: "Industry brief: contract lead times",
    excerpt: "What is driving schedule pressure in custom furniture programs.",
    categoryId: "industry-news",
    publishedAt: "2026-03-08",
    tags: ["industry", "lead-times", "contract"],
    heroIndex: 5,
    paragraphs: [
      "Custom programs remain sensitive to timber availability and finishing capacity. Early specification reduces surprise delays.",
      "Standardized modules help when projects need phased delivery across floors or wings.",
      "AFH demo catalogues show intent; Sales confirms schedule against live production load.",
    ],
  }),
  article({
    id: "b14",
    slug: "meeting-rooms-without-clutter",
    title: "Meeting rooms without clutter",
    excerpt: "Power, screens, and tables that keep collaboration calm.",
    categoryId: "office-design",
    publishedAt: "2026-03-01",
    tags: ["meeting", "office", "power"],
    heroIndex: 3,
    paragraphs: [
      "Cluttered cables undermine even expensive rooms. Integrate power in the table, not as afterthought strips.",
      "Choose tables sized to actual attendance — oversized boards waste space and force awkward seating.",
      "Finishes should match adjacent corridors so rooms feel part of one workplace narrative.",
    ],
  }),
  article({
    id: "b15",
    slug: "bedroom-suites-for-serviced-apartments",
    title: "Bedroom suites for serviced apartments",
    excerpt: "Beds, nightstands, and dressers that balance hotel durability with home comfort.",
    categoryId: "hospitality",
    publishedAt: "2026-02-22",
    tags: ["bedroom", "serviced", "hospitality"],
    heroIndex: 2,
    paragraphs: [
      "Serviced apartments need residential warmth with commercial resilience. Soft headboards and solid nightstands are a proven pair.",
      "Dressers with soft-close drawers reduce noise complaints between units.",
      "Keep textile palettes calm so units photograph consistently for booking engines.",
    ],
  }),
  article({
    id: "b16",
    slug: "outdoor-furniture-for-city-terraces",
    title: "Outdoor furniture for city terraces",
    excerpt: "Teak, aluminum, and quick-dry cushions for compact outdoor rooms.",
    categoryId: "residential",
    publishedAt: "2026-02-14",
    tags: ["outdoor", "terrace", "residential"],
    heroIndex: 1,
    paragraphs: [
      "Urban terraces fight wind, sun, and limited footprints. Lightweight aluminum frames and teak accents perform well.",
      "Quick-dry cushions recover after rain; covers extend life when seasons turn harsh.",
      "Scale furniture to railing heights so views remain open.",
    ],
  }),
  article({
    id: "b17",
    slug: "finish-samples-under-project-light",
    title: "Always review finish samples under project light",
    excerpt: "Why showroom LEDs mislead and how to approve finishes on site.",
    categoryId: "materials",
    publishedAt: "2026-02-07",
    tags: ["finishes", "samples", "lighting"],
    heroIndex: 4,
    paragraphs: [
      "Warm timber can look cold under blue-biased LEDs. Bring samples to the site or mockup room before locking SKUs.",
      "Compare matte and gloss side by side — gloss amplifies fingerprints in high-touch zones.",
      "Document approvals with photos and notes so production matches intent.",
    ],
  }),
  article({
    id: "b18",
    slug: "buying-guide-executive-chairs",
    title: "Buying guide: executive and task chairs",
    excerpt: "Adjustability, upholstery, and base choices for long workdays.",
    categoryId: "buying-guides",
    publishedAt: "2026-01-30",
    tags: ["chairs", "ergonomics", "guide"],
    heroIndex: 3,
    paragraphs: [
      "Task chairs prioritize mesh breathability and synchro tilt; executive chairs add presence with leather or wool.",
      "Test lumbar range with actual users — one size rarely fits a whole leadership team.",
      "Specify casters for flooring type to avoid damage and noise.",
    ],
  }),
  article({
    id: "b19",
    slug: "knowledge-compare-wishlist-tips",
    title: "Using compare and wishlist on AFH",
    excerpt: "How customer tools help shortlist pieces before requesting a quote.",
    categoryId: "knowledge-base",
    publishedAt: "2026-01-22",
    tags: ["wishlist", "compare", "cx"],
    heroIndex: 0,
    paragraphs: [
      "Wishlist keeps favorites across browsing sessions in the browser. Compare highlights dimensions and finishes side by side.",
      "Neither tool replaces Sales quotations — they prepare conversations with clearer intent.",
      "When you are ready, Request quote carries context from the pieces you explored.",
    ],
  }),
  article({
    id: "b20",
    slug: "case-study-headquarters-workplace",
    title: "Case study: headquarters workplace refresh",
    excerpt: "Phased desks, meeting tables, and lounge zones for a growing HQ.",
    categoryId: "case-studies",
    publishedAt: "2026-01-15",
    tags: ["case-study", "office", "phasing"],
    heroIndex: 3,
    paragraphs: [
      "A headquarters refresh needed continuity: employees stayed on-site while floors upgraded in phases.",
      "Standardized workstations simplified moves; feature meeting tables marked collaboration hubs.",
      "Lounge seating near daylight zones improved informal meetings without booking rooms.",
    ],
  }),
];

export function getBlogCategory(idOrSlug: string): BlogCategory | undefined {
  return BLOG_CATEGORIES.find((c) => c.id === idOrSlug || c.slug === idOrSlug);
}

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}

export function articlesForCategory(categoryId: string): readonly BlogArticle[] {
  return BLOG_ARTICLES.filter((a) => a.categoryId === categoryId);
}

export function relatedArticles(article: BlogArticle, limit = 3): readonly BlogArticle[] {
  const same = BLOG_ARTICLES.filter(
    (a) => a.id !== article.id && (a.categoryId === article.categoryId || a.tags.some((t) => article.tags.includes(t))),
  );
  return same.slice(0, limit);
}

export function adjacentArticles(slug: string): {
  prev: BlogArticle | undefined;
  next: BlogArticle | undefined;
} {
  const sorted = [...BLOG_ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const i = sorted.findIndex((a) => a.slug === slug);
  if (i < 0) return { prev: undefined, next: undefined };
  return { prev: sorted[i + 1], next: sorted[i - 1] };
}
