/**
 * RC9.3 — Industry furnishing templates (roles + zones).
 * Products are resolved only via the grounding layer; conceptual roles are flagged.
 */

import type { SpaceBrief, SpaceTemplateId } from "./space-brief";

export type TemplateRole = {
  readonly role: string;
  readonly zone: string;
  readonly slugs: readonly string[];
  /** Prefer cheaper / mid / premium catalogue picks when optimizing. */
  readonly priority: "essential" | "important" | "optional";
  /** When true and no catalogue hit: surface as conceptual (never fake SKU). */
  readonly conceptualFallback?: string;
  readonly qty: (brief: SpaceBrief) => number;
};

export type IndustryTemplate = {
  readonly id: SpaceTemplateId;
  readonly name: string;
  readonly zones: readonly string[];
  readonly roles: readonly TemplateRole[];
};

function flag(brief: SpaceBrief, key: string, fallback = true): boolean {
  return brief.flags[key] ?? fallback;
}

function employees(brief: SpaceBrief): number {
  return Math.max(1, brief.employeeCount ?? brief.seats ?? 8);
}

function seats(brief: SpaceBrief): number {
  return Math.max(1, brief.seats ?? brief.employeeCount ?? 8);
}

export const INDUSTRY_TEMPLATES: Record<SpaceTemplateId, IndustryTemplate> = {
  office: {
    id: "office",
    name: "Office furnishing template",
    zones: ["Reception", "Workstations", "Manager cabins", "Conference", "Waiting", "Decoration"],
    roles: [
      {
        role: "Reception desk",
        zone: "Reception",
        slugs: ["reception"],
        priority: "important",
        qty: (b) => (flag(b, "reception") ? 1 : 0),
      },
      {
        role: "Reception / visitor chairs",
        zone: "Reception",
        slugs: ["visitor-chairs", "lounge-chairs"],
        priority: "important",
        qty: (b) => (flag(b, "reception") ? Math.max(2, Math.ceil(employees(b) / 10)) : 0),
      },
      {
        role: "Reception coffee table",
        zone: "Reception",
        slugs: ["coffee-tables", "side-tables"],
        priority: "optional",
        qty: (b) => (flag(b, "reception") ? 1 : 0),
      },
      {
        role: "Workstation desk",
        zone: "Workstations",
        slugs: ["workstations", "office"],
        priority: "essential",
        qty: (b) => {
          const staff = employees(b);
          const managers = b.managers ?? Math.max(1, Math.ceil(staff * 0.15));
          const cabins = b.executiveCabins ?? 0;
          return Math.max(1, staff - managers - cabins);
        },
      },
      {
        role: "Ergonomic / task chair",
        zone: "Workstations",
        slugs: ["executive-chairs", "visitor-chairs"],
        priority: "essential",
        qty: (b) => employees(b),
      },
      {
        role: "Storage cabinet",
        zone: "Workstations",
        slugs: ["storage-cabinets", "cabinets", "sideboards"],
        priority: "important",
        qty: (b) => Math.max(1, Math.ceil(employees(b) / 8)),
      },
      {
        role: "Mobile storage / pedestal",
        zone: "Workstations",
        slugs: ["storage-cabinets", "cabinets"],
        priority: "optional",
        conceptualFallback: "Mobile pedestal drawers (specify with Sales — not always listed as a standalone SKU)",
        qty: (b) => Math.max(0, Math.ceil(employees(b) / 4)),
      },
      {
        role: "Executive desk",
        zone: "Manager cabins",
        slugs: ["executive", "workstations"],
        priority: "important",
        qty: (b) => {
          if (!flag(b, "cabins", true)) return 0;
          return Math.max(b.executiveCabins ?? 0, b.managers ?? 0, employees(b) >= 8 ? 1 : 0);
        },
      },
      {
        role: "Executive chair",
        zone: "Manager cabins",
        slugs: ["executive-chairs"],
        priority: "important",
        qty: (b) => {
          if (!flag(b, "cabins", true)) return 0;
          return Math.max(b.executiveCabins ?? 0, b.managers ?? 0, employees(b) >= 8 ? 1 : 0);
        },
      },
      {
        role: "Cabin visitor chairs",
        zone: "Manager cabins",
        slugs: ["visitor-chairs"],
        priority: "optional",
        qty: (b) => {
          const cabins = Math.max(b.executiveCabins ?? 0, flag(b, "cabins") ? 1 : 0);
          return cabins * 2;
        },
      },
      {
        role: "Bookshelf / storage",
        zone: "Manager cabins",
        slugs: ["bookcases", "shelves", "sideboards"],
        priority: "optional",
        qty: (b) => Math.max(b.executiveCabins ?? 0, b.managers ? 1 : 0),
      },
      {
        role: "Conference table",
        zone: "Conference",
        slugs: ["conference"],
        priority: "important",
        qty: (b) => (flag(b, "conference") || employees(b) >= 8 ? 1 : 0),
      },
      {
        role: "Conference chairs",
        zone: "Conference",
        slugs: ["visitor-chairs", "executive-chairs"],
        priority: "important",
        qty: (b) => (flag(b, "conference") || employees(b) >= 8 ? Math.min(12, Math.max(6, Math.ceil(employees(b) / 2))) : 0),
      },
      {
        role: "AV wall / display support",
        zone: "Conference",
        slugs: ["tv-units", "console-tables"],
        priority: "optional",
        conceptualFallback: "TV/LCD wall mounting & AV (coordinate with AV vendor — conceptual)",
        qty: (b) => (flag(b, "conference") ? 1 : 0),
      },
      {
        role: "Whiteboard / writing surface",
        zone: "Conference",
        slugs: ["shelves", "console-tables"],
        priority: "optional",
        conceptualFallback: "Whiteboard / presentation board (conceptual accessory)",
        qty: (b) => (flag(b, "conference") ? 1 : 0),
      },
      {
        role: "Waiting sofa / lounge",
        zone: "Waiting",
        slugs: ["sofas", "lounge-chairs", "sectionals"],
        priority: "important",
        qty: (b) => (flag(b, "waitingArea") ? 1 : 0),
      },
      {
        role: "Waiting lounge chairs",
        zone: "Waiting",
        slugs: ["lounge-chairs", "accent-chairs"],
        priority: "optional",
        qty: (b) => (flag(b, "waitingArea") ? 2 : 0),
      },
      {
        role: "Waiting coffee table",
        zone: "Waiting",
        slugs: ["coffee-tables"],
        priority: "optional",
        qty: (b) => (flag(b, "waitingArea") ? 1 : 0),
      },
      {
        role: "Wall shelving / décor storage",
        zone: "Decoration",
        slugs: ["shelves", "bookcases"],
        priority: "optional",
        qty: () => 1,
      },
      {
        role: "Accent lighting / décor",
        zone: "Decoration",
        slugs: ["side-tables", "console-tables"],
        priority: "optional",
        conceptualFallback: "Plants, artwork, wall panels & lighting (styling suggestions — not catalogue SKUs unless listed)",
        qty: () => 1,
      },
    ],
  },

  home: {
    id: "home",
    name: "Home furnishing template",
    zones: ["Living room", "Bedrooms", "Dining", "TV lounge", "Home office", "Decoration"],
    roles: [
      {
        role: "Sofa",
        zone: "Living room",
        slugs: ["sofas", "sectionals", "fabric-sofas"],
        priority: "essential",
        qty: (b) => (flag(b, "livingRoom") || flag(b, "drawingRoom") ? 1 : 0),
      },
      {
        role: "Coffee table",
        zone: "Living room",
        slugs: ["coffee-tables"],
        priority: "important",
        qty: (b) => (flag(b, "livingRoom") || flag(b, "drawingRoom") ? 1 : 0),
      },
      {
        role: "Accent chairs",
        zone: "Living room",
        slugs: ["accent-chairs", "lounge-chairs"],
        priority: "optional",
        qty: (b) => (flag(b, "livingRoom") ? Math.max(1, Math.ceil(seats(b) / 4)) : 0),
      },
      {
        role: "Bed",
        zone: "Bedrooms",
        slugs: ["beds"],
        priority: "essential",
        qty: (b) => Math.max(1, b.bedrooms ?? 1),
      },
      {
        role: "Wardrobe",
        zone: "Bedrooms",
        slugs: ["wardrobes"],
        priority: "essential",
        qty: (b) => Math.max(1, b.bedrooms ?? 1),
      },
      {
        role: "Bedside tables",
        zone: "Bedrooms",
        slugs: ["bedside-tables", "side-tables"],
        priority: "important",
        qty: (b) => Math.max(2, (b.bedrooms ?? 1) * 2),
      },
      {
        role: "Dressing / dresser",
        zone: "Bedrooms",
        slugs: ["dressers"],
        priority: "optional",
        qty: (b) => Math.max(1, Math.ceil((b.bedrooms ?? 1) / 2)),
      },
      {
        role: "Mattress",
        zone: "Bedrooms",
        slugs: ["beds"],
        priority: "optional",
        conceptualFallback: "Mattress sizing to match selected beds (confirm stock with Sales)",
        qty: (b) => Math.max(1, b.bedrooms ?? 1),
      },
      {
        role: "Dining table",
        zone: "Dining",
        slugs: ["dining-tables"],
        priority: "essential",
        qty: (b) => (flag(b, "diningRoom") ? 1 : 0),
      },
      {
        role: "Dining chairs",
        zone: "Dining",
        slugs: ["dining-chairs"],
        priority: "essential",
        qty: (b) => (flag(b, "diningRoom") ? Math.max(4, seats(b)) : 0),
      },
      {
        role: "TV unit",
        zone: "TV lounge",
        slugs: ["tv-units"],
        priority: "important",
        qty: (b) => (flag(b, "tvLounge") || flag(b, "livingRoom") ? 1 : 0),
      },
      {
        role: "Lounge seating",
        zone: "TV lounge",
        slugs: ["sofas", "recliners", "lounge-chairs"],
        priority: "optional",
        qty: (b) => (flag(b, "tvLounge") ? 1 : 0),
      },
      {
        role: "Home office desk",
        zone: "Home office",
        slugs: ["workstations", "executive"],
        priority: "optional",
        qty: (b) => (flag(b, "homeOffice") ? 1 : 0),
      },
      {
        role: "Home office chair",
        zone: "Home office",
        slugs: ["executive-chairs"],
        priority: "optional",
        qty: (b) => (flag(b, "homeOffice") ? 1 : 0),
      },
      {
        role: "Guest room bed",
        zone: "Bedrooms",
        slugs: ["beds"],
        priority: "optional",
        qty: (b) => (flag(b, "guestRoom") ? 1 : 0),
      },
      {
        role: "Sideboard / display",
        zone: "Decoration",
        slugs: ["sideboards", "console-tables"],
        priority: "optional",
        qty: () => 1,
      },
    ],
  },

  hotel: {
    id: "hotel",
    name: "Hotel furnishing template",
    zones: ["Guest rooms", "Lobby", "Reception", "Restaurant", "Waiting"],
    roles: [
      {
        role: "Guest bed",
        zone: "Guest rooms",
        slugs: ["beds"],
        priority: "essential",
        qty: (b) => Math.max(1, b.hotelRooms ?? seats(b)),
      },
      {
        role: "Wardrobe",
        zone: "Guest rooms",
        slugs: ["wardrobes"],
        priority: "essential",
        qty: (b) => Math.max(1, b.hotelRooms ?? seats(b)),
      },
      {
        role: "Nightstands",
        zone: "Guest rooms",
        slugs: ["bedside-tables", "side-tables"],
        priority: "important",
        qty: (b) => Math.max(2, (b.hotelRooms ?? seats(b)) * 2),
      },
      {
        role: "Lobby sofa",
        zone: "Lobby",
        slugs: ["sofas", "sectionals"],
        priority: "important",
        qty: (b) => (flag(b, "lobby") ? Math.max(2, Math.ceil((b.hotelRooms ?? 10) / 15)) : 0),
      },
      {
        role: "Lobby lounge chairs",
        zone: "Lobby",
        slugs: ["lounge-chairs", "accent-chairs"],
        priority: "optional",
        qty: (b) => (flag(b, "lobby") ? 4 : 0),
      },
      {
        role: "Reception desk",
        zone: "Reception",
        slugs: ["reception"],
        priority: "essential",
        qty: (b) => (flag(b, "reception") ? 1 : 0),
      },
      {
        role: "Restaurant dining tables",
        zone: "Restaurant",
        slugs: ["dining-tables"],
        priority: "important",
        qty: (b) => (flag(b, "restaurant") ? Math.max(4, Math.ceil((b.hotelRooms ?? 20) / 4)) : 0),
      },
      {
        role: "Restaurant dining chairs",
        zone: "Restaurant",
        slugs: ["dining-chairs"],
        priority: "important",
        qty: (b) => (flag(b, "restaurant") ? Math.max(16, (b.hotelRooms ?? 20) * 2) : 0),
      },
      {
        role: "Waiting lounge",
        zone: "Waiting",
        slugs: ["sofas", "lounge-chairs"],
        priority: "optional",
        qty: (b) => (flag(b, "waitingArea") ? 1 : 0),
      },
    ],
  },

  restaurant: {
    id: "restaurant",
    name: "Restaurant furnishing template",
    zones: ["Dining", "Counter", "Waiting", "VIP"],
    roles: [
      {
        role: "Dining tables",
        zone: "Dining",
        slugs: ["dining-tables", "outdoor-tables"],
        priority: "essential",
        qty: (b) => Math.max(2, Math.ceil(seats(b) / 4)),
      },
      {
        role: "Dining chairs",
        zone: "Dining",
        slugs: ["dining-chairs", "outdoor-chairs"],
        priority: "essential",
        qty: (b) => Math.max(8, seats(b)),
      },
      {
        role: "Service / sideboard",
        zone: "Dining",
        slugs: ["sideboards"],
        priority: "important",
        qty: () => 1,
      },
      {
        role: "Reception / host stand",
        zone: "Counter",
        slugs: ["reception", "console-tables"],
        priority: "important",
        qty: (b) => (flag(b, "counter") || flag(b, "reception", true) ? 1 : 0),
      },
      {
        role: "Waiting seating",
        zone: "Waiting",
        slugs: ["lounge-chairs", "sofas"],
        priority: "optional",
        qty: (b) => (flag(b, "waitingArea") ? 4 : 0),
      },
      {
        role: "VIP lounge seating",
        zone: "VIP",
        slugs: ["sofas", "lounge-chairs"],
        priority: "optional",
        qty: (b) => (flag(b, "vipSection") ? 1 : 0),
      },
      {
        role: "VIP table",
        zone: "VIP",
        slugs: ["dining-tables", "coffee-tables"],
        priority: "optional",
        qty: (b) => (flag(b, "vipSection") ? 1 : 0),
      },
    ],
  },

  cafe: {
    id: "cafe",
    name: "Café furnishing template",
    zones: ["Seating", "Counter", "Waiting"],
    roles: [
      {
        role: "Café tables",
        zone: "Seating",
        slugs: ["dining-tables", "outdoor-tables", "coffee-tables"],
        priority: "essential",
        qty: (b) => Math.max(4, Math.ceil(seats(b) / 2)),
      },
      {
        role: "Café chairs",
        zone: "Seating",
        slugs: ["dining-chairs", "outdoor-chairs", "lounge-chairs"],
        priority: "essential",
        qty: (b) => Math.max(8, seats(b)),
      },
      {
        role: "Counter / console",
        zone: "Counter",
        slugs: ["reception", "console-tables", "sideboards"],
        priority: "important",
        qty: (b) => (flag(b, "counter") ? 1 : 0),
      },
      {
        role: "Waiting stools / lounge",
        zone: "Waiting",
        slugs: ["lounge-chairs", "accent-chairs"],
        priority: "optional",
        qty: (b) => (flag(b, "waitingArea") ? 3 : 0),
      },
    ],
  },

  school: {
    id: "school",
    name: "School furnishing template",
    zones: ["Classrooms", "Library", "Faculty", "Reception"],
    roles: [
      {
        role: "Student desks / tables",
        zone: "Classrooms",
        slugs: ["workstations", "dining-tables", "office"],
        priority: "essential",
        qty: (b) => Math.max(10, Math.ceil((b.classrooms ?? 4) * 8)),
      },
      {
        role: "Student chairs",
        zone: "Classrooms",
        slugs: ["visitor-chairs", "dining-chairs"],
        priority: "essential",
        qty: (b) => Math.max(20, seats(b), (b.classrooms ?? 4) * 16),
      },
      {
        role: "Library shelving",
        zone: "Library",
        slugs: ["bookcases", "shelves"],
        priority: "important",
        qty: (b) => (flag(b, "library") ? Math.max(4, b.classrooms ?? 4) : 0),
      },
      {
        role: "Faculty desks",
        zone: "Faculty",
        slugs: ["executive", "workstations"],
        priority: "important",
        qty: (b) => (flag(b, "facultyOffices") ? Math.max(2, Math.ceil((b.classrooms ?? 4) / 2)) : 0),
      },
      {
        role: "Faculty chairs",
        zone: "Faculty",
        slugs: ["executive-chairs"],
        priority: "important",
        qty: (b) => (flag(b, "facultyOffices") ? Math.max(2, Math.ceil((b.classrooms ?? 4) / 2)) : 0),
      },
      {
        role: "Reception desk",
        zone: "Reception",
        slugs: ["reception"],
        priority: "important",
        qty: (b) => (flag(b, "reception") ? 1 : 0),
      },
    ],
  },

  university: {
    id: "university",
    name: "University furnishing template",
    zones: ["Lecture", "Library", "Faculty", "Reception"],
    roles: INDUSTRY_TEMPLATES_PLACEHOLDER_UNIVERSITY(),
  },

  hospital: {
    id: "hospital",
    name: "Hospital furnishing template",
    zones: ["Reception", "Waiting", "Consult", "Staff"],
    roles: [
      {
        role: "Reception desk",
        zone: "Reception",
        slugs: ["reception"],
        priority: "essential",
        qty: (b) => (flag(b, "reception") ? 1 : 0),
      },
      {
        role: "Waiting lounge",
        zone: "Waiting",
        slugs: ["sofas", "lounge-chairs"],
        priority: "essential",
        qty: (b) => (flag(b, "waitingArea") ? Math.max(2, Math.ceil(seats(b) / 8)) : 0),
      },
      {
        role: "Waiting chairs",
        zone: "Waiting",
        slugs: ["visitor-chairs", "lounge-chairs"],
        priority: "important",
        qty: (b) => (flag(b, "waitingArea") ? Math.max(6, seats(b)) : 0),
      },
      {
        role: "Consult desk",
        zone: "Consult",
        slugs: ["executive", "workstations"],
        priority: "essential",
        qty: (b) => Math.max(1, b.doctorRooms ?? 4),
      },
      {
        role: "Consult chairs",
        zone: "Consult",
        slugs: ["executive-chairs", "visitor-chairs"],
        priority: "essential",
        qty: (b) => Math.max(2, (b.doctorRooms ?? 4) * 2),
      },
      {
        role: "Staff office desks",
        zone: "Staff",
        slugs: ["workstations"],
        priority: "optional",
        qty: (b) => (flag(b, "staffOffices") ? Math.max(2, Math.ceil((b.doctorRooms ?? 4) / 2)) : 0),
      },
      {
        role: "Patient room seating",
        zone: "Consult",
        slugs: ["lounge-chairs", "visitor-chairs"],
        priority: "optional",
        qty: (b) => (flag(b, "patientRooms") ? Math.max(4, b.doctorRooms ?? 4) : 0),
      },
    ],
  },

  clinic: {
    id: "clinic",
    name: "Clinic furnishing template",
    zones: ["Reception", "Waiting", "Consult"],
    roles: [
      {
        role: "Reception desk",
        zone: "Reception",
        slugs: ["reception"],
        priority: "essential",
        qty: (b) => (flag(b, "reception") ? 1 : 0),
      },
      {
        role: "Waiting seating",
        zone: "Waiting",
        slugs: ["lounge-chairs", "sofas", "visitor-chairs"],
        priority: "essential",
        qty: (b) => (flag(b, "waitingArea") ? Math.max(6, seats(b)) : 0),
      },
      {
        role: "Consult desk",
        zone: "Consult",
        slugs: ["executive", "workstations"],
        priority: "essential",
        qty: (b) => Math.max(1, b.doctorRooms ?? 3),
      },
      {
        role: "Visitor chairs",
        zone: "Consult",
        slugs: ["visitor-chairs"],
        priority: "important",
        qty: (b) => Math.max(2, (b.doctorRooms ?? 3) * 2),
      },
      {
        role: "Storage cabinet",
        zone: "Consult",
        slugs: ["storage-cabinets", "cabinets"],
        priority: "optional",
        qty: (b) => Math.max(1, b.doctorRooms ?? 2),
      },
    ],
  },

  coworking: {
    id: "coworking",
    name: "Coworking furnishing template",
    zones: ["Workstations", "Meeting", "Reception", "Café", "Phone booths"],
    roles: [
      {
        role: "Hot-desk / workstation",
        zone: "Workstations",
        slugs: ["workstations", "office"],
        priority: "essential",
        qty: (b) => seats(b),
      },
      {
        role: "Task chairs",
        zone: "Workstations",
        slugs: ["executive-chairs"],
        priority: "essential",
        qty: (b) => seats(b),
      },
      {
        role: "Meeting table",
        zone: "Meeting",
        slugs: ["conference"],
        priority: "important",
        qty: (b) => Math.max(1, b.meetingRooms ?? 1),
      },
      {
        role: "Meeting chairs",
        zone: "Meeting",
        slugs: ["visitor-chairs"],
        priority: "important",
        qty: (b) => Math.max(6, (b.meetingRooms ?? 1) * 6),
      },
      {
        role: "Reception desk",
        zone: "Reception",
        slugs: ["reception"],
        priority: "important",
        qty: (b) => (flag(b, "reception") ? 1 : 0),
      },
      {
        role: "Café lounge",
        zone: "Café",
        slugs: ["sofas", "lounge-chairs", "dining-tables"],
        priority: "optional",
        qty: (b) => (flag(b, "cafeArea") ? 4 : 0),
      },
      {
        role: "Phone booth seating",
        zone: "Phone booths",
        slugs: ["lounge-chairs", "accent-chairs"],
        priority: "optional",
        conceptualFallback: "Acoustic phone booths (specialist joinery — conceptual unless listed)",
        qty: (b) => (flag(b, "phoneBooths") ? Math.max(2, Math.ceil(seats(b) / 15)) : 0),
      },
    ],
  },

  retail: {
    id: "retail",
    name: "Retail showroom template",
    zones: ["Welcome", "Display", "Customer lounge"],
    roles: [
      {
        role: "Reception / welcome desk",
        zone: "Welcome",
        slugs: ["reception", "console-tables"],
        priority: "essential",
        qty: (b) => (flag(b, "reception") ? 1 : 0),
      },
      {
        role: "Display console / shelves",
        zone: "Display",
        slugs: ["shelves", "bookcases", "sideboards", "console-tables"],
        priority: "essential",
        qty: () => 4,
      },
      {
        role: "Customer lounge sofa",
        zone: "Customer lounge",
        slugs: ["sofas", "lounge-chairs"],
        priority: "important",
        qty: (b) => (flag(b, "waitingArea") ? 1 : 0),
      },
      {
        role: "Lounge chairs",
        zone: "Customer lounge",
        slugs: ["lounge-chairs", "accent-chairs"],
        priority: "optional",
        qty: (b) => (flag(b, "waitingArea") ? Math.max(2, Math.ceil(seats(b) / 4)) : 2),
      },
      {
        role: "Coffee table",
        zone: "Customer lounge",
        slugs: ["coffee-tables"],
        priority: "optional",
        qty: (b) => (flag(b, "waitingArea") ? 1 : 0),
      },
    ],
  },

  jahez: {
    id: "jahez",
    name: "Pakistan Jahez (wedding) package",
    zones: ["Bedroom", "Living room", "Dining", "Storage", "Optional décor"],
    roles: [
      {
        role: "Bed",
        zone: "Bedroom",
        slugs: ["beds"],
        priority: "essential",
        qty: (b) => (flag(b, "bedroom") ? 1 : 0),
      },
      {
        role: "Mattress",
        zone: "Bedroom",
        slugs: ["beds"],
        priority: "important",
        conceptualFallback: "Mattress matched to bed size (confirm availability with Sales)",
        qty: (b) => (flag(b, "bedroom") ? 1 : 0),
      },
      {
        role: "Wardrobe",
        zone: "Bedroom",
        slugs: ["wardrobes"],
        priority: "essential",
        qty: (b) => (flag(b, "bedroom") ? 1 : 0),
      },
      {
        role: "Dressing table",
        zone: "Bedroom",
        slugs: ["dressers", "console-tables"],
        priority: "important",
        qty: (b) => (flag(b, "bedroom") ? 1 : 0),
      },
      {
        role: "Side tables",
        zone: "Bedroom",
        slugs: ["bedside-tables", "side-tables"],
        priority: "important",
        qty: (b) => (flag(b, "bedroom") ? 2 : 0),
      },
      {
        role: "Sofa",
        zone: "Living room",
        slugs: ["sofas", "sectionals", "fabric-sofas"],
        priority: "essential",
        qty: (b) => (flag(b, "livingRoom") ? 1 : 0),
      },
      {
        role: "Coffee table",
        zone: "Living room",
        slugs: ["coffee-tables"],
        priority: "important",
        qty: (b) => (flag(b, "livingRoom") ? 1 : 0),
      },
      {
        role: "TV unit",
        zone: "Living room",
        slugs: ["tv-units"],
        priority: "important",
        qty: (b) => (flag(b, "livingRoom") ? 1 : 0),
      },
      {
        role: "Dining table",
        zone: "Dining",
        slugs: ["dining-tables"],
        priority: "essential",
        qty: (b) => (flag(b, "dining") ? 1 : 0),
      },
      {
        role: "Dining chairs",
        zone: "Dining",
        slugs: ["dining-chairs"],
        priority: "essential",
        qty: (b) => (flag(b, "dining") ? Math.max(4, seats(b)) : 0),
      },
      {
        role: "Crockery / display cabinet",
        zone: "Storage",
        slugs: ["sideboards", "cabinets", "storage-cabinets"],
        priority: "important",
        qty: (b) => (flag(b, "storage", true) ? 1 : 0),
      },
      {
        role: "Decorative accents",
        zone: "Optional décor",
        slugs: ["console-tables", "side-tables"],
        priority: "optional",
        conceptualFallback: "Rugs, lamps, mirrors & décor accents (styling — confirm catalogue items with Sales)",
        qty: (b) => (flag(b, "decor") ? 2 : 0),
      },
    ],
  },

  government: {
    id: "government",
    name: "Government office template",
    zones: ["Reception", "Workstations", "Cabins", "Conference", "Waiting"],
    roles: [], // filled below to mirror office with executive bias
  },
};

