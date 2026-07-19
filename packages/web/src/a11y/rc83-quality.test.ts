/**
 * RC8.3 / RC8.4 production quality freezes.
 */
import { describe, expect, it } from "vitest";
import { buildBreadcrumbJsonLd, SEO_SITE } from "../marketing/Seo";
import { SHORTCUTS } from "../workspace/data";

describe("RC8.3 SEO helpers", () => {
  it("builds BreadcrumbList JSON-LD with absolute URLs", () => {
    const ld = buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Furniture", path: "/furniture" },
    ]);
    expect(ld["@type"]).toBe("BreadcrumbList");
    const items = ld.itemListElement as Array<{ item: string; position: number }>;
    expect(items[0]?.item).toBe(`${SEO_SITE}/`);
    expect(items[1]?.position).toBe(2);
  });
});

describe("RC8.3 keyboard shortcuts registry", () => {
  it("documents slash search and Esc without conflicting browser Find modifiers", () => {
    expect(SHORTCUTS.some((s) => s.keys === "/")).toBe(true);
    expect(SHORTCUTS.some((s) => s.keys === "Esc")).toBe(true);
    expect(SHORTCUTS.some((s) => s.keys.includes("Ctrl K"))).toBe(true);
  });
});
