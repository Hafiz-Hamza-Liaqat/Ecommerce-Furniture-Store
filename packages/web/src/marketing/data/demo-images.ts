/**
 * Category-matched Unsplash demo imagery (copyright-safe placeholders).
 * Every ID verified HTTP 200. Keys align to mega-menu subcategories.
 */

const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const DEMO_IMG = {
  sofa: [
    u("photo-1555041469-a586c61ea9bc"),
    u("photo-1493663284031-b7e3aefcae8e"),
    u("photo-1567538096630-e0c55bd6374c"),
  ],
  sectional: [
    u("photo-1615529182904-14819c35db37"),
    u("photo-1493663284031-b7e3aefcae8e"),
    u("photo-1555041469-a586c61ea9bc"),
  ],
  recliner: [
    u("photo-1567538096630-e0c55bd6374c"),
    u("photo-1586023492125-27b2c045efd7"),
    u("photo-1555041469-a586c61ea9bc"),
  ],
  loungeChair: [
    u("photo-1592078615290-033ee584e267"),
    u("photo-1519710164239-da123dc03ef4"),
    u("photo-1567538096630-e0c55bd6374c"),
  ],
  coffeeTable: [
    u("photo-1616486338812-3dadae4b4ace"),
    u("photo-1494438639946-1ebd1d20bf85"),
    u("photo-1617806118233-18e1de247200"),
  ],
  sideTable: [
    u("photo-1494438639946-1ebd1d20bf85"),
    u("photo-1616486338812-3dadae4b4ace"),
    u("photo-1556228578-0d85b1a4d571"),
  ],
  tvUnit: [
    u("photo-1618220179428-22790b461013"),
    u("photo-1586023492125-27b2c045efd7"),
    u("photo-1595428774223-ef52624120d2"),
  ],
  bed: [
    u("photo-1616594039964-ae9021a400a0"),
    u("photo-1505691938895-1758d7feb511"),
    u("photo-1522771739844-6a9f6d5f14af"),
  ],
  wardrobe: [
    u("photo-1631679706909-1844bbd07221"),
    u("photo-1556912173-46c336c7fd55"),
    u("photo-1595428774223-ef52624120d2"),
  ],
  nightstand: [
    u("photo-1556228578-0d85b1a4d571"),
    u("photo-1494438639946-1ebd1d20bf85"),
    u("photo-1583847268964-b28dc8f51f92"),
  ],
  dresser: [
    u("photo-1595428774223-ef52624120d2"),
    u("photo-1556912173-46c336c7fd55"),
    u("photo-1617104678098-de229db51175"),
  ],
  diningTable: [
    u("photo-1617806118233-18e1de247200"),
    u("photo-1616486338812-3dadae4b4ace"),
    u("photo-1618220179428-22790b461013"),
  ],
  diningChair: [
    u("photo-1503602642458-232111445657"),
    u("photo-1592078615290-033ee584e267"),
    u("photo-1519710164239-da123dc03ef4"),
  ],
  sideboard: [
    u("photo-1595428774223-ef52624120d2"),
    u("photo-1611486212557-88be5ff6f941"),
    u("photo-1556912173-46c336c7fd55"),
  ],
  desk: [
    u("photo-1497366216548-37526070297c"),
    u("photo-1556228453-efd6c1ff04f6"),
    u("photo-1497366754035-f200968a6e72"),
  ],
  executiveDesk: [
    u("photo-1497366754035-f200968a6e72"),
    u("photo-1497366216548-37526070297c"),
    u("photo-1556228453-efd6c1ff04f6"),
  ],
  officeChair: [
    u("photo-1580480055273-228ff5388ef8"),
    u("photo-1592078615290-033ee584e267"),
    u("photo-1519710164239-da123dc03ef4"),
  ],
  meetingTable: [
    u("photo-1600566753190-17f0baa2a6c3"),
    u("photo-1497366811353-6870744d04b2"),
    u("photo-1497366216548-37526070297c"),
  ],
  reception: [
    u("photo-1497366811353-6870744d04b2"),
    u("photo-1497366754035-f200968a6e72"),
    u("photo-1600210492486-724fe5c67fb0"),
  ],
  storageCabinet: [
    u("photo-1595428774223-ef52624120d2"),
    u("photo-1617104678098-de229db51175"),
    u("photo-1556912173-46c336c7fd55"),
  ],
  outdoorSofa: [
    u("photo-1600585154340-be6161a56a0c"),
    u("photo-1600566753086-00f18fb6b3ea"),
    u("photo-1600210492486-724fe5c67fb0"),
  ],
  outdoorTable: [
    u("photo-1600566753086-00f18fb6b3ea"),
    u("photo-1600585154340-be6161a56a0c"),
    u("photo-1600607687939-ce8a6c25118c"),
  ],
  outdoorChair: [
    u("photo-1600566753086-00f18fb6b3ea"),
    u("photo-1592078615290-033ee584e267"),
    u("photo-1600585154340-be6161a56a0c"),
  ],
  cabinet: [
    u("photo-1595428774223-ef52624120d2"),
    u("photo-1556912173-46c336c7fd55"),
    u("photo-1617104678098-de229db51175"),
  ],
  shelving: [
    u("photo-1524758631624-e2822e304c36"),
    u("photo-1481627834876-b7833e8f5570"),
    u("photo-1611486212557-88be5ff6f941"),
  ],
  bookcase: [
    u("photo-1481627834876-b7833e8f5570"),
    u("photo-1524758631624-e2822e304c36"),
    u("photo-1611486212557-88be5ff6f941"),
  ],
  console: [
    u("photo-1618220179428-22790b461013"),
    u("photo-1494438639946-1ebd1d20bf85"),
    u("photo-1616486338812-3dadae4b4ace"),
  ],
  leatherSofa: [
    u("photo-1540575467063-178a50c2df87"),
    u("photo-1555041469-a586c61ea9bc"),
    u("photo-1493663284031-b7e3aefcae8e"),
  ],
  visitorChair: [
    u("photo-1519710164239-da123dc03ef4"),
    u("photo-1580480055273-228ff5388ef8"),
    u("photo-1592078615290-033ee584e267"),
  ],
  blog: [
    u("photo-1618220179428-22790b461013", 1600),
    u("photo-1600210492486-724fe5c67fb0", 1600),
    u("photo-1600566753190-17f0baa2a6c3", 1600),
    u("photo-1497366216548-37526070297c", 1600),
    u("photo-1617806118233-18e1de247200", 1600),
    u("photo-1504328345606-18bbc8c9d7d1", 1600),
    u("photo-1611486212557-88be5ff6f941", 1600),
    u("photo-1555041469-a586c61ea9bc", 1600),
  ],
} as const;

