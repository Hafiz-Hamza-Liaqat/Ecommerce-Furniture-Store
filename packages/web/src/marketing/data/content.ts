/**
 * Brand content for the public website — presentation data only.
 * No business logic; copy and media URLs for marketing surfaces.
 */

export const BRAND = {
  name: "Artisan Furnish Hub",
  short: "AFH",
  tagline: "Furniture crafted for lasting spaces.",
  phone: "+92 300 000 0000",
  whatsapp: "923000000000",
  email: "hello@artisanfurnish.example",
  address: "Industrial Estate, Lahore, Pakistan",
} as const;

export const IMG = {
  hero: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=2400&q=80",
  lounge: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=80",
  dining: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1600&q=80",
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
  bedroom: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1600&q=80",
  workshop: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1600&q=80",
  cnc: "https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=1600&q=80",
  wood: "https://images.unsplash.com/photo-1611486212557-88be5ff6f941?auto=format&fit=crop&w=1600&q=80",
  finish: "https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=1600&q=80",
  projectA: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80",
  projectB: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
  projectC: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80",
  team: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80",
  catalog1: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
  catalog2: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=80",
  catalog3: "https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=1200&q=80",
  catalog4: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
} as const;

export type Product = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly collection: string;
  readonly summary: string;
  readonly priceFrom: string;
  readonly image: string;
  readonly specs: readonly { label: string; value: string }[];
  readonly featured?: boolean;
};

/** @deprecated Prefer CATALOGUE from ./catalogue — kept for booklet/home compatibility. */
export const PRODUCTS: readonly Product[] = [
  {
    id: "meridian-sofa",
    name: "Meridian Sofa",
    category: "Lounge",
    collection: "Atelier",
    summary: "Modular lounge system with kiln-dried hardwood frame and performance textiles.",
    priceFrom: "PKR 285,000",
    image: IMG.lounge,
    featured: true,
    specs: [
      { label: "Frame", value: "Seasoned beech" },
      { label: "Depth", value: "980 mm" },
      { label: "Finish", value: "Natural oil" },
    ],
  },
  {
    id: "cascade-table",
    name: "Cascade Dining Table",
    category: "Dining",
    collection: "Heritage",
    summary: "Solid oak top with sculpted pedestal — seats eight with quiet presence.",
    priceFrom: "PKR 410,000",
    image: IMG.dining,
    featured: true,
    specs: [
      { label: "Top", value: "European oak" },
      { label: "Length", value: "2400 mm" },
      { label: "Finish", value: "Matte lacquer" },
    ],
  },
  {
    id: "northline-desk",
    name: "Northline Executive Desk",
    category: "Workspace",
    collection: "Studio",
    summary: "Cable-integrated executive desk for boardrooms and private offices.",
    priceFrom: "PKR 195,000",
    image: IMG.office,
    featured: true,
    specs: [
      { label: "Surface", value: "Walnut veneer" },
      { label: "Width", value: "1800 mm" },
      { label: "Hardware", value: "Brushed steel" },
    ],
  },
  {
    id: "solstice-bed",
    name: "Solstice Bed",
    category: "Bedroom",
    collection: "Atelier",
    summary: "Upholstered headboard with floating platform base and soft radius edges.",
    priceFrom: "PKR 320,000",
    image: IMG.bedroom,
    featured: true,
    specs: [
      { label: "Size", value: "King / Queen" },
      { label: "Upholstery", value: "Wool blend" },
      { label: "Base", value: "Ash plywood" },
    ],
  },
  {
    id: "grove-lounge",
    name: "Grove Lounge Chair",
    category: "Lounge",
    collection: "Heritage",
    summary: "Steam-bent armrests and hand-tied springs for all-day comfort.",
    priceFrom: "PKR 148,000",
    image: IMG.catalog2,
    specs: [
      { label: "Wood", value: "Walnut" },
      { label: "Seat", value: "Down wrap" },
      { label: "Width", value: "760 mm" },
    ],
  },
  {
    id: "folio-sideboard",
    name: "Folio Sideboard",
    category: "Storage",
    collection: "Studio",
    summary: "Fluted doors and soft-close drawers for living and hospitality spaces.",
    priceFrom: "PKR 265,000",
    image: IMG.catalog1,
    specs: [
      { label: "Width", value: "2000 mm" },
      { label: "Finish", value: "Smoked oak" },
      { label: "Hardware", value: "Concealed" },
    ],
  },
  {
    id: "harbor-conference",
    name: "Harbor Conference Table",
    category: "Workspace",
    collection: "Studio",
    summary: "Cable-ready conference table for twelve with quiet power integration.",
    priceFrom: "PKR 520,000",
    image: IMG.projectA,
    featured: true,
    specs: [
      { label: "Length", value: "3600 mm" },
      { label: "Seats", value: "12" },
    ],
  },
  {
    id: "atrium-reception",
    name: "Atrium Reception Desk",
    category: "Workspace",
    collection: "Studio",
    summary: "Sculpted reception desk with accessible transaction height and storage.",
    priceFrom: "PKR 380,000",
    image: IMG.projectC,
    specs: [
      { label: "Width", value: "2800 mm" },
      { label: "Finish", value: "Stone + timber" },
    ],
  },
];

