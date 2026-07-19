/**
 * RC8.5 — Asset-driven product media architecture.
 *
 * Expected production layout (example):
 *   /product-media/<product-id>/
 *     gallery/image01.jpg …
 *     360/row01/frame001.jpg …
 *     360/row02/frame001.jpg …   (future elevation rows)
 *     models/product.glb | .gltf | .usdz
 *
 * Demo catalogue URLs are placeholders only — replace via product media
 * fields without changing viewer code.
 */

export type GalleryMediaItem = {
  readonly id: string;
  readonly type: "image" | "video";
  /** Display / thumbnail URL (may be optimized). */
  readonly url: string;
  readonly alt: string;
  /**
   * High-resolution source for the Amazon magnifier (2000–6000px typical).
   * Defaults to `url` when omitted.
   */
  readonly zoomUrl?: string;
};

export type SpinRow = {
  /** Stable row id, e.g. "row01" (elevation band). */
  readonly id: string;
  /** Ordered horizontal rotation frames. Length should equal sequence.frameCount. */
  readonly frames: readonly string[];
};

/**
 * Multi-row image-sequence definition.
 * Horizontal drag → frame index. Vertical drag → row index (elevation).
 * Frame count is never hard-coded; it comes from data.
 */
export type SpinSequence = {
  readonly frameCount: number;
  readonly rows: readonly SpinRow[];
  /** Auto-spin step interval (ms). Default applied by engine. */
  readonly autoSpinIntervalMs?: number;
  /** Drag pixels required to advance one frame. */
  readonly pixelsPerFrame?: number;
};

/** Future 3D / AR assets — detected only; no renderer in RC8.5. */
export type ProductModelAssets = {
  readonly glb?: string;
  readonly gltf?: string;
  readonly usdz?: string;
};

export type ProductMediaCollection = {
  readonly gallery: readonly GalleryMediaItem[];
  readonly spin: SpinSequence | null;
  readonly models: ProductModelAssets;
};

export type MediaMode = "gallery" | "spin" | "model";

export function hasSpinSequence(media: ProductMediaCollection): boolean {
  return media.spin != null && media.spin.rows.length > 0 && media.spin.frameCount > 0;
}

export function hasModelAssets(media: ProductModelAssets): boolean {
  return Boolean(media.glb || media.gltf || media.usdz);
}

export function preferredMediaModes(media: ProductMediaCollection): readonly MediaMode[] {
  const modes: MediaMode[] = [];
  if (media.gallery.length > 0) modes.push("gallery");
  if (hasSpinSequence(media)) modes.push("spin");
  if (hasModelAssets(media.models)) modes.push("model");
  return modes;
}
