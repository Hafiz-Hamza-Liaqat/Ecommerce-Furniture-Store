import { CATALOGUE, formatPkr } from "../data/catalogue.js";
import { buildPackages, type EndUse, type PlannerStyle } from "./budget-planner.js";
import type { ConsultantMessage } from "./stores.js";

export type ConsultantState = {
  roomType?: string;
  widthM?: number;
  depthM?: number;
  seats?: number;
  style?: PlannerStyle;
  budgetPkr?: number;
  preference?: string;
};

const STEPS = [
  "roomType",
  "dimensions",
  "seats",
  "style",
  "budget",
  "preference",
  "recommend",
] as const;

export function initialAssistantMessage(): ConsultantMessage {
  return {
    role: "assistant",
    text: "Welcome — I’m your AFH furniture consultant. What type of room are we furnishing? (office, home, hotel, restaurant, school, hospital, coworking…)",
    at: new Date().toISOString(),
  };
}

function parseNumber(text: string): number | undefined {
  const n = Number(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function nextConsultantTurn(
  state: ConsultantState,
  userText: string,
): { state: ConsultantState; replies: ConsultantMessage[]; done: boolean } {
  const text = userText.trim();
  const lower = text.toLowerCase();
  const now = () => new Date().toISOString();
  const replies: ConsultantMessage[] = [];
  let next = { ...state };
  let done = false;

  if (!next.roomType) {
    next.roomType = lower.split(/\s+/)[0] ?? "office";
    replies.push({
      role: "assistant",
      text: `Understood — ${next.roomType}. What are the room dimensions in metres? (e.g. 20x15)`,
      at: now(),
    });
    return { state: next, replies, done };
  }

  if (next.widthM == null || next.depthM == null) {
    const parts = text.toLowerCase().split(/[x×,\s]+/).map(parseNumber).filter(Boolean) as number[];
    if (parts.length >= 2) {
      const w = parts[0];
      const d = parts[1];
      if (w != null && d != null) {
        next = { ...next, widthM: w, depthM: d };
      }
      replies.push({
        role: "assistant",
        text: "How many people should this space support?",
        at: now(),
      });
    } else {
      replies.push({
        role: "assistant",
        text: "Please share dimensions like 20x15.",
        at: now(),
      });
    }
    return { state: next, replies, done };
  }

  if (next.seats == null) {
    const seats = parseNumber(text);
    if (seats) {
      next.seats = Math.round(seats);
      replies.push({
        role: "assistant",
        text: "Design style — modern, executive, or heritage?",
        at: now(),
      });
    } else {
      replies.push({ role: "assistant", text: "Please enter a number of employees or seats.", at: now() });
    }
    return { state: next, replies, done };
  }

  if (!next.style) {
    if (lower.includes("exec")) next.style = "executive";
    else if (lower.includes("herit")) next.style = "heritage";
    else next.style = "modern";
    replies.push({
      role: "assistant",
      text: "What is your budget in PKR? (e.g. 2000000)",
      at: now(),
    });
    return { state: next, replies, done };
  }

  if (next.budgetPkr == null) {
    const budget = parseNumber(text);
    if (budget) {
      next.budgetPkr = budget;
      replies.push({
        role: "assistant",
        text: "Any furniture preference — desks focus, lounge focus, or balanced?",
        at: now(),
      });
    } else {
      replies.push({ role: "assistant", text: "Please enter a numeric budget in PKR.", at: now() });
    }
    return { state: next, replies, done };
  }

  if (!next.preference) {
    next.preference = text || "balanced";
  }

  const endUse = (["office", "home", "hotel", "restaurant", "school", "hospital", "coworking", "clinic", "government", "university"].includes(
    next.roomType ?? "",
  )
    ? next.roomType
    : "office") as EndUse;

  const packages = buildPackages({
    budgetPkr: next.budgetPkr,
    endUse,
    style: next.style,
    seats: next.seats ?? 8,
  });
  const rec = packages.find((p) => p.tier === "recommended") ?? packages[0]!;
  const lines = rec.lines
    .map((l) => `• ${l.role}: ${l.product.name} × ${l.qty} (${formatPkr(l.product.pricePkr * l.qty)})`)
    .join("\n");
  const palette = CATALOGUE.filter((p) => rec.lines.some((l) => l.product.id === p.id))
    .map((p) => p.collection)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ");

  replies.push({
    role: "assistant",
    text: [
      `Here’s a ${next.style} package for your ${next.widthM}×${next.depthM}m ${next.roomType} (${next.seats} seats), budget ${formatPkr(next.budgetPkr)}.`,
      "",
      lines,
      "",
      `Estimated total: ${formatPkr(rec.totalPkr)}`,
      `Collections / palette direction: ${palette || "Atelier / Studio"}`,
      "",
      "Next steps: open the Budget Planner to adjust, Request a quotation, book a demo, or continue on WhatsApp. I can also create a CRM inquiry from the Contact form.",
      "",
      "Type “restart” to begin again.",
    ].join("\n"),
    at: now(),
  });
  done = true;
  return { state: next, replies, done };
}

export { STEPS };
