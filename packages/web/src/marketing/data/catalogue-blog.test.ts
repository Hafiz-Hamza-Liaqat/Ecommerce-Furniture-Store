/**
 * RC9.1.1 catalogue + blog freezes.
 */
import { describe, expect, it } from "vitest";
import { CATALOGUE } from "./catalogue";
import { DEMO_IMG, LEAF_IMAGE_KEY } from "./demo-images";
import { taxonomyLeaves } from "./taxonomy";
import { BLOG_ARTICLES, BLOG_CATEGORIES } from "./blog";

describe("RC9.1.1 product catalogue completion", () => {
  it("provides at least two products for every taxonomy leaf", () => {
    const leaves = taxonomyLeaves();
    const short: string[] = [];
    for (const leaf of leaves) {
      const count = CATALOGUE.filter((p) => p.taxonomySlugs.includes(leaf.slug)).length;
      if (count < 2) short.push(`${leaf.slug} (${count})`);
    }
    expect(short, `Underfilled leaves: ${short.join(", ")}`).toEqual([]);
  });

  it("keeps category-matched imagery (no single sofa image for all)", () => {
    const sofas = CATALOGUE.filter((p) => p.taxonomySlugs.includes("sofas"));
    const beds = CATALOGUE.filter((p) => p.taxonomySlugs.includes("beds"));
    expect(sofas.length).toBeGreaterThanOrEqual(2);
    expect(beds.length).toBeGreaterThanOrEqual(2);
    expect(sofas.some((p) => beds.some((b) => b.image === p.image))).toBe(false);
  });

  it("uses subcategory-matched heroes for every mega-menu leaf demo", () => {
    const mismatches: string[] = [];
    for (const leaf of taxonomyLeaves()) {
      const key = LEAF_IMAGE_KEY[leaf.slug];
      if (!key) {
        mismatches.push(`${leaf.slug}: missing LEAF_IMAGE_KEY`);
        continue;
      }
      const allowed = new Set<string>(DEMO_IMG[key]);
      if (leaf.slug === "outdoor-seating") {
        for (const url of DEMO_IMG.outdoorChair) allowed.add(url);
        for (const url of DEMO_IMG.outdoorSofa) allowed.add(url);
      }
      const demos = CATALOGUE.filter(
        (p) => p.brand === "AFH Demo" && p.taxonomySlugs.includes(leaf.slug),
      );
      if (demos.length < 2) mismatches.push(`${leaf.slug}: only ${demos.length} demos`);
      for (const p of demos) {
        if (!allowed.has(p.image)) mismatches.push(`${leaf.slug}/${p.id}`);
      }
    }
    expect(mismatches, mismatches.join("; ")).toEqual([]);
  });

  it("includes magnifier and 360 hooks on demo products", () => {
    const demos = CATALOGUE.filter((p) => p.brand === "AFH Demo");
    expect(demos.length).toBeGreaterThan(20);
    expect(demos.every((p) => p.media.some((m) => m.type === "image" && m.zoomUrl))).toBe(true);
    expect(demos.every((p) => (p.spinFrames?.length ?? 0) >= 2)).toBe(true);
    expect(demos.every((p) => (p.downloads?.length ?? 0) >= 1)).toBe(true);
  });
});

describe("RC9.1.1 blog system", () => {
  it("ships ~20 articles across blog categories", () => {
    expect(BLOG_ARTICLES.length).toBeGreaterThanOrEqual(20);
    expect(BLOG_CATEGORIES.length).toBeGreaterThanOrEqual(10);
    const used = new Set(BLOG_ARTICLES.map((a) => a.categoryId));
    expect(used.size).toBeGreaterThanOrEqual(10);
  });

  it("uses unique slugs", () => {
    const slugs = BLOG_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
