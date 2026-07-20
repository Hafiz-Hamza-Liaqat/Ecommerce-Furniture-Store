/**
 * RC9.3 — Planner → AI Consultant handoff (session bridge).
 * Completes the integrated journey without changing planning/AI engines.
 */

import { formatPkr } from "../../data/catalogue";
import type { ConsultantMessage } from "../stores";
import type { SpaceBrief, SpaceTemplateId } from "./space-brief";
import { TEMPLATE_LABELS, endUseForTemplate } from "./space-brief";
import type { ConsultantCard, ConsultantMemory, ConsultantStyle } from "./types";

const HANDOFF_KEY = "afh.cx.planner.handoff";

export type PlannerHandoffLine = {
  readonly productId: string;
  readonly name: string;
  readonly qty: number;
  readonly role: string;
  readonly zone?: string;
  readonly unitPkr: number;
  /** RC10.3 — selected catalogue variant ids (additive). */
  readonly variantIds?: readonly string[];
};

export type PlannerHandoffPayload = {
  readonly version: 1;
  readonly templateId: SpaceTemplateId;
  readonly brief: SpaceBrief;
  readonly memory: ConsultantMemory;
  readonly packageName: string;
  readonly packageTier: string;
  readonly totalPkr: number;
  readonly lines: readonly PlannerHandoffLine[];
  readonly explanations: readonly string[];
  readonly upgrades: readonly string[];
  readonly downgrades: readonly string[];
  readonly greeting: string;
};

function seatsOf(brief: SpaceBrief): number {
  return brief.seats ?? brief.employeeCount ?? brief.hotelRooms ?? brief.classrooms ?? 0;
}

export function buildPlannerHandoff(input: {
  templateId: SpaceTemplateId;
  brief: SpaceBrief;
  packageName: string;
  packageTier: string;
  totalPkr: number;
  lines: readonly PlannerHandoffLine[];
  explanations?: readonly string[];
  upgrades?: readonly string[];
  downgrades?: readonly string[];
}): PlannerHandoffPayload {
  const { templateId, brief } = input;
  const label = TEMPLATE_LABELS[templateId] ?? templateId;
  const seats = seatsOf(brief);
  const budgetLabel = brief.budgetPkr != null ? formatPkr(brief.budgetPkr) : "your budget";
  const peopleBit =
    seats > 0
      ? templateId === "office" || templateId === "government" || templateId === "coworking"
        ? ` for ${seats} employees`
        : ` for ${seats} seats`
      : "";

  const memory: ConsultantMemory = {
    endUse: endUseForTemplate(templateId),
    spaceTemplateId: templateId,
    ...(templateId === "jahez" || brief.templateId === "jahez"
      ? { industry: "jahez", roomType: "jahez" }
      : {}),
    ...(brief.seats != null ? { seats: brief.seats } : {}),
    ...(brief.employeeCount != null ? { employeeCount: brief.employeeCount, seats: brief.employeeCount } : {}),
    ...(brief.managers != null ? { managers: brief.managers } : {}),
    ...(brief.executiveCabins != null ? { executiveCabins: brief.executiveCabins } : {}),
    ...(brief.bedrooms != null ? { bedrooms: brief.bedrooms } : {}),
    ...(brief.budgetPkr != null ? { budgetPkr: brief.budgetPkr } : {}),
    ...(brief.style ? { style: brief.style as ConsultantStyle } : {}),
    ...(brief.widthM != null ? { widthM: brief.widthM } : {}),
    ...(brief.depthM != null ? { depthM: brief.depthM } : {}),
    spaceFlags: { ...brief.flags },
    selectedProductIds: input.lines.map((l) => l.productId),
    readyForQuote: true,
    preference: "balanced",
    lastQuery: `Loaded ${label} plan from Budget Planner`,
  };

  const greeting = [
    `I have loaded your ${label} furnishing plan${peopleBit} with a ${budgetLabel} budget.`,
    brief.style ? `Style preference: ${brief.style}.` : null,
    input.packageName ? `Current package: ${input.packageName} (${formatPkr(input.totalPkr)}).` : null,
    "We can now refine materials, layouts, alternatives, or prepare the quotation — you do not need to re-answer the discovery questions.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    version: 1,
    templateId,
    brief,
    memory,
    packageName: input.packageName,
    packageTier: input.packageTier,
    totalPkr: input.totalPkr,
    lines: input.lines,
    explanations: input.explanations ?? [],
    upgrades: input.upgrades ?? [],
    downgrades: input.downgrades ?? [],
    greeting,
  };
}

