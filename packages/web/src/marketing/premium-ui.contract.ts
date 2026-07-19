/**
 * RC9.1 polish contract — mirrored by `styles/premium-ui.css`.
 * Tests freeze these values without importing CSS as raw text.
 */
export const RC91_POLISH = {
  revealYPx: 16,
  buttonScale: 1.015,
  imageScale: 1.025,
  categoryImageScale: 1.03,
  liftPx: 3,
  revealDurationMs: 600,
  staggerMs: 55,
  breakpoints: {
    wideMin: 1440,
    compactMin: 1200,
    compactMax: 1439,
    drawerMax: 1199,
  },
  spacingScale: [1, 2, 3, 4, 5, 6, 7, 8] as const,
  galleryHoverExempt: ["cx-gallery", "cx-spin", "site-pdp__gallery"] as const,
  reducedMotionQuery: "(prefers-reduced-motion: reduce)",
} as const;
