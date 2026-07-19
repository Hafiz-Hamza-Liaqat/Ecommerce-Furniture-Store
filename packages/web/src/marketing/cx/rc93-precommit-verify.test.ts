/**
 * One-shot pre-commit verification for RC9.3 planner checklist.
 * Presentation/engine smoke only — not new product functionality.
 */
import { describe, expect, it } from "vitest";
import { getCatalogueProduct } from "../data/catalogue";
import {
  createDefaultBrief,
  estimateQuantities,
  planFromConsultantMemory,
  planFromTemplate,
} from "./consultant";
import { assertGroundedIds } from "./intelligent/grounding";

describe("RC9.3 pre-commit verification checklist", () => {
  it("Office/Home/Jahez/Restaurant/Hotel/Hospital/School produce distinct plans", () => {
    const templates = ["office", "home", "jahez", "restaurant", "hotel", "hospital", "school"] as const;
    const fps = templates.map((t) => {
      const plan = planFromTemplate(t);
      expect(plan.primary.lines.length).toBeGreaterThan(0);
      expect(assertGroundedIds(plan.primary.lines.map((l) => l.product.id)).missing).toEqual([]);
      return plan.primary.lines.map((l) => `${l.role}:${l.product.id}:${l.qty}`).join("|");
    });
    expect(new Set(fps).size).toBe(templates.length);
  });

  it("budget scaling moves totals with 500k / 2M / 20M", () => {
    const totals = ([500_000, 2_000_000, 20_000_000] as const).map((budgetPkr) => {
      const plan = planFromTemplate("office", {
        budgetPkr,
        employeeCount: 12,
        seats: 12,
      });
      expect(plan.primaryResult.utilizationPercent).toBeLessThanOrEqual(130);
      return plan.primary.totalPkr;
    });
    expect(totals[0]!).toBeLessThanOrEqual(totals[1]! * 1.1);
    expect(totals[1]!).toBeLessThanOrEqual(totals[2]! * 1.15);
  });

  it("quote line encoding preserves id:qty and catalogue prices", () => {
    const plan = planFromTemplate("restaurant", { seats: 40, budgetPkr: 2_500_000 });
    const lines = plan.primary.lines;
    const encoded = lines.map((l) => `${l.product.id}:${l.qty}`).join(",");
    let recomputed = 0;
    for (const part of encoded.split(",")) {
      const [id, qtyStr] = part.split(":");
      const p = getCatalogueProduct(id!);
      expect(p).toBeTruthy();
      const qty = Number(qtyStr);
      expect(qty).toBeGreaterThan(0);
      recomputed += p!.pricePkr * qty;
    }
    expect(recomputed).toBe(plan.primary.totalPkr);
  });

  it("CRM-shaped meta can carry template + quantities", () => {
    const plan = planFromTemplate("jahez", { budgetPkr: 1_200_000 });
    const meta = {
      templateId: "jahez",
      packageId: plan.primary.id,
      quantities: plan.primary.lines.map((l) => ({
        id: l.product.id,
        qty: l.qty,
        role: l.role,
      })),
      budget: 1_200_000,
      total: plan.primary.totalPkr,
    };
    expect(meta.quantities.length).toBe(plan.primary.lines.length);
    expect(meta.total).toBeGreaterThan(0);
  });

  it("AI consultant memory and planner template share the same engine for office", () => {
    const flags = {
      ...createDefaultBrief("office").flags,
      reception: true,
      conference: true,
      waitingArea: true,
    };
    const fromAi = planFromConsultantMemory({
      endUse: "office",
      seats: 20,
      employeeCount: 20,
      budgetPkr: 2_000_000,
      style: "modern",
      spaceFlags: flags,
    });
    const fromPlanner = planFromTemplate("office", {
      employeeCount: 20,
      seats: 20,
      budgetPkr: 2_000_000,
      style: "modern",
      flags,
    });
    expect(fromAi.primary.lines.map((l) => `${l.product.id}:${l.qty}`)).toEqual(
      fromPlanner.primary.lines.map((l) => `${l.product.id}:${l.qty}`),
    );
  });

  it("jahez industry on consultant memory selects jahez template", () => {
    const plan = planFromConsultantMemory({
      endUse: "home",
      industry: "jahez",
      budgetPkr: 1_200_000,
      style: "heritage",
      seats: 6,
    });
    expect(plan.brief.templateId).toBe("jahez");
    expect(estimateQuantities(plan.brief).some((q) => /Bedroom|Living|Dining/i.test(q.zone))).toBe(
      true,
    );
  });
});