export function savePlannerHandoff(payload: PlannerHandoffPayload): void {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function peekPlannerHandoff(): PlannerHandoffPayload | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlannerHandoffPayload;
    if (parsed?.version !== 1 || !parsed.memory) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Read and clear so refresh does not repeatedly reset the thread. */
export function consumePlannerHandoff(): PlannerHandoffPayload | null {
  const payload = peekPlannerHandoff();
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    /* ignore */
  }
  return payload;
}

export function handoffToPackageCard(payload: PlannerHandoffPayload): Extract<ConsultantCard, { type: "package" }> {
  const budget = payload.brief.budgetPkr;
  const util =
    budget != null && budget > 0
      ? Math.min(200, Math.round((payload.totalPkr / budget) * 100))
      : undefined;
  const remaining =
    budget != null ? Math.max(0, budget - payload.totalPkr) : undefined;
  return {
    type: "package",
    packageId: payload.packageTier || "recommended",
    name: payload.packageName,
    tier:
      payload.packageTier === "economy" || payload.packageTier === "premium"
        ? payload.packageTier
        : "recommended",
    totalPkr: payload.totalPkr,
    totalLabel: formatPkr(payload.totalPkr),
    ...(budget != null ? { budgetPkr: budget, budgetLabel: formatPkr(budget) } : {}),
    ...(util != null ? { utilizationPercent: util } : {}),
    ...(remaining != null ? { remainingLabel: formatPkr(remaining) } : {}),
    lines: payload.lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      role: l.zone ? `${l.zone} · ${l.role}` : l.role,
      qty: l.qty,
      lineTotalLabel: formatPkr(l.unitPkr * l.qty),
      href: `/products/${l.productId}`,
    })),
    ...(payload.upgrades.length ? { upgrades: [...payload.upgrades] } : {}),
    ...(payload.downgrades.length
      ? { savingsTips: [...payload.downgrades].slice(0, 4) }
      : {}),
  };
}

export function handoffToConsultantBootstrap(payload: PlannerHandoffPayload): {
  memory: ConsultantMemory;
  messages: ConsultantMessage[];
} {
  const packageCard = handoffToPackageCard(payload);
  const actions: ConsultantCard = {
    type: "actions",
    actions: [
      { id: "alts", label: "Show alternatives", kind: "chip", value: "Show alternatives" },
      { id: "quote", label: "Prepare a quotation", kind: "chip", value: "Prepare a quotation" },
      {
        id: "planner",
        label: "Back to budget planner",
        kind: "planner",
        href: `/planner?template=${payload.templateId}`,
      },
      { id: "materials", label: "Refine materials", kind: "chip", value: "Suggest material and finish alternatives" },
    ],
  };
  const message: ConsultantMessage = {
    role: "assistant",
    text: payload.greeting,
    at: new Date().toISOString(),
    cards: [packageCard, actions],
  };
  return { memory: payload.memory, messages: [message] };
}

/** Called on Consultant mount when URL indicates a planner handoff. */
export function bootstrapConsultantFromPlannerUrl(search: string): {
  memory: ConsultantMemory;
  messages: ConsultantMessage[];
} | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  if (params.get("from") !== "planner") return null;

  // Prefer session payload (peek — consume separately so React Strict Mode remounts still see it)
  const payload = peekPlannerHandoff();
  if (payload) return handoffToConsultantBootstrap(payload);

  // Fallback: template query only (no session payload)
  const template = (params.get("template") || "office") as SpaceTemplateId;
  const label = TEMPLATE_LABELS[template] ?? template;
  const memory: ConsultantMemory = {
    endUse: endUseForTemplate(template),
    spaceTemplateId: template,
    ...(template === "jahez" ? { industry: "jahez", roomType: "jahez" } : {}),
    preference: "balanced",
    lastQuery: `Opened consultant from planner (${template})`,
  };
  return {
    memory,
    messages: [
      {
        role: "assistant",
        text: `I see you came from the Budget Planner for ${label}. Share your budget, headcount, or ask me to build a full package and I will continue from there.`,
        at: new Date().toISOString(),
      },
    ],
  };
}