export type DemoImageKey = keyof Omit<typeof DEMO_IMG, "blog">;

/** Mega-menu leaf slug → image family (must match subcategory visually). */
export const LEAF_IMAGE_KEY: Record<string, DemoImageKey> = {
  sofas: "sofa",
  sectionals: "sectional",
  recliners: "recliner",
  "lounge-chairs": "loungeChair",
  "coffee-tables": "coffeeTable",
  "side-tables": "sideTable",
  "tv-units": "tvUnit",
  beds: "bed",
  wardrobes: "wardrobe",
  "bedside-tables": "nightstand",
  dressers: "dresser",
  "dining-tables": "diningTable",
  "dining-chairs": "diningChair",
  sideboards: "sideboard",
  workstations: "desk",
  executive: "executiveDesk",
  "executive-chairs": "officeChair",
  conference: "meetingTable",
  reception: "reception",
  "storage-cabinets": "storageCabinet",
  "outdoor-sofas": "outdoorSofa",
  "outdoor-tables": "outdoorTable",
  "outdoor-chairs": "outdoorChair",
  "outdoor-seating": "outdoorSofa",
  cabinets: "cabinet",
  shelves: "shelving",
  bookcases: "bookcase",
  "console-tables": "console",
  "small-tables": "sideTable",
  "accent-chairs": "loungeChair",
  "visitor-chairs": "visitorChair",
  "fabric-sofas": "sofa",
  "leather-sofas": "leatherSofa",
};
