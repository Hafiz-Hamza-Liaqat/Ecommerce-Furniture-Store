/**
 * RC9.1 premium UI polish freezes.
 */
import { describe, expect, it } from "vitest";
import { RC91_POLISH } from "./premium-ui.contract";

describe("RC9.1 premium UI polish", () => {
  it("freezes calm motion magnitudes", () => {
    expect(RC91_POLISH.revealYPx).toBe(16);
    expect(RC91_POLISH.buttonScale).toBeGreaterThanOrEqual(1.01);
    expect(RC91_POLISH.buttonScale).toBeLessThanOrEqual(1.02);
    expect(RC91_POLISH.imageScale).toBeLessThanOrEqual(1.03);
    expect(RC91_POLISH.liftPx).toBeLessThanOrEqual(4);
    expect(RC91_POLISH.revealDurationMs).toBeGreaterThanOrEqual(500);
    expect(RC91_POLISH.revealDurationMs).toBeLessThanOrEqual(700);
    expect(RC91_POLISH.staggerMs).toBeLessThan(100);
  });

  it("freezes responsive navbar breakpoints", () => {
    expect(RC91_POLISH.breakpoints.wideMin).toBe(1440);
    expect(RC91_POLISH.breakpoints.compactMin).toBe(1200);
    expect(RC91_POLISH.breakpoints.drawerMax).toBe(1199);
    expect(RC91_POLISH.breakpoints.compactMax).toBe(1439);
  });

  it("exempts PDP gallery and 360 from card hover language", () => {
    expect(RC91_POLISH.galleryHoverExempt).toContain("cx-gallery");
    expect(RC91_POLISH.galleryHoverExempt).toContain("cx-spin");
  });

  it("requires reduced-motion support", () => {
    expect(RC91_POLISH.reducedMotionQuery).toContain("prefers-reduced-motion");
  });

  it("defines an 8-step spacing scale", () => {
    expect(RC91_POLISH.spacingScale).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
