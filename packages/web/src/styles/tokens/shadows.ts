/**
 * RC9.4.2 — Elevation / shadow tokens.
 */

export const shadows = {
  light: {
    sm: "0 1px 2px rgba(20, 32, 26, 0.06)",
    md: "0 4px 12px rgba(20, 32, 26, 0.08)",
    lg: "0 8px 24px rgba(20, 32, 26, 0.08)",
    xl: "0 14px 36px rgba(20, 32, 26, 0.12)",
    panel: "0 18px 50px rgba(20, 32, 26, 0.08)",
  },
  dark: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.25)",
    md: "0 4px 12px rgba(0, 0, 0, 0.35)",
    lg: "0 8px 24px rgba(0, 0, 0, 0.28)",
    xl: "0 14px 36px rgba(0, 0, 0, 0.4)",
    panel: "0 18px 50px rgba(0, 0, 0, 0.35)",
  },
} as const;
