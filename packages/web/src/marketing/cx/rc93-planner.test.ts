/**
 * RC9.3 — Intelligent Budget Planner & Space Planning tests.
 */
import { describe, expect, it } from "vitest";
import { getCatalogueProduct } from "../data/catalogue";
import { buildPackages } from "./budget-planner";
import {
  createDefaultBrief,
  discoveryQuestions,
  estimateQuantities,
  listIndustryTemplates,
  optimizePackage,
  planFromBrief,
  planFromTemplate,
} from "./consultant";
import { assertGroundedIds } from "./intelligent/grounding";

describe("RC9.3 industry templates", () => {
  it("exposes reusable templates including jahez and retail", () => {
    const ids = listIndustryTemplates().map((t) => t.id);
    expect(ids).toContain("office");
    expect(ids).toContain("home");
    expect(ids).toContain("jahez");
    expect(ids).toContain("cafe");
    expect(ids).toContain("retail");
    expect(ids).toContain("coworking");
    expect(ids).toContain("hospital");
  });

  it("provides discovery questions per programme", () => {
    expect(discoveryQuestions("office").some((q) => q.id === "employeeCount")).toBe(true);
    expect(discoveryQuestions("home").some((q) => q.id === "bedrooms")).toBe(true);
    expect(discoveryQuestions("jahez").some((q) => q.id === "budgetPkr")).toBe(true);
    expect(discoveryQuestions("restaurant").some((q) => q.id === "vipSection")).toBe(true);
  });
});

describe("RC9.3 quantity estimation", () => {
  it("estimates office quantities from headcount", () => {
    const brief = createDefaultBrief("office");
    const qty = estimateQuantities({
      ...brief,
      employeeCount: 12,
      seats: 12,
      managers: 2,
      executiveCabins: 2,
      flags: { ...brief.flags, reception: true, conference: true, waitingArea: true },
    });
    const desks = qty.find((q) => /workstation/i.test(q.role));
    const chairs = qty.find((q) => /task chair|ergonomic/i.test(q.role));
    expect(desks?.qty).toBeGreaterThan(0);
    expect(chairs?.qty).toBe(12);
    expect(qty.some((q) => /conference/i.test(q.role))).toBe(true);
    expect(qty.some((q) => /reception/i.test(q.role))).toBe(true);
  });
});

describe("RC9.3 package generation + grounding", () => {
  it("builds grounded packages for office brief", () => {
    const plan = planFromTemplate("office", {
      employeeCount: 12,
      seats: 12,
      budgetPkr: 2_000_000,
      style: "modern",
    });
    expect(plan.primary.lines.length).toBeGreaterThan(0);
    for (const line of plan.primary.lines) {
      expect(getCatalogueProduct(line.product.id)?.id).toBe(line.product.id);
    }
    const ids = plan.primary.lines.map((l) => l.product.id);
    expect(assertGroundedIds(ids).missing).toEqual([]);
  });

  it("builds a Pakistan Jahez package within budget bands", () => {
    const plan = planFromTemplate("jahez", {
      budgetPkr: 1_200_000,
      style: "heritage",
      seats: 6,
      flags: {
        bedroom: true,
        livingRoom: true,
        dining: true,
        storage: true,
        decor: false,
      },
    });
    expect(plan.packages).toHaveLength(3);
    expect(plan.packages.map((p) => p.tier)).toEqual(["economy", "recommended", "premium"]);
    expect(plan.primaryResult.name).toMatch(/Jahez/i);
    expect(plan.primary.totalPkr).toBeGreaterThan(0);
    expect(plan.primaryResult.downgrades.length + plan.primaryResult.explanations.length).toBeGreaterThan(0);
    // Optimizer should bring utilization into a usable band for a 1.2M Jahez brief
    expect(plan.primaryResult.utilizationPercent).toBeLessThanOrEqual(120);
  });
});

describe("RC9.3 budget optimization", () => {
  it("prefers complete packages and reports substitutions when over budget", () => {
    const brief = createDefaultBrief("office");
    const tight = optimizePackage(
      {
        ...brief,
        employeeCount: 40,
        seats: 40,
        managers: 4,
        executiveCabins: 3,
        budgetPkr: 800_000,
        flags: { ...brief.flags, reception: true, conference: true, waitingArea: true },
      },
      "recommended",
    );
    expect(tight.lines.length).toBeGreaterThan(0);
    expect(tight.explanations.length).toBeGreaterThan(0);
    // Should attempt to stay near budget via swaps/qty — not silently explode to 10x
    expect(tight.totalPkr).toBeLessThanOrEqual(800_000 * 1.15);
  });

  it("surfaces conceptual notes when catalogue lacks a role", () => {
    const result = optimizePackage(createDefaultBrief("office"), "recommended");
    // Conceptual lines are optional; if present they must never look like catalogue SKUs
    for (const c of result.conceptual) {
      expect(c.conceptual).toBe(true);
      expect(c.note.length).toBeGreaterThan(10);
    }
  });
});

describe("RC9.3 classic planner back-compat", () => {
  it("keeps buildPackages available for legacy tests", () => {
    const pkgs = buildPackages({
      budgetPkr: 2_000_000,
      endUse: "office",
      style: "modern",
      seats: 12,
    });
    expect(pkgs).toHaveLength(3);
    expect(pkgs[1]!.lines.length).toBeGreaterThan(0);
  });
});

describe("RC9.3 shared engine path", () => {
  it("planFromBrief returns zones in role labels after optimization packaging", () => {
    const plan = planFromBrief(createDefaultBrief("restaurant"));
    expect(plan.primary.lines.some((l) => /Dining|Counter|Waiting|VIP/i.test(l.role))).toBe(true);
  });
});
