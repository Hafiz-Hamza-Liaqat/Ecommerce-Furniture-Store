/**
 * RC9.3 — Space brief / requirement discovery for intelligent planning.
 * Shared by AI Consultant and Budget Planner.
 */

import type { EndUse } from "../budget-planner";
import type { ConsultantStyle } from "./types";

export type SpaceTemplateId =
  | "office"
  | "home"
  | "hotel"
  | "restaurant"
  | "cafe"
  | "school"
  | "university"
  | "hospital"
  | "clinic"
  | "coworking"
  | "retail"
  | "jahez"
  | "government";

export type SpaceBrief = {
  readonly templateId: SpaceTemplateId;
  readonly endUse: EndUse;
  readonly style?: ConsultantStyle;
  readonly budgetPkr?: number;
  /** Primary headcount / seating / family size depending on programme. */
  readonly seats?: number;
  readonly employeeCount?: number;
  readonly managers?: number;
  readonly executiveCabins?: number;
  readonly bedrooms?: number;
  readonly hotelRooms?: number;
  readonly classrooms?: number;
  readonly doctorRooms?: number;
  readonly meetingRooms?: number;
  readonly widthM?: number;
  readonly depthM?: number;
  readonly flags: Readonly<Record<string, boolean>>;
  readonly notes?: string;
};

export type DiscoveryQuestion = {
  readonly id: string;
  readonly label: string;
  readonly kind: "number" | "boolean" | "choice" | "text";
  readonly choices?: readonly string[];
  readonly optional?: boolean;
};

const OFFICE_FLAGS = [
  "reception",
  "waitingArea",
  "conference",
  "openOffice",
  "cabins",
] as const;

const HOME_FLAGS = [
  "livingRoom",
  "drawingRoom",
  "tvLounge",
  "diningRoom",
  "homeOffice",
  "guestRoom",
  "apartment",
] as const;

const HOTEL_FLAGS = ["lobby", "reception", "restaurant", "executiveSuites", "waitingArea"] as const;
const RESTAURANT_FLAGS = ["indoor", "outdoor", "counter", "waitingArea", "vipSection"] as const;
const SCHOOL_FLAGS = ["classrooms", "labs", "library", "facultyOffices", "reception"] as const;
const HOSPITAL_FLAGS = ["reception", "waitingArea", "doctorRooms", "patientRooms", "staffOffices"] as const;
const COWORK_FLAGS = ["reception", "meetingRooms", "cafeArea", "phoneBooths"] as const;
const JAHEZ_FLAGS = ["bedroom", "livingRoom", "dining", "storage", "decor"] as const;

export function templateIdForEndUse(endUse: EndUse | string, industry?: string): SpaceTemplateId {
  const lower = (industry ?? "").toLowerCase();
  if (/jahez|wedding|bride|dowry/.test(lower) || endUse === ("jahez" as EndUse)) return "jahez";
  if (/cafe|café|coffee/.test(lower)) return "cafe";
  if (/retail|showroom|shop/.test(lower)) return "retail";
  switch (endUse) {
    case "office":
    case "home":
    case "hotel":
    case "restaurant":
    case "school":
    case "university":
    case "hospital":
    case "clinic":
    case "coworking":
    case "government":
      return endUse;
    default:
      return "office";
  }
}

export function endUseForTemplate(id: SpaceTemplateId): EndUse {
  switch (id) {
    case "cafe":
      return "restaurant";
    case "retail":
    case "jahez":
      return "home";
    default:
      return id;
  }
}

