import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SpinSequence } from "./types";

export type SequenceEngineState = {
  readonly frameIndex: number;
  readonly rowIndex: number;
  readonly frameCount: number;
  readonly rowCount: number;
  readonly currentUrl: string | null;
  readonly ready: boolean;
  readonly autoSpin: boolean;
  readonly reducedMotion: boolean;
};

export type SequenceEngineApi = SequenceEngineState & {
  setAutoSpin: (value: boolean) => void;
  toggleAutoSpin: () => void;
  reset: () => void;
  stepFrame: (delta: number) => void;
  stepRow: (delta: number) => void;
  beginDrag: (clientX: number, clientY: number) => void;
  moveDrag: (clientX: number, clientY: number) => void;
  endDrag: () => void;
  pauseInteraction: () => void;
};

const DEFAULT_INTERVAL_MS = 80;
const DEFAULT_PIXELS_PER_FRAME = 8;

function wrap(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Configurable multi-row 360° image-sequence engine.
 * Horizontal drag → rotation frames (infinite loop).
 * Vertical drag → elevation rows (clamped).
 * Auto-spin advances frames of the current product sequence only.
 */
export function useImageSequenceEngine(
  sequence: SpinSequence | null,
): SequenceEngineApi {
  const frameCount = sequence?.frameCount ?? 0;
  const rowCount = sequence?.rows.length ?? 0;
  const pixelsPerFrame = sequence?.pixelsPerFrame ?? DEFAULT_PIXELS_PER_FRAME;
  const intervalMs = sequence?.autoSpinIntervalMs ?? DEFAULT_INTERVAL_MS;

  const [frameIndex, setFrameIndex] = useState(0);
  const [rowIndex, setRowIndex] = useState(0);
  const [autoSpin, setAutoSpinState] = useState(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion] = useState(prefersReducedMotion);

  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const accumX = useRef(0);
  const frameRef = useRef(0);
  const rowRef = useRef(0);
  const cache = useRef(new Map<string, HTMLImageElement>());

  useEffect(() => {
    frameRef.current = frameIndex;
  }, [frameIndex]);
  useEffect(() => {
    rowRef.current = rowIndex;
  }, [rowIndex]);

  // Reset when sequence identity changes.
  useEffect(() => {
    setFrameIndex(0);
    setRowIndex(0);
    setAutoSpinState(false);
    accumX.current = 0;
  }, [sequence]);

  // Preload + cache frames; mark ready when first row is largely available.
  useEffect(() => {
    if (!sequence || frameCount === 0 || rowCount === 0) {
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    const urls = sequence.rows.flatMap((r) => r.frames);
    let loaded = 0;
    const target = urls.length;
    for (const url of urls) {
      if (cache.current.has(url)) {
        loaded += 1;
        continue;
      }
      const img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = () => {
        loaded += 1;
        cache.current.set(url, img);
        if (!cancelled && loaded >= Math.min(target, sequence.rows[0]!.frames.length)) {
          setReady(true);
        }
      };
      img.src = url;
    }
    if (loaded >= Math.min(target, sequence.rows[0]?.frames.length ?? 0)) {
      setReady(true);
    }
    return () => {
      cancelled = true;
    };
  }, [sequence, frameCount, rowCount]);

  // Preload adjacent frames around current index (current + neighbor rows).
  useEffect(() => {
    if (!sequence || !ready) return;
    const rowsToWarm = [rowIndex, rowIndex - 1, rowIndex + 1].filter(
      (r) => r >= 0 && r < rowCount,
    );
    for (const r of rowsToWarm) {
      const frames = sequence.rows[r]?.frames ?? [];
      for (let d = -3; d <= 3; d += 1) {
        const url = frames[wrap(frameIndex + d, frameCount)];
        if (!url || cache.current.has(url)) continue;
        const img = new Image();
        img.decoding = "async";
        img.onload = () => cache.current.set(url, img);
        img.src = url;
      }
    }
  }, [sequence, frameIndex, rowIndex, frameCount, rowCount, ready]);

  const pauseInteraction = useCallback(() => {
    setAutoSpinState(false);
  }, []);

  const stepFrame = useCallback(
    (delta: number) => {
      if (frameCount < 2) return;
      setFrameIndex((i) => wrap(i + delta, frameCount));
    },
    [frameCount],
  );

  const stepRow = useCallback(
    (delta: number) => {
      if (rowCount < 2) return;
      setRowIndex((r) => clampRow(r + delta, rowCount));
    },
    [rowCount],
  );

  const setAutoSpin = useCallback(
    (value: boolean) => {
      if (reducedMotion && value) return;
      setAutoSpinState(value);
    },
    [reducedMotion],
  );

  const toggleAutoSpin = useCallback(() => {
    setAutoSpinState((v) => {
      if (!v && reducedMotion) return false;
      return !v;
    });
  }, [reducedMotion]);

  const reset = useCallback(() => {
    setAutoSpinState(false);
    setFrameIndex(0);
    setRowIndex(0);
    accumX.current = 0;
  }, []);

  // Auto-spin: rotate frames of THIS sequence only.
  useEffect(() => {
    if (!autoSpin || frameCount < 2 || reducedMotion) return;
    const id = window.setInterval(() => {
      setFrameIndex((i) => wrap(i + 1, frameCount));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [autoSpin, frameCount, intervalMs, reducedMotion]);

  const beginDrag = useCallback(
    (clientX: number, clientY: number) => {
      pauseInteraction();
      dragging.current = true;
      lastX.current = clientX;
      lastY.current = clientY;
      accumX.current = 0;
    },
    [pauseInteraction],
  );

  const moveDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragging.current || frameCount < 2) return;
      const dx = clientX - lastX.current;
      const dy = clientY - lastY.current;
      lastX.current = clientX;
      lastY.current = clientY;

      // Horizontal → rotation (invert so drag-right shows next frame naturally).
      accumX.current += -dx;
      while (Math.abs(accumX.current) >= pixelsPerFrame) {
        const dir = accumX.current > 0 ? 1 : -1;
        accumX.current -= dir * pixelsPerFrame;
        setFrameIndex((i) => wrap(i + dir, frameCount));
      }

      // Vertical → elevation rows when multi-row data exists.
      if (rowCount > 1 && Math.abs(dy) >= pixelsPerFrame) {
        const dir = dy > 0 ? 1 : -1;
        setRowIndex((r) => clampRow(r + dir, rowCount));
        lastY.current = clientY;
      }
    },
    [frameCount, pixelsPerFrame, rowCount],
  );

  const endDrag = useCallback(() => {
    dragging.current = false;
    accumX.current = 0;
  }, []);

  const currentUrl = useMemo(() => {
    if (!sequence || frameCount === 0 || rowCount === 0) return null;
    const row = sequence.rows[clampRow(rowIndex, rowCount)];
    if (!row) return null;
    return row.frames[wrap(frameIndex, frameCount)] ?? row.frames[0] ?? null;
  }, [sequence, frameIndex, rowIndex, frameCount, rowCount]);

  return {
    frameIndex,
    rowIndex,
    frameCount,
    rowCount,
    currentUrl,
    ready,
    autoSpin,
    reducedMotion,
    setAutoSpin,
    toggleAutoSpin,
    reset,
    stepFrame,
    stepRow,
    beginDrag,
    moveDrag,
    endDrag,
    pauseInteraction,
  };
}

function clampRow(index: number, rowCount: number): number {
  if (rowCount <= 0) return 0;
  return Math.min(rowCount - 1, Math.max(0, index));
}

/** Normalize legacy flat frame lists or partial rows into a SpinSequence. */
export function normalizeSpinSequence(
  input:
    | SpinSequence
    | { readonly frames: readonly string[] }
    | readonly string[]
    | null
    | undefined,
): SpinSequence | null {
  if (input == null) return null;
  if (Array.isArray(input)) {
    if (input.length === 0) return null;
    return {
      frameCount: input.length,
      rows: [{ id: "row01", frames: input }],
    };
  }
  if ("frames" in input && !("rows" in input)) {
    const frames = input.frames;
    if (!frames.length) return null;
    return {
      frameCount: frames.length,
      rows: [{ id: "row01", frames }],
    };
  }
  const seq = input as SpinSequence;
  if (!seq.rows.length || seq.frameCount <= 0) return null;
  const rows = seq.rows.map((row, i) => ({
    id: row.id || `row${String(i + 1).padStart(2, "0")}`,
    frames: row.frames.slice(0, seq.frameCount),
  }));
  return { ...seq, rows };
}
