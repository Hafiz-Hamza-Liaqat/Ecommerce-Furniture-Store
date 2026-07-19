/**
 * RC9.2 — Natural language slot extraction (local grounded NLU).
 */

import type { EndUse, PlannerStyle } from "../budget-planner";
import type { ConsultantMemory, ConsultantStyle } from "./types";

const END_USES: readonly EndUse[] = [
  "office",
  "home",
  "hotel",
  "restaurant",
  "school",
  "hospital",
  "coworking",
  "clinic",
  "government",
  "university",
];

const ROOM_ALIASES: Record<string, EndUse> = {
  office: "office",
  workplace: "office",
  workspace: "office",
  "software company": "office",
  company: "office",
  corporate: "office",
  boardroom: "office",
  home: "home",
  house: "home",
  apartment: "home",
  "living room": "home",
  residential: "home",
  hotel: "hotel",
  hospitality: "hotel",
  restaurant: "restaurant",
  cafe: "restaurant",
  café: "restaurant",
  dining: "restaurant",
  jahez: "home",
  wedding: "home",
  dowry: "home",
  showroom: "home",
  retail: "home",
  school: "school",
  classroom: "school",
  hospital: "hospital",
  clinic: "clinic",
  medical: "clinic",
  coworking: "coworking",
  "co-working": "coworking",
  government: "government",
  university: "university",
  campus: "university",
};

const STYLE_ALIASES: Record<string, ConsultantStyle> = {
  modern: "modern",
  executive: "executive",
  heritage: "heritage",
  scandinavian: "scandinavian",
  scandi: "scandinavian",
  nordic: "scandinavian",
  luxury: "luxury",
  premium: "luxury",
  minimal: "minimal",
  minimalist: "minimal",
  industrial: "industrial",
  contemporary: "contemporary",
};

const COLOURS = [
  "walnut", "oak", "ash", "black", "white", "ivory", "sand", "cognac",
  "graphite", "grey", "gray", "beige", "natural", "smoked",
] as const;

const MATERIALS = [
  "leather", "fabric", "textile", "wool", "linen", "mesh", "steel",
  "oak", "walnut", "teak", "veneer",
] as const;

function parseBudget(text: string): number | undefined {
  const lower = text.toLowerCase().replace(/,/g, "");
  const million = lower.match(/(\d+(?:\.\d+)?)\s*(million|m)\b/);
  if (million?.[1]) return Math.round(Number(million[1]) * 1_000_000);
  const lakh = lower.match(/(\d+(?:\.\d+)?)\s*(lakh|lac)\b/);
  if (lakh?.[1]) return Math.round(Number(lakh[1]) * 100_000);
  const pkr = lower.match(/(?:pkr|rs\.?|budget(?:\s+of)?|around|under|upto|up to)?\s*(\d{5,9})\b/);
  if (pkr?.[1]) return Number(pkr[1]);
  const bare = lower.match(/\b(\d{6,9})\b/);
  if (bare?.[1] && /budget|pkr|rs|price|spend|million|afford/.test(lower)) return Number(bare[1]);
  return undefined;
}

function parseSeats(text: string): number | undefined {
  const lower = text.toLowerCase();
  const m =
    lower.match(/(\d+)\s*(?:person|people|employees?|staff|seats?|heads?|pax)\b/) ??
    lower.match(/\b(?:for|seat(?:ing)?|support)\s+(\d+)\b/) ??
    lower.match(/\b(\d+)\s*(?:-person)\b/);
  if (m?.[1]) return Math.round(Number(m[1]));
  if (/^\d{1,3}$/.test(text.trim()) && Number(text.trim()) <= 500) return Math.round(Number(text.trim()));
  return undefined;
}

function parseCount(text: string, patterns: RegExp[]): number | undefined {
  const lower = text.toLowerCase();
  for (const re of patterns) {
    const m = lower.match(re);
    if (m?.[1]) return Math.round(Number(m[1]));
  }
  return undefined;
}

function parseDimensions(text: string): { widthM?: number; depthM?: number } {
  const m = text.toLowerCase().match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/);
  if (m?.[1] && m?.[2]) return { widthM: Number(m[1]), depthM: Number(m[2]) };
  const sq = text.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(?:sqm|m2|m²|square\s*met)/);
  if (sq?.[1]) {
    const side = Math.sqrt(Number(sq[1]));
    return { widthM: Math.round(side * 10) / 10, depthM: Math.round(side * 10) / 10 };
  }
  return {};
}

