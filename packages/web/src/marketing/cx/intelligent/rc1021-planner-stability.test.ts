/**
 * RC10.2.1 — Planner stability (manual edit lock).
 */
import { describe, expect, it } from "vitest";
import {
  nextManualEditCount,
  packageModeFromManual,
  shouldAutoRegeneratePackage,
} from "./planner-manual-mode";

describe("RC10.2.1 planner manual mode", () => {
  it("blocks auto-regenerate when customized", () => {
    expect(
      shouldAutoRegeneratePackage({
        manualLines: true,
        restoredFromProject: false,
        lineCount: 3,
      }),
    ).toBe(false);
  });

  it("blocks auto-regenerate for restored packages with lines", () => {
    expect(
      shouldAutoRegeneratePackage({
        manualLines: false,
        restoredFromProject: true,
        lineCount: 5,
      }),
    ).toBe(false);
  });

  it("allows auto-regenerate for AI mode with empty lines", () => {
    expect(
      shouldAutoRegeneratePackage({
        manualLines: false,
        restoredFromProject: false,
        lineCount: 0,
      }),
    ).toBe(true);
  });

  it("allows auto-regenerate after last line removed only if not customized", () => {
    expect(
      shouldAutoRegeneratePackage({
        manualLines: false,
        restoredFromProject: true,
        lineCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldAutoRegeneratePackage({
        manualLines: true,
        restoredFromProject: true,
        lineCount: 0,
      }),
    ).toBe(false);
  });

  it("locks regenerate once empty project has been seeded with lines", () => {
    expect(
      shouldAutoRegeneratePackage({
        manualLines: false,
        restoredFromProject: true,
        lineCount: 4,
      }),
    ).toBe(false);
  });

  it("maps mode labels", () => {
    expect(packageModeFromManual(false)).toBe("ai");
    expect(packageModeFromManual(true)).toBe("customized");
  });

  it("counts manual edits", () => {
    expect(nextManualEditCount(0, false)).toBe(1);
    expect(nextManualEditCount(1, false)).toBe(1);
    expect(nextManualEditCount(1, true)).toBe(2);
  });
});