export const COLLECTIONS = [
  { id: "atelier", name: "Atelier", blurb: "Soft architecture for residential living." },
  { id: "heritage", name: "Heritage", blurb: "Timber craftsmanship with modern restraint." },
  { id: "studio", name: "Studio", blurb: "Workplaces that feel considered, not corporate." },
] as const;

export const CATEGORIES = [
  { id: "lounge", name: "Lounge", image: IMG.lounge },
  { id: "dining", name: "Dining", image: IMG.dining },
  { id: "workspace", name: "Workspace", image: IMG.office },
  { id: "bedroom", name: "Bedroom", image: IMG.bedroom },
  { id: "storage", name: "Storage", image: IMG.catalog1 },
] as const;

export const PROJECTS = [
  {
    id: "indus-hq",
    title: "Indus Headquarters",
    category: "Workplace",
    client: "Indus Group",
    summary: "1,200 seats of custom workstations, board suites, and lounge islands.",
    image: IMG.projectA,
    before: IMG.workshop,
    after: IMG.projectA,
  },
  {
    id: "marina-residences",
    title: "Marina Residences",
    category: "Hospitality",
    client: "Marina Hospitality",
    summary: "Guest-room casegoods and lobby seating across 180 keys.",
    image: IMG.projectB,
    before: IMG.wood,
    after: IMG.projectB,
  },
  {
    id: "cedar-club",
    title: "Cedar Private Club",
    category: "Residential",
    client: "Private client",
    summary: "Dining, library, and terrace furniture with site-matched finishes.",
    image: IMG.projectC,
    before: IMG.finish,
    after: IMG.projectC,
  },
] as const;

export const STATS = [
  { value: "28", label: "Years crafting" },
  { value: "640+", label: "Projects delivered" },
  { value: "42", label: "Export markets" },
  { value: "98%", label: "On-time fulfillment" },
] as const;

export const TRUSTED = [
  "Indus Group",
  "Marina Hospitality",
  "Cedar Club",
  "Northline Capital",
  "Horizon Hotels",
  "Studio Kite",
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "AFH treated our headquarters like a product — precise, durable, and calm under daily use.",
    name: "Sana Malik",
    role: "Workplace Director, Indus Group",
  },
  {
    quote:
      "The catalogue experience made specification effortless for our design partners.",
    name: "Omar Reed",
    role: "Principal, Reed & Co.",
  },
  {
    quote:
      "From CNC to finish, their factory transparency gave us confidence at scale.",
    name: "Leila Hassan",
    role: "Procurement Lead, Horizon Hotels",
  },
] as const;

export const TIMELINE = [
  { year: "1998", title: "Workshop founded", body: "A small joinery shop focused on solid timber residential pieces." },
  { year: "2007", title: "Factory expansion", body: "CNC and finishing lines enable hospitality and workplace programs." },
  { year: "2015", title: "Export programs", body: "Collections specified across the Gulf and South Asia." },
  { year: "2022", title: "Digital operations", body: "Enterprise platform unifies catalogue, projects, and fulfillment." },
  { year: "2026", title: "Atelier system", body: "Modular residential and workplace lines with full material control." },
] as const;

export const PROCESS = [
  { title: "Design", body: "Briefing, material boards, and engineering drawings.", image: IMG.catalog3 },
  { title: "Wood processing", body: "Seasoning, cutting, and CNC machining.", image: IMG.wood },
  { title: "Assembly", body: "Joinery, upholstery, and hardware fitting.", image: IMG.workshop },
  { title: "Finishing", body: "Oils, lacquers, and quality inspection.", image: IMG.finish },
  { title: "Packaging", body: "Protective packing engineered for export.", image: IMG.cnc },
  { title: "Delivery", body: "Coordinated install with project managers.", image: IMG.projectA },
] as const;

export const AWARDS = [
  "ISO 9001 Quality Management",
  "FSC Chain-of-Custody Partner",
  "Pakistan Export Excellence — Furniture",
  "Green Factory Initiative",
] as const;