function detectEndUse(lower: string): { endUse?: EndUse; roomType?: string; industry?: string } {
  for (const [alias, endUse] of Object.entries(ROOM_ALIASES)) {
    if (!lower.includes(alias)) continue;
    const roomType = alias.includes("living") ? "living room" : endUse;
    if (/jahez|wedding|dowry|bride/.test(lower)) return { endUse: "home", roomType: "jahez", industry: "jahez" };
    if (/software|tech|it\b/.test(lower)) return { endUse, roomType, industry: "software" };
    if (/hotel|hospitality/.test(lower)) return { endUse, roomType, industry: "hospitality" };
    if (/restaurant|cafe|café/.test(lower)) return { endUse, roomType, industry: "fnb" };
    if (/retail|showroom/.test(lower)) return { endUse, roomType, industry: "retail" };
    return { endUse, roomType };
  }
  for (const eu of END_USES) {
    if (lower.includes(eu)) return { endUse: eu, roomType: eu };
  }
  return {};
}

function detectStyle(lower: string): ConsultantStyle | undefined {
  for (const [alias, style] of Object.entries(STYLE_ALIASES)) {
    if (lower.includes(alias)) return style;
  }
  return undefined;
}

function detectPreference(lower: string): string | undefined {
  if (/desk|workstation|executive desk/.test(lower)) return "desks focus";
  if (/lounge|sofa|seating lounge/.test(lower)) return "lounge focus";
  if (/dining|restaurant table/.test(lower)) return "dining";
  if (/bedroom|bed\b|wardrobe/.test(lower)) return "bedroom";
  if (/storage|cabinet|shelving/.test(lower)) return "storage";
  if (/balanced|mix|complete|entire|whole/.test(lower)) return "balanced";
  return undefined;
}

export type ExtractedSlots = {
  restart?: boolean;
  wantsQuote?: boolean;
  wantsHandoff?: boolean;
  wantsPackage?: boolean;
  wantsAlternatives?: boolean;
  lastQuery?: string;
  endUse?: EndUse;
  roomType?: string;
  industry?: string;
  widthM?: number;
  depthM?: number;
  seats?: number;
  employeeCount?: number;
  style?: ConsultantStyle;
  colours?: readonly string[];
  materials?: readonly string[];
  budgetPkr?: number;
  preference?: string;
  managers?: number;
  executiveCabins?: number;
  bedrooms?: number;
  spaceFlags?: Record<string, boolean>;
};

export function extractSlots(userText: string, prior: ConsultantMemory = {}): ExtractedSlots {
  const text = userText.trim();
  const lower = text.toLowerCase();
  if (!text) return {};
  if (/^(restart|start over|reset)\b/.test(lower)) return { restart: true };

  const room = detectEndUse(lower);
  const style = detectStyle(lower);
  const budget = parseBudget(lower);
  const seats = parseSeats(lower);
  const dims = parseDimensions(lower);
  const pref = detectPreference(lower);
  const colours = COLOURS.filter((c) => lower.includes(c));
  const materials = MATERIALS.filter((m) => lower.includes(m));
  const managers = parseCount(lower, [/(\d+)\s*managers?\b/, /managers?\s*[:=]?\s*(\d+)/]);
  const cabins = parseCount(lower, [/(\d+)\s*(?:executive\s*)?cabins?\b/, /cabins?\s*[:=]?\s*(\d+)/]);
  const bedrooms = parseCount(lower, [/(\d+)\s*bedrooms?\b/, /bedrooms?\s*[:=]?\s*(\d+)/]);

  const spaceFlags: Record<string, boolean> = { ...(prior.spaceFlags ?? {}) };
  if (/no reception|without reception/.test(lower)) spaceFlags.reception = false;
  else if (/\breception\b/.test(lower)) spaceFlags.reception = true;
  if (/no (waiting|wait area)|without waiting/.test(lower)) spaceFlags.waitingArea = false;
  else if (/waiting/.test(lower)) spaceFlags.waitingArea = true;
  if (/no conference|without conference/.test(lower)) spaceFlags.conference = false;
  else if (/conference|boardroom/.test(lower)) spaceFlags.conference = true;
  if (/open office/.test(lower)) spaceFlags.openOffice = true;
  if (/\bcabins?\b/.test(lower)) spaceFlags.cabins = true;

  let endUse = room.endUse;
  let roomType = room.roomType;
  let resolvedStyle = style;

  if (!endUse && !prior.roomType && END_USES.includes(lower as EndUse)) {
    endUse = lower as EndUse;
    roomType = lower;
  }
  if (!resolvedStyle && !prior.style && STYLE_ALIASES[lower]) {
    resolvedStyle = STYLE_ALIASES[lower];
  }

  return {
    lastQuery: text,
    ...(endUse ? { endUse } : {}),
    ...(roomType ? { roomType } : {}),
    ...(room.industry ? { industry: room.industry } : {}),
    ...(resolvedStyle ? { style: resolvedStyle } : {}),
    ...(budget != null ? { budgetPkr: budget } : {}),
    ...(seats != null ? { seats, employeeCount: seats } : {}),
    ...(dims.widthM != null ? { widthM: dims.widthM } : {}),
    ...(dims.depthM != null ? { depthM: dims.depthM } : {}),
    ...(pref ? { preference: pref } : {}),
    ...(managers != null ? { managers } : {}),
    ...(cabins != null ? { executiveCabins: cabins } : {}),
    ...(bedrooms != null ? { bedrooms } : {}),
    ...(Object.keys(spaceFlags).length ? { spaceFlags } : {}),
    ...(colours.length ? { colours: [...new Set([...(prior.colours ?? []), ...colours])] } : {}),
    ...(materials.length ? { materials: [...new Set([...(prior.materials ?? []), ...materials])] } : {}),
    ...(/quote|quotation|proposal/.test(lower) ? { wantsQuote: true } : {}),
    ...(/whatsapp|sales|handoff|contact|call me|speak/.test(lower) ? { wantsHandoff: true } : {}),
    ...(/package|furnish|entire|complete set|full room|solution|planner/.test(lower) ? { wantsPackage: true } : {}),
    ...(/alternative|other option|instead|similar/.test(lower) ? { wantsAlternatives: true } : {}),
  };
}

