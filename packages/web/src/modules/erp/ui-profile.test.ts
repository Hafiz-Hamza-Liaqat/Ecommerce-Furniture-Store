import { describe, expect, it } from "vitest";
import { allowFixtureListFallback, resolveUiProfile } from "./ui-profile";

describe("RC7.3 ui-profile", () => {
  it("resolves explicit production profile", () => {
    expect(resolveUiProfile({ VITE_UI_PROFILE: "production" })).toBe(
      "production",
    );
    expect(resolveUiProfile({ VITE_UI_PROFILE: "prod" })).toBe("production");
  });

  it("resolves demo/test/development as demo", () => {
    expect(resolveUiProfile({ VITE_UI_PROFILE: "demo" })).toBe("demo");
    expect(resolveUiProfile({ VITE_UI_PROFILE: "test" })).toBe("demo");
    expect(resolveUiProfile({ VITE_UI_PROFILE: "development" })).toBe("demo");
  });

  it("defaults Vite PROD builds to production (boolean or string)", () => {
    expect(resolveUiProfile({ PROD: true })).toBe("production");
    expect(resolveUiProfile({ PROD: "true", MODE: "production" })).toBe(
      "production",
    );
  });

  it("defaults unspecified non-prod env to demo", () => {
    expect(resolveUiProfile({ MODE: "development" })).toBe("demo");
    expect(resolveUiProfile({})).toBe("demo");
  });

  it("allows fixture fallback only in demo", () => {
    expect(allowFixtureListFallback("demo")).toBe(true);
    expect(allowFixtureListFallback("production")).toBe(false);
  });
});
