/**
 * RC10.1 — New project create → planner continuity + naming.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { planFromBrief } from "../intelligent/planner";
import { createProject, getProject, listProjects } from "./service";
import { restorePlannerFromRoom } from "./planner-bridge";
import { getLocalOwnerId, loadProject, setLocalOwnerId } from "./store";
import {
  PROJECT_NAME_MAX_LEN,
  parseOptionalBudget,
  templateIdFromProjectType,
  validateProjectName,
} from "./ui/NewProjectDialog";

beforeEach(() => {
  localStorage.clear();
  setLocalOwnerId("guest-local");
});

describe("new project → planner continuity", () => {
  it("creates, reloads, and plans without throw for guest", () => {
    const created = createProject({
      title: "Bahria Office Interior",
      templateId: "office",
    });
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    const loaded = getProject(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.title).toBe("Bahria Office Interior");
    const room = loaded!.rooms[0]!;
    const restored = restorePlannerFromRoom(room);
    expect(restored).not.toBeNull();
    const plan = planFromBrief(restored!.brief);
    expect(plan.primaryResult).toBeTruthy();
    expect(plan.packages.length).toBeGreaterThan(0);
  });

  it("syncs local owner on create so getProject succeeds for session owners", () => {
    const created = createProject({
      title: "Owned by account",
      templateId: "office",
      owner: {
        ownerId: "user-abc",
        ownerLabel: "user@example.com",
        customerName: "user@example.com",
      },
    });
    expect(getLocalOwnerId()).toBe("user-abc");
    expect(created.collaborators[0]?.id).toBe("user-abc");
    expect(getProject(created.id)?.id).toBe(created.id);
    expect(listProjects().some((p) => p.id === created.id)).toBe(true);
  });

  it("still denies access when local owner is forced out of sync", () => {
    const created = createProject({
      title: "Access gate",
      templateId: "home",
      owner: { ownerId: "user-abc", ownerLabel: "A" },
    });
    setLocalOwnerId("someone-else");
    expect(getProject(created.id)).toBeNull();
    expect(loadProject(created.id)?.id).toBe(created.id);
    setLocalOwnerId("user-abc");
    expect(getProject(created.id)?.id).toBe(created.id);
  });

  it("survives refresh via listProjects", () => {
    createProject({ title: "DHA Villa", templateId: "home" });
    createProject({ title: "Hotel Lobby", templateId: "hotel" });
    const titles = listProjects({ sort: "created" }).map((p) => p.title);
    expect(titles).toContain("DHA Villa");
    expect(titles).toContain("Hotel Lobby");
  });

  it("allows duplicate display names with distinct ids", () => {
    const a = createProject({ title: "My Living Room", templateId: "home" });
    const b = createProject({ title: "My Living Room", templateId: "home" });
    expect(a.title).toBe(b.title);
    expect(a.id).not.toBe(b.id);
  });

  it("stores optional description, budget, and location without orphaning", () => {
    const p = createProject({
      title: "Ali Wedding Furniture",
      templateId: "jahez",
      description: "Full jahez package",
      budgetPkr: 850_000,
      location: "Lahore",
    });
    const loaded = getProject(p.id)!;
    expect(loaded.plannerSummary).toBe("Full jahez package");
    expect(loaded.rooms[0]?.brief.budgetPkr).toBe(850_000);
    expect(loaded.notes.some((n) => n.text.includes("Lahore"))).toBe(true);
  });
});

describe("project naming validation", () => {
  it("requires a non-empty trimmed name", () => {
    expect(validateProjectName("")).toBe("Project name is required.");
    expect(validateProjectName("   ")).toBe("Project name is required.");
    expect(validateProjectName("  DHA Villa  ")).toBeNull();
  });

  it("enforces max length", () => {
    expect(validateProjectName("a".repeat(PROJECT_NAME_MAX_LEN))).toBeNull();
    expect(validateProjectName("a".repeat(PROJECT_NAME_MAX_LEN + 1))).toMatch(/100/);
  });

  it("parses optional budget", () => {
    expect(parseOptionalBudget("")).toEqual({});
    expect(parseOptionalBudget("1,250,000")).toEqual({ value: 1_250_000 });
    expect(parseOptionalBudget("-5").error).toBeTruthy();
  });

  it("maps project type choices to templates", () => {
    expect(templateIdFromProjectType("")).toBe("office");
    expect(templateIdFromProjectType("custom")).toBe("home");
    expect(templateIdFromProjectType("hotel")).toBe("hotel");
  });
});