export function discoveryQuestions(templateId: SpaceTemplateId): readonly DiscoveryQuestion[] {
  switch (templateId) {
    case "office":
    case "government":
      return [
        { id: "employeeCount", label: "Number of employees", kind: "number" },
        { id: "managers", label: "Number of managers", kind: "number", optional: true },
        { id: "executiveCabins", label: "Executive cabins", kind: "number", optional: true },
        { id: "reception", label: "Reception required?", kind: "boolean" },
        { id: "waitingArea", label: "Waiting area required?", kind: "boolean" },
        { id: "conference", label: "Conference room required?", kind: "boolean" },
        { id: "openOffice", label: "Open office layout?", kind: "boolean", optional: true },
        { id: "style", label: "Style preference", kind: "choice", choices: ["modern", "executive", "heritage", "scandinavian"] },
        { id: "budgetPkr", label: "Budget (PKR)", kind: "number" },
      ];
    case "home":
      return [
        { id: "apartment", label: "Apartment (vs house)?", kind: "boolean", optional: true },
        { id: "bedrooms", label: "Number of bedrooms", kind: "number" },
        { id: "livingRoom", label: "Living room?", kind: "boolean" },
        { id: "drawingRoom", label: "Drawing room?", kind: "boolean", optional: true },
        { id: "tvLounge", label: "TV lounge?", kind: "boolean", optional: true },
        { id: "diningRoom", label: "Dining room?", kind: "boolean" },
        { id: "homeOffice", label: "Home office?", kind: "boolean", optional: true },
        { id: "guestRoom", label: "Guest room?", kind: "boolean", optional: true },
        { id: "seats", label: "Family size / seating", kind: "number" },
        { id: "style", label: "Style preference", kind: "choice", choices: ["modern", "heritage", "scandinavian", "luxury"] },
        { id: "budgetPkr", label: "Budget (PKR)", kind: "number" },
      ];
    case "hotel":
      return [
        { id: "hotelRooms", label: "Number of rooms", kind: "number" },
        { id: "lobby", label: "Lobby furniture?", kind: "boolean" },
        { id: "reception", label: "Reception?", kind: "boolean" },
        { id: "restaurant", label: "On-site restaurant?", kind: "boolean", optional: true },
        { id: "executiveSuites", label: "Executive suites?", kind: "boolean", optional: true },
        { id: "waitingArea", label: "Waiting areas?", kind: "boolean", optional: true },
        { id: "style", label: "Style preference", kind: "choice", choices: ["modern", "executive", "luxury", "heritage"] },
        { id: "budgetPkr", label: "Budget (PKR)", kind: "number" },
      ];
    case "restaurant":
    case "cafe":
      return [
        { id: "seats", label: "Seating capacity", kind: "number" },
        { id: "indoor", label: "Indoor seating?", kind: "boolean" },
        { id: "outdoor", label: "Outdoor seating?", kind: "boolean", optional: true },
        { id: "counter", label: "Service counter?", kind: "boolean" },
        { id: "waitingArea", label: "Waiting area?", kind: "boolean", optional: true },
        { id: "vipSection", label: "VIP section?", kind: "boolean", optional: true },
        { id: "style", label: "Style preference", kind: "choice", choices: ["modern", "industrial", "heritage", "contemporary"] },
        { id: "budgetPkr", label: "Budget (PKR)", kind: "number" },
      ];
    case "school":
    case "university":
      return [
        { id: "classrooms", label: "Classrooms / lecture rooms", kind: "number" },
        { id: "labs", label: "Labs?", kind: "boolean", optional: true },
        { id: "library", label: "Library?", kind: "boolean", optional: true },
        { id: "facultyOffices", label: "Faculty offices?", kind: "boolean" },
        { id: "reception", label: "Reception?", kind: "boolean" },
        { id: "seats", label: "Approx. students / seats", kind: "number", optional: true },
        { id: "budgetPkr", label: "Budget (PKR)", kind: "number" },
      ];
    case "hospital":
    case "clinic":
      return [
        { id: "reception", label: "Reception?", kind: "boolean" },
        { id: "waitingArea", label: "Waiting area?", kind: "boolean" },
        { id: "doctorRooms", label: "Doctor / consult rooms", kind: "number" },
        { id: "patientRooms", label: "Patient rooms?", kind: "boolean", optional: true },
        { id: "staffOffices", label: "Staff offices?", kind: "boolean", optional: true },
        { id: "seats", label: "Daily visitor seats (approx.)", kind: "number", optional: true },
        { id: "budgetPkr", label: "Budget (PKR)", kind: "number" },
      ];
    case "coworking":
      return [
        { id: "seats", label: "Number of seats", kind: "number" },
        { id: "meetingRooms", label: "Meeting rooms", kind: "number", optional: true },
        { id: "reception", label: "Reception?", kind: "boolean" },
        { id: "cafeArea", label: "Café area?", kind: "boolean", optional: true },
        { id: "phoneBooths", label: "Phone booths?", kind: "boolean", optional: true },
        { id: "style", label: "Style preference", kind: "choice", choices: ["modern", "industrial", "scandinavian"] },
        { id: "budgetPkr", label: "Budget (PKR)", kind: "number" },
      ];
    case "retail":
      return [
        { id: "seats", label: "Showroom seating / capacity", kind: "number", optional: true },
        { id: "reception", label: "Reception / welcome desk?", kind: "boolean" },
        { id: "waitingArea", label: "Customer lounge?", kind: "boolean", optional: true },
        { id: "budgetPkr", label: "Budget (PKR)", kind: "number" },
      ];
    case "jahez":
      return [
        { id: "bedroom", label: "Include bedroom set?", kind: "boolean" },
        { id: "livingRoom", label: "Include living room?", kind: "boolean" },
        { id: "dining", label: "Include dining?", kind: "boolean" },
        { id: "storage", label: "Include storage / crockery?", kind: "boolean", optional: true },
        { id: "decor", label: "Include décor extras?", kind: "boolean", optional: true },
        { id: "seats", label: "Dining / living seating (approx.)", kind: "number", optional: true },
        { id: "style", label: "Style preference", kind: "choice", choices: ["modern", "heritage", "luxury", "scandinavian"] },
        { id: "budgetPkr", label: "Jahez budget (PKR)", kind: "number" },
      ];
    default:
      return [
        { id: "seats", label: "Capacity / seats", kind: "number" },
        { id: "budgetPkr", label: "Budget (PKR)", kind: "number" },
      ];
  }
}

