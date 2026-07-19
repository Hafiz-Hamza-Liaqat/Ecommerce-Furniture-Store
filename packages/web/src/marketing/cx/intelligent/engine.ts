/**
 * RC9.2 — Grounded conversation engine (local AI consultant brain).
 */

import { formatPkr } from "../../data/catalogue";
import { BRAND } from "../../data/content";
import type { ConsultantMessage } from "../stores";
import { recommendFromCatalog } from "./grounding";
import {
  extractSlots,
  mergeMemory,
  missingFollowUps,
  toEndUse,
} from "./nlu";
import { assembleIntelligentPackage, packageToCard } from "./packages";
import { quoteCardFromPackage } from "./quote";
import type {
  ConsultantAction,
  ConsultantCard,
  ConsultantMemory,
  ConsultantTurnResult,
  ProductRecommendation,
} from "./types";

function now(): string {
  return new Date().toISOString();
}

function msg(
  text: string,
  cards?: readonly ConsultantCard[],
): ConsultantMessage {
  return {
    role: "assistant",
    text,
    at: now(),
    ...(cards?.length ? { cards: [...cards] } : {}),
  };
}

function productCard(rec: ProductRecommendation): Extract<ConsultantCard, { type: "product" }> {
  const p = rec.product;
  return {
    type: "product",
    productId: p.id,
    name: p.name,
    priceFrom: p.priceFrom,
    image: p.image,
    href: `/products/${p.id}`,
    reasons: rec.reasons,
    alternatives: rec.alternatives.map((a) => ({
      productId: a.product.id,
      name: a.product.name,
      priceFrom: a.product.priceFrom,
      href: `/products/${a.product.id}`,
      tradeoff: a.tradeoff,
    })),
  };
}

function handoffActions(memory: ConsultantMemory, quoteHref?: string): ConsultantAction[] {
  const wa = `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(
    `Hi AFH — furniture consultant handoff. Space: ${memory.endUse ?? memory.roomType ?? "n/a"}; seats: ${memory.seats ?? memory.employeeCount ?? "n/a"}; budget: ${memory.budgetPkr ? formatPkr(memory.budgetPkr) : "n/a"}; style: ${memory.style ?? "n/a"}.`,
  )}`;
  return [
    { id: "quote", label: "Request quotation", kind: "quote", href: quoteHref ?? "/quote?from=consultant" },
    { id: "planner", label: "Open budget planner", kind: "planner", href: `/planner?template=${memory.spaceTemplateId ?? memory.endUse ?? "office"}` },
    { id: "whatsapp", label: "WhatsApp", kind: "whatsapp", href: wa },
    { id: "contact", label: "Contact sales", kind: "link", href: "/contact" },
    { id: "demo", label: "Book consultation", kind: "link", href: "/demo" },
    { id: "lead", label: "Create CRM lead", kind: "lead" },
  ];
}

function suggestionChips(memory: ConsultantMemory): string[] {
  const chips: string[] = [];
  if (!memory.budgetPkr) chips.push("Budget is PKR 1.5 million");
  if (!memory.style) chips.push("Scandinavian style");
  if (memory.seats == null) chips.push("We have 20 employees");
  if (!memory.widthM) chips.push("Room is 20x15 metres");
  chips.push("Build a full package");
  chips.push("Show alternatives");
  chips.push("Prepare a quotation");
  return chips.slice(0, 5);
}

function summarizeContext(memory: ConsultantMemory): string {
  const bits: string[] = [];
  if (memory.endUse || memory.roomType) bits.push(`space=${memory.endUse ?? memory.roomType}`);
  if (memory.industry) bits.push(`industry=${memory.industry}`);
  if (memory.seats ?? memory.employeeCount) bits.push(`people=${memory.seats ?? memory.employeeCount}`);
  if (memory.widthM && memory.depthM) bits.push(`size=${memory.widthM}×${memory.depthM}m`);
  if (memory.style) bits.push(`style=${memory.style}`);
  if (memory.budgetPkr) bits.push(`budget=${formatPkr(memory.budgetPkr)}`);
  if (memory.preference) bits.push(`focus=${memory.preference}`);
  if (memory.materials?.length) bits.push(`materials=${memory.materials.join("/")}`);
  if (memory.colours?.length) bits.push(`colours=${memory.colours.join("/")}`);
  return bits.length ? `Context I’m using: ${bits.join(" · ")}.` : "";
}