export function mergeMemory(prior: ConsultantMemory, slots: ExtractedSlots): ConsultantMemory {
  return {
    ...prior,
    ...(slots.endUse ? { endUse: slots.endUse } : {}),
    ...(slots.roomType ? { roomType: slots.roomType } : {}),
    ...(slots.industry ? { industry: slots.industry } : {}),
    ...(slots.widthM != null ? { widthM: slots.widthM } : {}),
    ...(slots.depthM != null ? { depthM: slots.depthM } : {}),
    ...(slots.seats != null ? { seats: slots.seats } : {}),
    ...(slots.employeeCount != null ? { employeeCount: slots.employeeCount } : {}),
    ...(slots.style ? { style: slots.style } : {}),
    ...(slots.budgetPkr != null ? { budgetPkr: slots.budgetPkr } : {}),
    ...(slots.preference ? { preference: slots.preference } : {}),
    ...(slots.managers != null ? { managers: slots.managers } : {}),
    ...(slots.executiveCabins != null ? { executiveCabins: slots.executiveCabins } : {}),
    ...(slots.bedrooms != null ? { bedrooms: slots.bedrooms } : {}),
    ...(slots.spaceFlags ? { spaceFlags: slots.spaceFlags } : {}),
    ...(slots.colours ? { colours: slots.colours } : {}),
    ...(slots.materials ? { materials: slots.materials } : {}),
    ...(slots.lastQuery ? { lastQuery: slots.lastQuery } : {}),
    ...(slots.wantsQuote ? { readyForQuote: true } : {}),
  };
}

export function missingFollowUps(memory: ConsultantMemory): string | null {
  if (!memory.endUse && !memory.roomType) {
    return "What type of space are you furnishing? (office, home, hotel, restaurant, school, jahez…)";
  }
  if (memory.industry === "jahez" || memory.roomType === "jahez") {
    if (memory.budgetPkr == null) {
      return "What Jahez budget are you targeting in PKR?";
    }
    if (!memory.style) {
      return "Preferred Jahez style — modern, heritage, Scandinavian, or luxury?";
    }
    return null;
  }
  if (memory.endUse === "office" || memory.endUse === "government") {
    if (memory.seats == null && memory.employeeCount == null) {
      return "How many employees will this office support?";
    }
    if (memory.managers == null && !memory.spaceFlags?.conference) {
      return "How many managers / executive cabins, and do you need reception, waiting, and a conference room?";
    }
  }
  if (memory.endUse === "home" && memory.bedrooms == null && memory.industry !== "jahez") {
    if (!memory.preference?.includes("bedroom") && memory.seats == null) {
      return "Is this an apartment or house, and how many bedrooms are you furnishing?";
    }
  }
  if (memory.seats == null && memory.employeeCount == null) {
    if (memory.endUse === "coworking" || memory.endUse === "school" || memory.endUse === "restaurant" || memory.endUse === "hotel") {
      return "How many people / seats should this space support?";
    }
  }
  if (memory.budgetPkr == null) {
    return "What budget range are you targeting in PKR? (e.g. 1.5 million or 1500000)";
  }
  if (!memory.style) {
    return "Any preferred style — modern, executive, heritage, Scandinavian, or luxury?";
  }
  if (memory.widthM == null && memory.depthM == null) {
    if (!memory.preference && !memory.lastQuery?.match(/package|furnish|recommend|planner/i)) {
      return "Approximately how large is the room? (e.g. 20x15 metres) — optional but helpful.";
    }
  }
  return null;
}

export function toPlannerStyle(style?: ConsultantStyle): PlannerStyle {
  if (style === "executive" || style === "heritage" || style === "modern") return style;
  if (style === "luxury") return "executive";
  if (style === "scandinavian" || style === "minimal" || style === "contemporary") return "modern";
  if (style === "industrial") return "modern";
  return "modern";
}

export function toEndUse(memory: ConsultantMemory): EndUse {
  if (memory.endUse) return memory.endUse;
  const rt = (memory.roomType ?? "office").toLowerCase();
  if (END_USES.includes(rt as EndUse)) return rt as EndUse;
  return "office";
}
