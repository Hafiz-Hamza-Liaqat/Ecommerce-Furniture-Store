/**
 * RC7.3 — UI profile for Production fail-closed vs Demo fixture fallback.
 * Production: Included List* entities never fall back to fixtures.
 * Demo/Test: fixtures allowed only when explicitly enabled.
 */

export type UiProfile = "production" | "demo";

export function resolveUiProfile(
  env: Record<string, string | boolean | undefined> = import.meta.env as Record<
    string,
    string | boolean | undefined
  >,
): UiProfile {
  const raw = String(env.VITE_UI_PROFILE ?? "")
    .trim()
    .toLowerCase();
  if (raw === "production" || raw === "prod") return "production";
  if (raw === "demo" || raw === "test" || raw === "development") return "demo";
  // Vite production builds default to fail-closed Production list behavior.
  if (env.PROD === true || env.PROD === "true" || env.MODE === "production") {
    return "production";
  }
  return "demo";
}

export function allowFixtureListFallback(profile: UiProfile = resolveUiProfile()): boolean {
  return profile === "demo";
}