export function createDefaultBrief(templateId: SpaceTemplateId): SpaceBrief {
  const endUse = endUseForTemplate(templateId);
  const flags: Record<string, boolean> = {};
  const flagSets: Record<string, readonly string[]> = {
    office: OFFICE_FLAGS,
    government: OFFICE_FLAGS,
    home: HOME_FLAGS,
    hotel: HOTEL_FLAGS,
    restaurant: RESTAURANT_FLAGS,
    cafe: RESTAURANT_FLAGS,
    school: SCHOOL_FLAGS,
    university: SCHOOL_FLAGS,
    hospital: HOSPITAL_FLAGS,
    clinic: HOSPITAL_FLAGS,
    coworking: COWORK_FLAGS,
    retail: ["reception", "waitingArea"],
    jahez: JAHEZ_FLAGS,
  };
  for (const f of flagSets[templateId] ?? []) flags[f] = true;
  // Sensible defaults per programme
  if (templateId === "office" || templateId === "government") {
    return {
      templateId,
      endUse,
      employeeCount: 12,
      seats: 12,
      managers: 2,
      executiveCabins: 1,
      flags: { ...flags, openOffice: true, cabins: true },
      budgetPkr: 2_000_000,
      style: "modern",
    };
  }
  if (templateId === "home") {
    return {
      templateId,
      endUse,
      bedrooms: 3,
      seats: 6,
      flags: { ...flags, drawingRoom: false, guestRoom: false, homeOffice: false },
      budgetPkr: 1_500_000,
      style: "modern",
    };
  }
  if (templateId === "jahez") {
    return {
      templateId,
      endUse: "home",
      seats: 6,
      bedrooms: 1,
      flags: { ...flags, decor: false },
      budgetPkr: 1_200_000,
      style: "modern",
    };
  }
  if (templateId === "hotel") {
    return {
      templateId,
      endUse,
      hotelRooms: 20,
      seats: 20,
      flags,
      budgetPkr: 5_000_000,
      style: "executive",
    };
  }
  if (templateId === "restaurant" || templateId === "cafe") {
    return {
      templateId,
      endUse: "restaurant",
      seats: 40,
      flags: { ...flags, outdoor: templateId === "cafe", vipSection: false },
      budgetPkr: 2_500_000,
      style: "modern",
    };
  }
  if (templateId === "coworking") {
    return {
      templateId,
      endUse,
      seats: 30,
      meetingRooms: 2,
      flags: { ...flags, phoneBooths: false },
      budgetPkr: 3_000_000,
      style: "modern",
    };
  }
  if (templateId === "school" || templateId === "university") {
    return {
      templateId,
      endUse,
      classrooms: 6,
      seats: 60,
      flags,
      budgetPkr: 3_000_000,
      style: "modern",
    };
  }
  if (templateId === "hospital" || templateId === "clinic") {
    return {
      templateId,
      endUse,
      doctorRooms: templateId === "clinic" ? 4 : 8,
      seats: 20,
      flags: { ...flags, patientRooms: templateId === "hospital" },
      budgetPkr: 2_500_000,
      style: "modern",
    };
  }
  return {
    templateId,
    endUse,
    seats: 12,
    flags,
    budgetPkr: 2_000_000,
    style: "modern",
  };
}

