/**
 * RC9.2 Intelligent Furniture Consultant — unit verification.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  assertGroundedIds,
  assembleIntelligentPackage,
  buildQuoteQuery,
  initialAssistantMessage,
  nextConsultantTurn,
  recommendFromCatalog,
  searchCatalog,
} from "./consultant";
import { extractSlots, mergeMemory, missingFollowUps } from "./intelligent/nlu";
import { clearConsultantMemory, loadConsultantMemory, saveConsultantMemory } from "./intelligent/memory";
import { getCatalogueProduct } from "../data/catalogue";

describe("RC9.2 NLU + memory", () => {
  beforeEach(() => {
    localStorage.clear();
    clearConsultantMemory();
  });

  it("extracts office headcount and budget from natural language", () => {
    const slots = extractSlots("I need furniture for a 20-person software company with a budget of PKR 1.5 million");
    expect(slots.endUse).toBe("office");
    expect(slots.seats).toBe(20);
    expect(slots.budgetPkr).toBe(1_500_000);
    expect(slots.industry).toBe("software");
  });

  it("merges context across turns without asking again", () => {
    let mem = mergeMemory({}, extractSlots("I have 20 employees"));
    mem = mergeMemory(mem, extractSlots("My budget is 2 million"));
    mem = mergeMemory(mem, extractSlots("I prefer Scandinavian style"));
    expect(mem.seats).toBe(20);
    expect(mem.budgetPkr).toBe(2_000_000);
    expect(mem.style).toBe("scandinavian");
    expect(missingFollowUps(mem)).toMatch(/space|furnishing/i);
  });

  it("persists session memory", () => {
    saveConsultantMemory({ endUse: "hotel", budgetPkr: 5_000_000, style: "luxury" });
    expect(loadConsultantMemory().endUse).toBe("hotel");
    expect(loadConsultantMemory().budgetPkr).toBe(5_000_000);
  });
});

describe("RC9.2 grounding layer", () => {
  it("returns only catalogue products", () => {
    const hits = searchCatalog({ endUse: "office", style: "executive", budgetPkr: 3_000_000, limit: 8 });
    expect(hits.length).toBeGreaterThan(0);
    for (const p of hits) {
      expect(getCatalogueProduct(p.id)?.id).toBe(p.id);
    }
    const bad = assertGroundedIds(["meridian-sofa", "not-a-real-product"]);
    expect(bad.ok).toContain("meridian-sofa");
    expect(bad.missing).toContain("not-a-real-product");
  });

  it("explains recommendations with alternatives", () => {
    const recs = recommendFromCatalog(
      { endUse: "home", style: "luxury", budgetPkr: 2_000_000, preference: "lounge focus" },
      { limit: 2 },
    );
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]!.reasons.length).toBeGreaterThan(0);
    expect(recs[0]!.alternatives.length).toBeGreaterThan(0);
  });
});

describe("RC9.2 packages + quotation", () => {
  it("assembles grounded packages and quote links", () => {
    const { primary } = assembleIntelligentPackage({
      endUse: "restaurant",
      style: "modern",
      seats: 40,
      budgetPkr: 4_000_000,
    });
    expect(primary.lines.length).toBeGreaterThan(0);
    for (const line of primary.lines) {
      expect(getCatalogueProduct(line.product.id)).toBeTruthy();
    }
    expect(buildQuoteQuery(primary)).toContain("/quote?");
    expect(buildQuoteQuery(primary)).toContain("from=consultant");
  });
});

describe("RC9.2 conversation flow", () => {
  it("starts with an assistant welcome", () => {
    expect(initialAssistantMessage().role).toBe("assistant");
    expect(initialAssistantMessage().cards?.length).toBeGreaterThan(0);
  });

  it("walks discovery to a package recommendation", () => {
    let state = {};
    const steps = ["office", "20x15", "12", "modern", "2000000", "balanced"];
    let done = false;
    for (const step of steps) {
      const turn = nextConsultantTurn(state, step);
      state = turn.state;
      done = turn.done;
      expect(turn.replies.length).toBeGreaterThan(0);
    }
    expect(done).toBe(true);
  });

  it("handles a single rich natural-language opener then follow-ups", () => {
    let turn = nextConsultantTurn({}, "I need furniture for a 20-person software company");
    expect(turn.state.seats).toBe(20);
    expect(turn.state.endUse).toBe("office");
    expect(turn.done).toBe(false);

    turn = nextConsultantTurn(turn.state, "Budget is 2 million, modern style, build a full package");
    expect(turn.state.budgetPkr).toBe(2_000_000);
    expect(turn.state.style).toBe("modern");
    expect(turn.done).toBe(true);
    expect(turn.replies.some((r) => (r.cards ?? []).some((c) => c.type === "package"))).toBe(true);
  });
});
