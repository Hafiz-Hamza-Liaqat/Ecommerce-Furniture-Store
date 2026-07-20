/**
 * RC10.1 — Studio prefs + derivation tests (local only).
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  createProject,
  createShareLink,
  listProjects,
  recordQuote,
} from "./service";
import { setLocalOwnerId } from "./store";
import {
  continueTargetForProject,
  deriveMoodboardTiles,
  deriveStudioStats,
  projectProgressPercent,
} from "./studio-derive";
import {
  isProjectPinned,
  loadStudioPrefs,
  saveStudioPrefs,
  togglePinnedProject,
} from "./studio-prefs";

beforeEach(() => {
  localStorage.clear();
  setLocalOwnerId("studio-tester");
  saveStudioPrefs({
    pinnedProjectIds: [],
    density: "comfortable",
    defaultSort: "updated",
  });
});

describe("RC10.1 studio prefs", () => {
  it("pins and unpins without writing project records", () => {
    const p = createProject({ title: "Pin me", templateId: "office" });
    expect(isProjectPinned(p.id)).toBe(false);
    togglePinnedProject(p.id);
    expect(isProjectPinned(p.id)).toBe(true);
    expect(loadStudioPrefs().pinnedProjectIds).toEqual([p.id]);
    togglePinnedProject(p.id);
    expect(isProjectPinned(p.id)).toBe(false);
  });
});

describe("RC10.1 studio derivation", () => {
  it("uses placeholders when a project has no product imagery", () => {
    const p = createProject({ title: "Empty mood", templateId: "office" });
    const tiles = deriveMoodboardTiles(p, 4);
    expect(tiles).toHaveLength(4);
    expect(tiles.every((t) => t.kind === "placeholder")).toBe(true);
  });

  it("reports real stats only", () => {
    const p = createProject({ title: "Stats", templateId: "office" });
    createShareLink(p.id, "view", "Link");
    recordQuote(p.id, {
      label: "Quote A",
      lines: [{ productId: "x", qty: 1, unitPkr: 1000, name: "Item" }],
      totalPkr: 1000,
    });
    const stats = deriveStudioStats(listProjects());
    const byId = Object.fromEntries(stats.map((s) => [s.id, s.value]));
    expect(byId.active).toBeGreaterThanOrEqual(1);
    expect(byId.quotes).toBeGreaterThanOrEqual(1);
    expect(byId.shared).toBeGreaterThanOrEqual(1);
    expect(byId.wishlist).toBe(0);
  });

  it("maps status to progress", () => {
    expect(projectProgressPercent("draft")).toBe(10);
    expect(projectProgressPercent("completed")).toBe(100);
  });

  it("prefers consultant when last user message is newest", () => {
    const p = createProject({ title: "AI path", templateId: "office" });
    const withAi = {
      ...p,
      consultantMessages: [
        {
          role: "user" as const,
          text: "Hello",
          at: new Date(Date.now() + 60_000).toISOString(),
        },
      ],
      aiAssisted: true,
    };
    expect(continueTargetForProject(withAi)).toBe("consultant");
  });
});