export function briefFromMemory(partial: {
  endUse?: EndUse;
  industry?: string;
  seats?: number;
  employeeCount?: number;
  budgetPkr?: number;
  style?: ConsultantStyle;
  widthM?: number;
  depthM?: number;
  templateId?: SpaceTemplateId;
}): SpaceBrief {
  const templateId =
    partial.templateId ?? templateIdForEndUse(partial.endUse ?? "office", partial.industry);
  const base = createDefaultBrief(templateId);
  return {
    ...base,
    ...(partial.endUse ? { endUse: partial.endUse } : {}),
    ...(partial.seats != null ? { seats: partial.seats } : {}),
    ...(partial.employeeCount != null
      ? { employeeCount: partial.employeeCount, seats: partial.employeeCount }
      : {}),
    ...(partial.budgetPkr != null ? { budgetPkr: partial.budgetPkr } : {}),
    ...(partial.style ? { style: partial.style } : {}),
    ...(partial.widthM != null ? { widthM: partial.widthM } : {}),
    ...(partial.depthM != null ? { depthM: partial.depthM } : {}),
  };
}

export function missingDiscoveryFollowUp(brief: SpaceBrief): string | null {
  const q = discoveryQuestions(brief.templateId);
  for (const item of q) {
    if (item.optional) continue;
    if (item.id === "budgetPkr" && brief.budgetPkr == null) {
      return "What budget range are you targeting in PKR?";
    }
    if (item.id === "employeeCount" && brief.employeeCount == null && brief.seats == null) {
      return "How many employees will this office support?";
    }
    if (item.id === "seats" && brief.seats == null && brief.employeeCount == null) {
      return item.label;
    }
    if (item.id === "bedrooms" && brief.bedrooms == null) {
      return "How many bedrooms are you furnishing?";
    }
    if (item.id === "hotelRooms" && brief.hotelRooms == null) {
      return "How many hotel rooms should we plan for?";
    }
    if (item.id === "classrooms" && brief.classrooms == null) {
      return "How many classrooms or lecture rooms?";
    }
    if (item.id === "doctorRooms" && brief.doctorRooms == null) {
      return "How many doctor / consultation rooms?";
    }
    if (item.id === "style" && !brief.style) {
      return "Any preferred style — modern, executive, heritage, Scandinavian, or luxury?";
    }
  }
  return null;
}

export const TEMPLATE_LABELS: Record<SpaceTemplateId, string> = {
  office: "Office",
  home: "Home",
  hotel: "Hotel",
  restaurant: "Restaurant",
  cafe: "Café",
  school: "School",
  university: "University",
  hospital: "Hospital",
  clinic: "Clinic",
  coworking: "Coworking",
  retail: "Retail showroom",
  jahez: "Jahez (wedding)",
  government: "Government",
};
