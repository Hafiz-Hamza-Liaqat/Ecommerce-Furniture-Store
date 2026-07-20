/**
 * RC10.2.1 — Planner manual-edit lock helpers (pure logic for unit tests).
 */

export type PackageMode = "ai" | "customized";

/** Whether the auto-regenerate effect may overwrite `lines`. */
export function shouldAutoRegeneratePackage(input: {
  manualLines: boolean;
  restoredFromProject: boolean;
  lineCount: number;
}): boolean {
  if (input.manualLines) return false;
  if (input.restoredFromProject && input.lineCount > 0) return false;
  return true;
}

export function packageModeFromManual(manualLines: boolean): PackageMode {
  return manualLines ? "customized" : "ai";
}

/** Next edit count when entering/bumping customized mode. */
export function nextManualEditCount(
  current: number,
  bumpChange: boolean,
): number {
  if (bumpChange) return current + 1;
  return current === 0 ? 1 : current;
}
