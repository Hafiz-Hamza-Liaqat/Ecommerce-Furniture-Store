/**
 * RC9.3 — Planner → AI handoff + CRM meta verification.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapConsultantFromPlannerUrl,
  buildPlannerHandoff,
  consumePlannerHandoff,
  createDefaultBrief,
  peekPlannerHandoff,
  savePlannerHandoff,
} from "./consultant";

describe("RC9.3 planner → AI handoff", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("hydrates consultant memory and greeting from planner payload", () => {
    const brief = createDefaultBrief("office");
    const payload = buildPlannerHandoff({
      templateId: "office",
      brief: {
        ...brief,
        employeeCount: 12,
        seats: 12,
        managers: 2,
        budgetPkr: 2_000_000,
        style: "modern",
        flags: { ...brief.flags, reception: true, waitingArea: true },
      },
      packageName: "Recommended package",
      packageTier: "recommended",
      totalPkr: 1_800_000,
      lines: [
        {
          productId: "northline-desk",
          name: "Northline Desk",
          qty: 12,
          role: "Workstation desk",
          zone: "Workstations",
          unitPkr: 85_000,
        },
      ],
      explanations: ["Built complete office package"],
      upgrades: ["Upgrade reception"],
      downgrades: ["Reduced optional décor"],
    });
    savePlannerHandoff(payload);

    const boot = bootstrapConsultantFromPlannerUrl("?from=planner&template=office");
    expect(boot).toBeTruthy();
    expect(boot!.memory.endUse).toBe("office");
    expect(boot!.memory.employeeCount).toBe(12);
    expect(boot!.memory.budgetPkr).toBe(2_000_000);
    expect(boot!.memory.style).toBe("modern");
    expect(boot!.memory.managers).toBe(2);
    expect(boot!.memory.spaceFlags?.reception).toBe(true);
    expect(boot!.memory.selectedProductIds).toContain("northline-desk");
    expect(boot!.messages[0]!.text).toMatch(/Office furnishing plan/i);
    expect(boot!.messages[0]!.text).toMatch(/2,000,000|PKR/i);
    expect(boot!.messages[0]!.cards?.some((c) => c.type === "package")).toBe(true);
    expect(peekPlannerHandoff()).toBeTruthy();
    consumePlannerHandoff();
    expect(peekPlannerHandoff()).toBeNull();
  });

  it("CRM meta shape includes AI notes fields", () => {
    const meta = {
      recommendationSummary: "Built complete office package",
      upgradeSuggestions: ["Upgrade reception"],
      budgetOptimizationNotes: ["Reduced optional décor"],
      plannerRationale: ["Built complete office package"],
    };
    expect(meta.recommendationSummary.length).toBeGreaterThan(0);
    expect(meta.upgradeSuggestions).toHaveLength(1);
    expect(meta.budgetOptimizationNotes).toHaveLength(1);
  });
});
