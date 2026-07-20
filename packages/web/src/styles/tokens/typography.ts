/**
 * RC9.4.2 — Canonical typography scale.
 * CSS mirror: tokens/typography.css
 */

export const fontFamilies = {
  ui: '"Manrope", "Segoe UI", sans-serif',
  display: '"Syne", "Manrope", sans-serif',
} as const;

export const typeScale = {
  heroXl: "clamp(2.4rem, 6vw, 4.6rem)",
  heroL: "clamp(2rem, 4vw, 3rem)",
  h1: "clamp(1.85rem, 3.5vw, 2.75rem)",
  h2: "clamp(1.8rem, 3vw, 2.6rem)",
  h3: "clamp(1.25rem, 2vw, 1.5rem)",
  bodyL: "1.1rem",
  body: "1rem",
  caption: "0.875rem",
  eyebrow: "0.75rem",
} as const;

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  display: 750,
  hero: 800,
} as const;

export const lineHeights = {
  tight: 1.15,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
} as const;
