/**
 * RC10.3 — Configurator module tests.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  CATALOGUE,
  getCatalogueProduct,
  resolveVariantPrice,
} from "../../data/catalogue";
import {
  buildLineExplanations,
  clearCatalogGaps,
  findTemplateRole,
  isProductCompatible,
  listCatalogGaps,
  listCompatibleAlternatives,
  recordCatalogGap,
  unitPriceForSelection,
} from "./index";

describe("RC10.3 compatibility", () => {
  it("rejects dining chairs for an office / executive chair role", () => {
    const role = findTemplateRole("office", "Executive chair");
    expect(role).not.toBeNull();
    const dining = getCatalogueProduct("spine-dining-chair") ?? getCatalogueProduct("cove-dining-chair");
    expect(dining).toBeDefined();
    expect(isProductCompatible(dining!, role!)).toBe(false);

    const officeChair =
      getCatalogueProduct("focus-task-chair") ?? getCatalogueProduct("boardroom-chair");
    expect(officeChair).toBeDefined();
    expect(isProductCompatible(officeChair!, role!)).toBe(true);
  });

  it("never offers desks or tables as alternatives for a chair role", () => {
    const role = findTemplateRole("office", "Ergonomic / task chair");
    expect(role).not.toBeNull();
    const desk = getCatalogueProduct("northline-desk");
    expect(desk).toBeDefined();
    expect(isProductCompatible(desk!, role!)).toBe(false);

    const cards = listCompatibleAlternatives({
      role: role!,
      currentProductId: "boardroom-chair",
      limit: 30,
    });
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.product.taxonomySlugs.some((s) => /chair/.test(s))).toBe(true);
      expect(card.product.taxonomySlugs.includes("executive")).toBe(false);
      expect(/desk|table|cabinet|sofa/i.test(card.product.name)).toBe(false);
    }
  });

  it("rejects home beds for hospital patient / clinical roles", () => {
    const role = findTemplateRole("hospital", "Patient room seating");
    expect(role).not.toBeNull();

    const homeBed =
      getCatalogueProduct("solstice-bed") ??
      getCatalogueProduct("nimbus-bed") ??
      CATALOGUE.find((p) => p.taxonomySlugs.includes("beds") && !/medical|hospital/i.test(`${p.name} ${p.summary}`));
    expect(homeBed).toBeDefined();
    expect(isProductCompatible(homeBed!, role!)).toBe(false);

    const alts = listCompatibleAlternatives({
      role: role!,
      currentProductId: homeBed!.id,
      limit: 30,
    });
    for (const card of alts) {
      expect(isProductCompatible(card.product, role!)).toBe(true);
      expect(card.product.taxonomySlugs.includes("beds")).toBe(false);
      expect(card.product.taxonomySlugs.includes("bedroom")).toBe(false);
    }
  });

  it("rejects coffee tables for school desk roles", () => {
    const role = findTemplateRole("school", "Student desks / tables");
    expect(role).not.toBeNull();

    const coffee =
      getCatalogueProduct("rift-coffee-table") ?? getCatalogueProduct("lens-coffee-table");
    expect(coffee).toBeDefined();
    expect(isProductCompatible(coffee!, role!)).toBe(false);

    const alts = listCompatibleAlternatives({
      role: role!,
      currentProductId: coffee!.id,
      limit: 30,
    });
    expect(alts.every((c) => !c.product.taxonomySlugs.includes("coffee-tables"))).toBe(true);
  });
});

describe("RC10.3 alternatives", () => {
  it("never invents product ids outside the catalogue", () => {
    const role = findTemplateRole("office", "Executive chair");
    expect(role).not.toBeNull();
    const current =
      getCatalogueProduct("focus-task-chair") ?? getCatalogueProduct("boardroom-chair");
    expect(current).toBeDefined();

    const cards = listCompatibleAlternatives({
      role: role!,
      currentProductId: current!.id,
      limit: 20,
    });
    const catalogIds = new Set(CATALOGUE.map((p) => p.id));
    for (const card of cards) {
      expect(catalogIds.has(card.product.id)).toBe(true);
      expect(card.product.id).not.toBe(current!.id);
      expect(isProductCompatible(card.product, role!)).toBe(true);
    }
  });
});

describe("RC10.3 catalog gaps", () => {
  beforeEach(() => {
    clearCatalogGaps();
  });

  it("records and lists catalog gaps", () => {
    const recorded = recordCatalogGap({
      role: "Executive Visitor Chairs",
      templateId: "office",
      requiredQty: 8,
      availableCount: 2,
    });
    expect(recorded.gap).toBe(6);
    expect(recorded.templateId).toBe("office");

    const listed = listCatalogGaps();
    expect(listed.length).toBe(1);
    expect(listed[0]?.role).toBe("Executive Visitor Chairs");
    expect(listed[0]?.availableCount).toBe(2);
  });
});

describe("RC10.3 variants", () => {
  it("computes unit price from selected variant ids", () => {
    const product = getCatalogueProduct("meridian-sofa");
    expect(product).toBeDefined();
    const variantIds = ["ink", "leather"] as const;
    const price = unitPriceForSelection(product!, variantIds);
    expect(price).toBe(resolveVariantPrice(product!, new Set(variantIds)));
    expect(price).toBeGreaterThan(product!.pricePkr);
  });
});

describe("RC10.3 explanations", () => {
  it("returns non-empty deterministic bullets", () => {
    const role = findTemplateRole("office", "Executive chair");
    const product =
      getCatalogueProduct("boardroom-chair") ?? getCatalogueProduct("focus-task-chair");
    expect(role).not.toBeNull();
    expect(product).toBeDefined();

    const bullets = buildLineExplanations({
      product: product!,
      role: role!,
      prefs: { style: "executive", color: "Black" },
      variantLabels: ["Black"],
    });
    expect(bullets.length).toBeGreaterThan(0);
    expect(bullets.some((b) => /compatible|collection|role/i.test(b))).toBe(true);
  });
});
