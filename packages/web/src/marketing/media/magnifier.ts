/**
 * Magnifier geometry for object-fit:contain stages.
 * Uses natural image pixels — never CSS scale() of the displayed bitmap.
 */

export type Rect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type MagnifierLayout = {
  /** Displayed image rect inside the stage (object-fit: contain). */
  readonly display: Rect;
  /** Lens rect in stage coordinates (clamped inside display). */
  readonly lens: Rect;
  /** Zoom pane image size + negative offset so the lens region fills the pane. */
  readonly zoomImage: { readonly width: number; readonly height: number };
  readonly zoomOffset: { readonly x: number; readonly y: number };
  /** True when pointer is over the displayed image area. */
  readonly overImage: boolean;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Compute Amazon-style dual-pane magnifier layout.
 *
 * Edge mapping: left↔left, right↔right, top↔top, bottom↔bottom.
 * Lens clamps so every natural pixel remains inspectable without clipping
 * the navigable region.
 */
export function computeMagnifierLayout(input: {
  readonly stageWidth: number;
  readonly stageHeight: number;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly pointerX: number;
  readonly pointerY: number;
  readonly paneWidth: number;
  readonly paneHeight: number;
  /** How much larger the pane shows relative to the lens region. */
  readonly zoomFactor?: number;
}): MagnifierLayout | null {
  const {
    stageWidth,
    stageHeight,
    naturalWidth,
    naturalHeight,
    pointerX,
    pointerY,
    paneWidth,
    paneHeight,
  } = input;
  const zoomFactor = input.zoomFactor ?? 2.5;

  if (
    stageWidth <= 0 ||
    stageHeight <= 0 ||
    naturalWidth <= 0 ||
    naturalHeight <= 0 ||
    paneWidth <= 0 ||
    paneHeight <= 0
  ) {
    return null;
  }

  const fit = Math.min(stageWidth / naturalWidth, stageHeight / naturalHeight);
  const displayW = naturalWidth * fit;
  const displayH = naturalHeight * fit;
  const displayX = (stageWidth - displayW) / 2;
  const displayY = (stageHeight - displayH) / 2;

  const overImage =
    pointerX >= displayX &&
    pointerX <= displayX + displayW &&
    pointerY >= displayY &&
    pointerY <= displayY + displayH;

  const localX = clamp(pointerX - displayX, 0, displayW);
  const localY = clamp(pointerY - displayY, 0, displayH);

  const lensW = clamp(paneWidth / zoomFactor, 24, displayW);
  const lensH = clamp(paneHeight / zoomFactor, 24, displayH);
  const halfW = lensW / 2;
  const halfH = lensH / 2;

  const centerX = clamp(localX, halfW, Math.max(halfW, displayW - halfW));
  const centerY = clamp(localY, halfH, Math.max(halfH, displayH - halfH));

  const lensX = displayX + centerX - halfW;
  const lensY = displayY + centerY - halfH;

  // Map lens region of the fitted image onto the pane using the hi-res source.
  const zoomImgW = (paneWidth * displayW) / lensW;
  const zoomImgH = (paneHeight * displayH) / lensH;
  const offsetX = ((centerX - halfW) / displayW) * zoomImgW;
  const offsetY = ((centerY - halfH) / displayH) * zoomImgH;

  return {
    display: { x: displayX, y: displayY, width: displayW, height: displayH },
    lens: { x: lensX, y: lensY, width: lensW, height: lensH },
    zoomImage: { width: zoomImgW, height: zoomImgH },
    zoomOffset: { x: offsetX, y: offsetY },
    overImage,
  };
}

/** Prefer an explicit zoom URL; otherwise derive a larger Unsplash variant. */
export function resolveZoomUrl(displayUrl: string, zoomUrl?: string): string {
  if (zoomUrl && zoomUrl.length > 0) return zoomUrl;
  if (displayUrl.includes("images.unsplash.com")) {
    return displayUrl
      .replace(/([?&])w=\d+/g, "$1w=4000")
      .replace(/([?&])q=\d+/g, "$1q=85")
      .replace(/([?&])fit=crop/g, "$1fit=crop");
  }
  return displayUrl;
}
