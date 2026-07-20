/**
 * RC9.4.2 — Canonical brand color tokens (source of truth).
 * CSS mirror: tokens/colors.css
 */

export const brandColors = {
  light: {
    forest: "#2f4f3f",
    forestDeep: "#243d31",
    brass: "#9a7b4f",
    brassDeep: "#7a5f3a",
    ink: "#14201a",
    inkMuted: "#3a4a42",
    paper: "#f7f8f7",
    mist: "#eef1ef",
    surface: "#ffffff",
    line: "rgba(20, 32, 26, 0.12)",
    heroText: "#f4f7f5",
    overlay: "rgba(10, 16, 13, 0.55)",
  },
  dark: {
    forest: "#3d6b54",
    forestDeep: "#2f4f3f",
    brass: "#b8956a",
    brassDeep: "#9a7b4f",
    ink: "#e8eee9",
    inkMuted: "#b7c2bb",
    paper: "#0d1310",
    mist: "#121a16",
    surface: "#121a16",
    line: "rgba(232, 238, 233, 0.14)",
    heroText: "#f4f7f5",
    overlay: "rgba(0, 0, 0, 0.48)",
  },
} as const;

export const semanticColors = {
  success: "#1b7a4a",
  warning: "#a15c12",
  danger: "#b42318",
  info: "#1f6f6a",
} as const;

export type BrandColorMode = keyof typeof brandColors;