export const FAQ = [
  {
    q: "Do you manufacture custom pieces?",
    a: "Yes. Custom programs run through our project studio with engineering, samples, and production scheduling.",
  },
  {
    q: "Can designers specify finishes?",
    a: "Material, wood, fabric, and finish selectors are available in the digital booklet and quote flow.",
  },
  {
    q: "What is typical lead time?",
    a: "Standard collections ship in 4–8 weeks; custom hospitality programs are scheduled per project plan.",
  },
  {
    q: "Do you export?",
    a: "We fulfill regional and international orders with export-ready packaging and documentation.",
  },
] as const;

export const NEWS = [
  {
    id: "atelier-launch",
    title: "Atelier collection launches",
    date: "March 2026",
    summary: "Soft modular living with performance textiles and solid frames.",
  },
  {
    id: "factory-tour",
    title: "Open factory days",
    date: "February 2026",
    summary: "Architects and procurement teams tour CNC and finishing lines.",
  },
  {
    id: "sustainability",
    title: "Responsible timber update",
    date: "January 2026",
    summary: "Expanded FSC-certified supply for Heritage and Studio lines.",
  },
] as const;

export const LEADERSHIP = [
  { name: "Nadia Farooq", role: "Chief Executive", bio: "Leads growth across manufacturing and brand experience." },
  { name: "Hassan Ali", role: "Head of Manufacturing", bio: "Owns factory systems, quality, and continuous improvement." },
  { name: "Maya Chen", role: "Design Director", bio: "Guides collection language and material storytelling." },
] as const;

export type SitePageContent = {
  readonly title: string;
  readonly description: string;
  readonly eyebrow: string;
  readonly body: readonly string[];
  readonly image?: string;
};

