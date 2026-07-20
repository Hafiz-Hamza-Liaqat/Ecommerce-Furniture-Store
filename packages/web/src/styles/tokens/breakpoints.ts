/**
 * RC9.4.2 — Responsive breakpoints (px).
 */

export const breakpoints = {
  xs: 320,
  sm: 375,
  md: 768,
  lg: 1024,
  nav: 1200,
  xl: 1280,
  xxl: 1440,
  wide: 1536,
  max: 1920,
} as const;

export type BreakpointKey = keyof typeof breakpoints;
