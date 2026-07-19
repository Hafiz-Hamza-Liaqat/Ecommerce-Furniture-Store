import { describe, expect, it } from "vitest";
import { computeMagnifierLayout, resolveZoomUrl } from "./magnifier";
import { buildSpinSequenceFromSources } from "./spin-sequence";
import { normalizeSpinSequence } from "./useImageSequenceEngine";
import { hasSpinSequence, preferredMediaModes } from "./types";
import { resolveProductMedia } from "./resolve-product-media";
import { getCatalogueProduct } from "../data/catalogue";

describe("computeMagnifierLayout", () => {
  const base = {
    stageWidth: 400,
    stageHeight: 300,
    naturalWidth: 4000,
    naturalHeight: 3000,
    paneWidth: 250,
    paneHeight: 300,
    zoomFactor: 2.5,
  };

  it("maps left edge so the lens includes the leftmost pixels", () => {
    const layout = computeMagnifierLayout({
      ...base,
      pointerX: 0,
      pointerY: 150,
    });
    expect(layout).not.toBeNull();
    expect(layout!.lens.x).toBeCloseTo(layout!.display.x, 5);
    expect(layout!.zoomOffset.x).toBeCloseTo(0, 5);
  });

  it("maps right edge so the lens includes the rightmost pixels", () => {
    const layout = computeMagnifierLayout({
      ...base,
      pointerX: 400,
      pointerY: 150,
    });
    expect(layout).not.toBeNull();
    const lensRight = layout!.lens.x + layout!.lens.width;
    const displayRight = layout!.display.x + layout!.display.width;
    expect(lensRight).toBeCloseTo(displayRight, 5);
  });

  it("maps top and bottom edges without clipping navigation", () => {
    const top = computeMagnifierLayout({ ...base, pointerX: 200, pointerY: 0 });
    const bottom = computeMagnifierLayout({ ...base, pointerX: 200, pointerY: 300 });
    expect(top!.lens.y).toBeCloseTo(top!.display.y, 5);
    expect(top!.zoomOffset.y).toBeCloseTo(0, 5);
    const bottomEdge = bottom!.lens.y + bottom!.lens.height;
    expect(bottomEdge).toBeCloseTo(bottom!.display.y + bottom!.display.height, 5);
  });

  it("never uses a degenerate layout for valid inputs", () => {
    const layout = computeMagnifierLayout({
      ...base,
      pointerX: 200,
      pointerY: 150,
    });
    expect(layout!.lens.width).toBeGreaterThan(0);
    expect(layout!.lens.height).toBeGreaterThan(0);
    expect(layout!.zoomImage.width).toBeGreaterThan(layout!.lens.width);
  });
});

describe("resolveZoomUrl", () => {
  it("prefers explicit zoomUrl", () => {
    expect(resolveZoomUrl("/a.jpg", "/a-hi.jpg")).toBe("/a-hi.jpg");
  });

  it("upgrades unsplash display URLs for hi-res inspection", () => {
    const url =
      "https://images.unsplash.com/photo-1?auto=format&fit=crop&w=1200&q=80";
    expect(resolveZoomUrl(url)).toContain("w=4000");
    expect(resolveZoomUrl(url)).toContain("q=85");
  });
});

describe("spin sequence engine data", () => {
  it("supports configurable frame counts (not hard-coded 72)", () => {
    for (const count of [24, 36, 48, 72, 96, 120]) {
      const seq = buildSpinSequenceFromSources(["a.jpg", "b.jpg", "c.jpg"], {
        frameCount: count,
      });
      expect(seq?.frameCount).toBe(count);
      expect(seq?.rows[0]?.frames).toHaveLength(count);
    }
  });

  it("supports multi-row architecture without requiring assets today", () => {
    const seq = buildSpinSequenceFromSources(["a.jpg", "b.jpg"], {
      frameCount: 24,
      rowCount: 3,
    });
    expect(seq?.rows).toHaveLength(3);
    expect(seq?.rows.every((r) => r.frames.length === 24)).toBe(true);
  });

  it("normalizes legacy flat frame arrays", () => {
    const seq = normalizeSpinSequence(["f1", "f2", "f3", "f4"]);
    expect(seq?.frameCount).toBe(4);
    expect(seq?.rows[0]?.id).toBe("row01");
  });
});

describe("resolveProductMedia", () => {
  it("resolves meridian-sofa gallery + configurable spin without code changes", () => {
    const product = getCatalogueProduct("meridian-sofa");
    expect(product).toBeTruthy();
    const media = resolveProductMedia(product!);
    expect(media.gallery.length).toBeGreaterThan(0);
    expect(hasSpinSequence(media)).toBe(true);
    expect(media.spin?.frameCount).toBe(72);
    expect(media.spin?.rows[0]?.frames).toHaveLength(72);
    expect(media.spin?.rows[0]?.frames[0]).toContain(
      "/product-media/meridian-sofa/360/row01/frame001.jpg",
    );
    expect(media.spin?.rows[0]?.frames[71]).toContain("frame072.jpg");
    expect(preferredMediaModes(media)).toContain("gallery");
    expect(preferredMediaModes(media)).toContain("spin");
  });

  it("keeps gallery working when spin is absent", () => {
    const product = getCatalogueProduct("meridian-sofa")!;
    const media = resolveProductMedia({
      id: product.id,
      name: product.name,
      category: product.category,
      collection: product.collection,
      summary: product.summary,
      pricePkr: product.pricePkr,
      priceFrom: product.priceFrom,
      image: product.image,
      specs: product.specs,
      taxonomySlugs: product.taxonomySlugs,
      tags: product.tags,
      media: product.media,
      variants: product.variants,
    });
    expect(media.gallery.length).toBeGreaterThan(0);
    expect(hasSpinSequence(media)).toBe(false);
  });
});
