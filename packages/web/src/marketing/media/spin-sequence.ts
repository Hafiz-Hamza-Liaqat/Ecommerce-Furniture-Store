import type { SpinSequence } from "./types";

/**
 * Build a configurable spin sequence from source URLs.
 * Demo catalogues use this to expand placeholders; production assets
 * replace `sources` (or provide `spinSequence` directly) without code changes.
 */
export function buildSpinSequenceFromSources(
  sources: readonly string[],
  options?: {
    readonly frameCount?: number;
    readonly rowCount?: number;
    readonly autoSpinIntervalMs?: number;
    readonly pixelsPerFrame?: number;
  },
): SpinSequence | null {
  if (sources.length === 0) return null;
  const frameCount = options?.frameCount ?? sources.length;
  const rowCount = Math.max(1, options?.rowCount ?? 1);
  const base: string[] = [];
  for (let i = 0; i < frameCount; i += 1) {
    base.push(sources[i % sources.length]!);
  }
  const rows = Array.from({ length: rowCount }, (_, row) => ({
    id: `row${String(row + 1).padStart(2, "0")}`,
    frames: base.map((_, i) => sources[(i + row) % sources.length]!),
  }));
  return {
    frameCount,
    rows,
    ...(options?.autoSpinIntervalMs != null
      ? { autoSpinIntervalMs: options.autoSpinIntervalMs }
      : {}),
    ...(options?.pixelsPerFrame != null
      ? { pixelsPerFrame: options.pixelsPerFrame }
      : {}),
  };
}
