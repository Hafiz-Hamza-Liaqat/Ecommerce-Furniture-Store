/**
 * RC9.4.2 — Canonical design token tests.
 */
import { describe, expect, it } from "vitest";
import { brandColors, semanticColors } from "./colors";
import { motion } from "./motion";
import { spacing } from "./spacing";

describe("RC9.4.2 design tokens", () => {
  it("uses forest/brass brand palette", () => {
    expect(brandColors.light.forest).toBe("#2f4f3f");
    expect(brandColors.light.brass).toBe("#9a7b4f");
    expect(brandColors.dark.brass).toBe("#b8956a");
  });

  it("defines unified motion scale", () => {
    expect(motion.fast).toBe("140ms");
    expect(motion.medium).toBe("220ms");
    expect(motion.slow).toBe("320ms");
    expect(motion.hero).toBe("560ms");
    expect(motion.ease).toContain("cubic-bezier");
  });

  it("aligns spacing index 5 with enterprise scale", () => {
    expect(spacing[5]).toBe("1.25rem");
    expect(spacing[6]).toBe("1.5rem");
  });

  it("keeps semantic colors stable", () => {
    expect(semanticColors.danger).toBe("#b42318");
    expect(semanticColors.success).toBe("#1b7a4a");
  });
});
