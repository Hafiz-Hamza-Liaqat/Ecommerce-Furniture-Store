/**
 * RC8.1 CX unit tests — catalogue, planner, consultant, taxonomy.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { buildPackages, utilization } from "../cx/budget-planner";
import { nextConsultantTurn, initialAssistantMessage } from "../cx/consultant";
import { findTaxonomyBySlug, flattenTaxonomy, FURNITURE_TAXONOMY } from "../data/taxonomy";
import { CATALOGUE, getCatalogueProduct, resolveVariantPrice } from "../data/catalogue";
import { moveWishlistToCompare, getCompareIds, toggleWishlist } from "../cx/stores";

describe("RC8.1 taxonomy", () => {
  it("exposes furniture nodes with destinations including Tables and Chairs L1", () => {
    expect(flattenTaxonomy().length).toBeGreaterThan(20);
    expect(findTaxonomyBySlug("sofas")?.parent?.slug).toBe("living-room");
    expect(FURNITURE_TAXONOMY.some((n) => n.slug === "tables")).toBe(true);
    expect(FURNITURE_TAXONOMY.some((n) => n.slug === "chairs")).toBe(true);
    expect(findTaxonomyBySlug("tables")?.parent).toBeNull();
    expect(findTaxonomyBySlug("chairs")?.parent).toBeNull();
  });
});

describe("RC8.1 catalogue", () => {
  it("resolves products and variant pricing with filter facets", () => {
    const p = getCatalogueProduct("meridian-sofa");
    expect(p).toBeTruthy();
    const selected = new Set(["leather"]);
    expect(resolveVariantPrice(p!, selected)).toBeGreaterThan(p!.pricePkr);
    expect(CATALOGUE.length).toBeGreaterThanOrEqual(8);
    expect(p!.brand).toBeTruthy();
    expect(p!.material).toBeTruthy();
    expect(p!.rating).toBeGreaterThan(0);
  });
});

describe("RC8.1 budget planner", () => {
  it("builds packages under budget with utilization", () => {
    const packages = buildPackages({
      budgetPkr: 2_000_000,
      endUse: "office",
      style: "modern",
      seats: 12,
    });
    expect(packages).toHaveLength(3);
    const rec = packages.find((x) => x.tier === "recommended")!;
    expect(rec.lines.length).toBeGreaterThan(0);
    const u = utilization(2_000_000, rec.totalPkr);
    expect(u.percent).toBeGreaterThan(0);
    expect(u.remaining).toBeGreaterThanOrEqual(0);
  });
});

describe("RC8.1 wishlist → compare", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("moves a wishlist item into compare", () => {
    toggleWishlist("meridian-sofa");
    const next = moveWishlistToCompare("meridian-sofa");
    expect(next.compare).toContain("meridian-sofa");
    expect(getCompareIds()).toContain("meridian-sofa");
    expect(next.wishlist).toContain("meridian-sofa");
  });
});

describe("RC8.1 AI furniture consultant", () => {
  it("walks a discovery conversation to a package recommendation", () => {
    expect(initialAssistantMessage().role).toBe("assistant");
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
});