export const SITE_PAGES: Record<string, SitePageContent> = {
  about: {
    title: "About Artisan Furnish Hub",
    eyebrow: "Company",
    description: "A furniture manufacturer building lasting interiors for homes, hotels, and workplaces.",
    image: IMG.workshop,
    body: [
      "We design and manufacture furniture with the discipline of an industrial operation and the care of a craft workshop.",
      "From solid timber processing to upholstery and finishing, every program is engineered for longevity and clarity of form.",
      "Our enterprise platform connects catalogue, projects, and fulfillment so partners can specify with confidence.",
    ],
  },
  story: {
    title: "Our Story",
    eyebrow: "Heritage",
    description: "From a joinery bench to an integrated manufacturing brand.",
    image: IMG.wood,
    body: [
      "Artisan Furnish Hub began as a joinery studio obsessed with honest materials and precise detailing.",
      "Demand from hospitality and workplace clients led us to build a modern factory — without abandoning craft.",
      "Today we serve designers, developers, and enterprises who expect both beauty and operational reliability.",
    ],
  },
  leadership: {
    title: "Leadership",
    eyebrow: "People",
    description: "Operators, makers, and designers guiding the brand.",
    image: IMG.team,
    body: [
      "Our leadership team balances manufacturing excellence with brand experience and partner success.",
      "We invest in apprenticeships, factory safety, and design research so craftsmanship scales responsibly.",
    ],
  },
  manufacturing: {
    title: "Manufacturing",
    eyebrow: "Factory",
    description: "Integrated production from timber yard to finished goods.",
    image: IMG.cnc,
    body: [
      "Our facility combines CNC precision with hand finishing for edges, upholstery, and final inspection.",
      "Production planning, quality gates, and packaging standards support both collections and custom programs.",
    ],
  },
  factory: {
    title: "Factory",
    eyebrow: "Operations",
    description: "A modern plant engineered for quality and throughput.",
    image: IMG.workshop,
    body: [
      "Dedicated zones for wood processing, assembly, upholstery, finishing, and packing keep flow clear.",
      "Visitors can tour selected lines by appointment — transparency is part of how we partner.",
    ],
  },
  technology: {
    title: "Technology",
    eyebrow: "Systems",
    description: "Digital tools that keep craft measurable and on schedule.",
    image: IMG.office,
    body: [
      "CAD/CAM, material tracking, and enterprise workflows connect design intent to factory execution.",
      "Partners benefit from clearer quotes, status visibility, and documentation for every shipment.",
    ],
  },
  sustainability: {
    title: "Sustainability",
    eyebrow: "Responsibility",
    description: "Responsible timber, durable design, and less waste.",
    image: IMG.wood,
    body: [
      "We prioritize certified timber sources, long-life construction, and finishes selected for durability.",
      "Offcut recovery and efficient nesting reduce waste without compromising structural integrity.",
    ],
  },
  quality: {
    title: "Quality Assurance",
    eyebrow: "Standards",
    description: "Inspection at every critical stage of production.",
    image: IMG.finish,
    body: [
      "Dimensional checks, finish adhesion tests, and soft-goods inspection gate every shipment.",
      "Non-conformances feed continuous improvement loops across engineering and the factory floor.",
    ],
  },
  certifications: {
    title: "Certifications",
    eyebrow: "Trust",
    description: "Independent standards that reinforce our process discipline.",
    image: IMG.team,
    body: [
      "ISO 9001 quality management underpins our factory systems.",
      "FSC partnership and export excellence recognitions reflect our commitment to responsible growth.",
    ],
  },
  careers: {
    title: "Careers",
    eyebrow: "Join us",
    description: "Builders, designers, and operators shaping the next generation of furniture.",
    image: IMG.team,
    body: [
      "We hire craftspeople, engineers, project managers, and commercial partners who care about detail.",
      "Open roles are posted seasonally — send portfolios to careers@artisanfurnish.example.",
    ],
  },
  partners: {
    title: "Partners",
    eyebrow: "Ecosystem",
    description: "Architects, interior designers, and developers we build with.",
    image: IMG.projectB,
    body: [
      "Partner programs include specification support, sample libraries, and priority production windows.",
      "We collaborate early so engineering and finish selections stay aligned with site realities.",
    ],
  },
  distributors: {
    title: "Distributors",
    eyebrow: "Network",
    description: "Regional representation for collections and project sales.",
    image: IMG.dining,
    body: [
      "Authorized distributors carry Atelier, Heritage, and Studio lines with local service coverage.",
      "Inquire about territory availability and training for showroom teams.",
    ],
  },
  news: {
    title: "News",
    eyebrow: "Updates",
    description: "Collection launches, factory notes, and partner stories.",
    image: IMG.catalog4,
    body: [
      "Follow product releases, open factory days, and sustainability milestones.",
      "Media inquiries: press@artisanfurnish.example.",
    ],
  },
  blog: {
    title: "Journal",
    eyebrow: "Insights",
    description: "Material stories, workplace trends, and craft notes.",
    image: IMG.catalog3,
    body: [
      "Our journal covers timber selection, hospitality durability, and specifying for long life cycles.",
      "Articles are written for designers and procurement teams who need practical depth.",
    ],
  },
  events: {
    title: "Events",
    eyebrow: "Calendar",
    description: "Showrooms, factory tours, and design gatherings.",
    image: IMG.projectC,
    body: [
      "Join open days at the factory or private showroom appointments for new collections.",
      "Request invitations through events@artisanfurnish.example.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Legal",
    description: "How we collect and protect information on this website.",
    body: [
      "We collect contact details you submit via forms to respond to inquiries and demos.",
      "Analytics may be used to improve site performance; we do not sell personal data.",
      "Contact privacy@artisanfurnish.example for access or deletion requests.",
    ],
  },
  terms: {
    title: "Terms of Use",
    eyebrow: "Legal",
    description: "Conditions for using the Artisan Furnish Hub website.",
    body: [
      "Content is provided for information and specification guidance; product availability may vary.",
      "Quotes and contracts are governed by separate commercial agreements.",
      "Unauthorized scraping or republication of catalogue assets is prohibited.",
    ],
  },
  contact: {
    title: "Contact",
    eyebrow: "Talk to us",
    description: "Showroom, factory, and project inquiries.",
    image: IMG.office,
    body: [
      "Email hello@artisanfurnish.example or call +92 300 000 0000.",
      "Visit by appointment — Industrial Estate, Lahore.",
    ],
  },
  quote: {
    title: "Request a Quote",
    eyebrow: "Projects",
    description: "Tell us about your space, volumes, and timeline.",
    image: IMG.dining,
    body: [
      "Share drawings, finish preferences, and delivery windows. Our studio responds with scope and next steps.",
      "For standard catalogue items, include SKUs from the product pages.",
    ],
  },
  demo: {
    title: "Book a Demo",
    eyebrow: "Experience",
    description: "See the catalogue, booklet, and specification tools live.",
    image: IMG.lounge,
    body: [
      "Schedule a virtual or on-site walkthrough of collections and the digital booklet.",
      "Ideal for design firms and procurement teams evaluating AFH for an upcoming program.",
    ],
  },
  faq: {
    title: "FAQ",
    eyebrow: "Help",
    description: "Answers to common specification and manufacturing questions.",
    body: [
      "Browse frequently asked questions below. For project-specific advice, contact our studio.",
    ],
  },
};