function INDUSTRY_TEMPLATES_PLACEHOLDER_UNIVERSITY(): readonly TemplateRole[] {
  return [
    {
      role: "Lecture / study tables",
      zone: "Lecture",
      slugs: ["conference", "dining-tables", "workstations"],
      priority: "essential",
      qty: (b) => Math.max(6, b.classrooms ?? 4),
    },
    {
      role: "Lecture chairs",
      zone: "Lecture",
      slugs: ["visitor-chairs", "dining-chairs"],
      priority: "essential",
      qty: (b) => Math.max(40, seats(b)),
    },
    {
      role: "Library bookcases",
      zone: "Library",
      slugs: ["bookcases", "shelves"],
      priority: "important",
      qty: (b) => (flag(b, "library") ? 8 : 0),
    },
    {
      role: "Faculty desks",
      zone: "Faculty",
      slugs: ["executive", "workstations"],
      priority: "important",
      qty: (b) => (flag(b, "facultyOffices") ? Math.max(4, b.classrooms ?? 4) : 0),
    },
    {
      role: "Faculty chairs",
      zone: "Faculty",
      slugs: ["executive-chairs"],
      priority: "important",
      qty: (b) => (flag(b, "facultyOffices") ? Math.max(4, b.classrooms ?? 4) : 0),
    },
    {
      role: "Reception desk",
      zone: "Reception",
      slugs: ["reception"],
      priority: "important",
      qty: (b) => (flag(b, "reception") ? 1 : 0),
    },
  ];
}

// Government mirrors office with executive defaults
INDUSTRY_TEMPLATES.government = {
  ...INDUSTRY_TEMPLATES.office,
  id: "government",
  name: "Government office template",
};

export function getIndustryTemplate(id: SpaceTemplateId): IndustryTemplate {
  return INDUSTRY_TEMPLATES[id] ?? INDUSTRY_TEMPLATES.office;
}

export function listIndustryTemplates(): readonly IndustryTemplate[] {
  return Object.values(INDUSTRY_TEMPLATES);
}