function buildRecommendationReply(
  memory: ConsultantMemory,
  opts: { packageMode: boolean; quoteMode: boolean },
): ConsultantTurnResult {
  const recs = recommendFromCatalog(
    memory,
    memory.lastQuery ? { limit: 3, seedText: memory.lastQuery } : { limit: 3 },
  );
  if (recs.length === 0) {
    return {
      state: memory,
      done: false,
      replies: [
        msg(
          [
            "I could not find catalogue matches for that combination yet.",
            "AFH recommendations are grounded only in live catalogue products — I will not invent pieces.",
            "Try broadening style, raising budget slightly, or naming a category (desks, sofas, dining…).",
            summarizeContext(memory),
          ]
            .filter(Boolean)
            .join("\n\n"),
          [
            {
              type: "actions",
              actions: [
                ...suggestionChips(memory).map((c) => ({
                  id: c,
                  label: c,
                  kind: "chip" as const,
                  value: c,
                })),
              ],
            },
          ],
        ),
      ],
    };
  }

  const cards: ConsultantCard[] = recs.map(productCard);
  const { packages, primary } = assembleIntelligentPackage(memory);
  const pkgCard = packageToCard(primary, memory);
  const economy = packages.find((p) => p.tier === "economy");
  const premium = packages.find((p) => p.tier === "premium");

  if (opts.packageMode || (memory.budgetPkr && memory.style && (memory.seats || memory.endUse))) {
    cards.push(pkgCard);
    if (economy) {
      cards.push(packageToCard(economy, memory));
    }
    if (premium) {
      cards.push(packageToCard(premium, memory));
    }
  }

  let quoteHref: string | undefined;
  if (opts.quoteMode || memory.readyForQuote) {
    const q = quoteCardFromPackage(primary, memory);
    cards.push(q);
    quoteHref = q.quoteHref;
  }

  cards.push({ type: "actions", actions: handoffActions(memory, quoteHref) });

  const lead = recs[0]!;
  const altText = lead.alternatives
    .slice(0, 3)
    .map((a) => `• ${a.product.name} — ${a.tradeoff}`)
    .join("\n");

  const text = [
    opts.packageMode
      ? `Here is a grounded furnishing direction for your ${toEndUse(memory)} programme.`
      : `Based on what you’ve shared, here are catalogue-grounded recommendations.`,
    summarizeContext(memory),
    "",
    `Primary pick: ${lead.product.name} (${lead.product.priceFrom}).`,
    ...lead.reasons.map((r) => `• ${r}`),
    "",
    altText ? `Alternatives:\n${altText}` : "Alternatives: limited in this filter — ask me to widen style or budget.",
    "",
    opts.packageMode
      ? `Package estimate (${primary.name}): ${formatPkr(primary.totalPkr)}${memory.budgetPkr ? ` against ${formatPkr(memory.budgetPkr)}` : ""}.`
      : "Say “build a full package” for a complete room solution, or “prepare a quotation” when you’re ready.",
    "",
    "I only recommend AFH catalogue products. Display prices are estimates — formal quotes go through Sales.",
  ]
    .filter(Boolean)
    .join("\n");

  const selectedIds = [
    ...(memory.selectedProductIds ?? []),
    ...recs.map((r) => r.product.id),
    ...primary.lines.map((l) => l.product.id),
  ];

  const nextState: ConsultantMemory = {
    ...memory,
    selectedProductIds: [...new Set(selectedIds)].slice(0, 24),
    ...(opts.quoteMode || memory.readyForQuote ? { readyForQuote: true as const } : {}),
  };
  return {
    state: nextState,
    done: true,
    replies: [msg(text, cards)],
    typingMs: 420,
  };
}

/**
 * Core turn — NL understanding + memory merge + grounded answers.
 * Extends (does not delete) the classic discovery path.
 */
export function runConsultantTurn(
  state: ConsultantMemory,
  userText: string,
): ConsultantTurnResult {
  const slots = extractSlots(userText, state);
  if (slots.restart) {
    return {
      state: {},
      done: false,
      replies: [
        msg(
          "Welcome back — I’m your AFH furniture consultant. Tell me about the space in your own words (for example: “I need furniture for a 20-person software company”).",
          [
            {
              type: "actions",
              actions: suggestionChips({}).map((c) => ({
                id: c,
                label: c,
                kind: "chip",
                value: c,
              })),
            },
          ],
        ),
      ],
    };
  }

  const memory = mergeMemory(state, slots);
  const followUp = missingFollowUps(memory);

  // Enough context OR user explicitly asks to recommend/package/quote
  const forceRecommend =
    slots.wantsPackage ||
    slots.wantsQuote ||
    slots.wantsAlternatives ||
    /recommend|suggest|show me|what should|package|quotation|furnish/i.test(userText);

  if (followUp && !forceRecommend) {
    // Soft: if user already gave a rich NL opener with endUse+budget, skip soft dimension ask
    const richEnough =
      !!(memory.endUse || memory.roomType) &&
      memory.budgetPkr != null &&
      !!memory.style &&
      (memory.seats != null || memory.employeeCount != null);

    if (!richEnough) {
      return {
        state: memory,
        done: false,
        typingMs: 280,
        replies: [
          msg(
            [
              "Got it — I’m keeping everything you’ve shared so far.",
              summarizeContext(memory),
              "",
              followUp,
            ]
              .filter(Boolean)
              .join("\n"),
            [
              {
                type: "actions",
                actions: suggestionChips(memory).map((c) => ({
                  id: c,
                  label: c,
                  kind: "chip",
                  value: c,
                })),
              },
            ],
          ),
        ],
      };
    }
  }

  return buildRecommendationReply(memory, {
    packageMode: !!(slots.wantsPackage || (memory.budgetPkr && memory.style)),
    quoteMode: !!slots.wantsQuote,
  });
}

export function initialAssistantMessage(): ConsultantMessage {
  return msg(
    "Welcome — I’m your AFH furniture consultant. Tell me what you’re furnishing in natural language (office, home, hotel, restaurant…). I’ll remember context, ask only for what’s missing, and recommend real catalogue products.",
    [
      {
        type: "actions",
        actions: [
          { id: "c1", label: "20-person software office", kind: "chip", value: "I need furniture for a 20-person software company" },
          { id: "c2", label: "Luxury living room", kind: "chip", value: "I want a luxury living room" },
          { id: "c3", label: "Hotel programme", kind: "chip", value: "I am furnishing an entire hotel" },
          { id: "c4", label: "Restaurant fit-out", kind: "chip", value: "Recommend furniture for a restaurant" },
        ],
      },
    ],
  );
}
