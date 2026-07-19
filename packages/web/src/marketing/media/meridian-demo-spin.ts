/**
 * Temporary RC8.5 Meridian Sofa 360° demo sequence (72 photographic frames).
 * Assets: /product-media/meridian-sofa/360/row01/frame001.jpg … frame072.jpg
 * Same product photo at every yaw — replace with real captures without code changes.
 */
import type { SpinSequence } from "./types";

const FRAME_COUNT = 72;

export function meridianSofaDemoSpinSequence(): SpinSequence {
  const frames = Array.from({ length: FRAME_COUNT }, (_, i) => {
    const n = String(i + 1).padStart(3, "0");
    return `/product-media/meridian-sofa/360/row01/frame${n}.jpg`;
  });
  return {
    frameCount: FRAME_COUNT,
    rows: [{ id: "row01", frames }],
    autoSpinIntervalMs: 50,
    pixelsPerFrame: 6,
  };
}

export const MERIDIAN_SOFA_DEMO_SPIN_FRAME_COUNT = FRAME_COUNT;
