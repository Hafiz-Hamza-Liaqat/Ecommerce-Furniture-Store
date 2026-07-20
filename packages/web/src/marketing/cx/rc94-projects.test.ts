/**
 * RC9.4 — Furnishing project persistence, collaboration, and versioning tests.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultBrief } from "./intelligent/space-brief";
import { planFromBrief } from "./intelligent/planner";
import {
  addProjectNote,
  addRoom,
  buildCrmProjectMeta,
  canAccessProject,
  compareProjectVersions,
  createProject,
  createShareLink,
  duplicateRoom,
  getProject,
  inviteCollaborator,
  listProjects,
  openSharedProject,
  recordQuote,
  restorePlannerFromRoom,
  restoreVersion,
  syncConsultantState,
  upsertRoomSnapshot,
  welcomeBackMessage,
} from "./projects";
import { getLocalOwnerId, mergeProjectsOnLogin, setLocalOwnerId } from "./projects/store";

function sampleLines() {
  const brief = createDefaultBrief("office");
  const plan = planFromBrief({ ...brief, employeeCount: 8, seats: 8, budgetPkr: 1_500_000 });
  const result = plan.primaryResult;
  return result.lines.slice(0, 4).map((l) => ({
    productId: l.product.id,
    name: l.product.name,
    qty: l.qty,
    role: l.role,
    unitPkr: l.product.pricePkr,
  }));
}

describe("RC9.4 project persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocalOwnerId("guest-local");
  });

  it("creates and lists a furnishing project", () => {
    const lines = sampleLines();
    const project = createProject({
      title: "My New Office",
      templateId: "office",
      room: {
        name: "Workstations",
        templateId: "office",
        brief: createDefaultBrief("office"),
        activeTier: "recommended",
        lines,
        totalPkr: lines.reduce((s, l) => s + l.unitPkr * l.qty, 0),
        explanations: ["Grounded office package"],
        upgrades: [],
        downgrades: [],
        packageName: "Recommended package",
        notes: [],
      },
    });
    expect(project.id).toMatch(/^[a-f0-9-]{36}$/i);
    expect(project.versions).toHaveLength(1);
    expect(project.status).toBe("planning");

    const items = listProjects({ search: "office" });
    expect(items.some((p) => p.id === project.id)).toBe(true);
    expect(items[0]?.title).toBe("My New Office");
  });

  it("resumes planner state from a saved room", () => {
    const lines = sampleLines();
    const created = createProject({
      title: "Resume test",
      templateId: "office",
      room: {
        name: "Main",
        templateId: "office",
        brief: { ...createDefaultBrief("office"), budgetPkr: 900_000 },
        activeTier: "recommended",
        lines,
        totalPkr: 800_000,
        explanations: [],
        upgrades: [],
        downgrades: [],
        packageName: "Recommended",
        notes: [],
      },
    });
    const loaded = getProject(created.id);
    const room = loaded!.rooms[0]!;
    const restored = restorePlannerFromRoom(room);
    expect(restored?.brief.budgetPkr).toBe(900_000);
    expect(restored?.lines.length).toBe(lines.length);
    expect(restored?.lines[0]?.product.id).toBe(lines[0]!.productId);
  });

  it("autosaves planner snapshots with version history", () => {
    const created = createProject({ title: "Versioned", templateId: "office" });
    const lines = sampleLines();
    upsertRoomSnapshot(
      created.id,
      {
        roomId: created.activeRoomId,
        templateId: "office",
        brief: { ...createDefaultBrief("office"), budgetPkr: 2_000_000 },
        activeTier: "recommended",
        lines,
        totalPkr: 1_800_000,
        packageName: "Recommended",
        explanations: ["Budget increased"],
      },
      "Budget increased",
    );
    const updated = getProject(created.id)!;
    expect(updated.versions.length).toBeGreaterThanOrEqual(2);
    expect(updated.rooms[0]?.lines.length).toBe(lines.length);
  });

  it("supports multi-room projects", () => {
    const project = createProject({ title: "House", templateId: "home" });
    const withMeeting = addRoom(project.id, "Meeting Room", "office");
    expect(withMeeting?.rooms.length).toBe(2);
    const dup = duplicateRoom(project.id, withMeeting!.activeRoomId);
    expect(dup?.rooms.length).toBe(3);
    const budget = dup!.rooms.reduce((s, r) => s + (r.brief.budgetPkr ?? 0), 0);
    expect(budget).toBeGreaterThan(0);
  });

  it("restores and compares versions", () => {
    const project = createProject({ title: "Compare", templateId: "office" });
    const v1 = getProject(project.id)!.versions[0]!.id;
    upsertRoomSnapshot(
      project.id,
      {
        roomId: project.activeRoomId,
        templateId: "office",
        brief: { ...createDefaultBrief("office"), budgetPkr: 3_000_000 },
        activeTier: "premium",
        lines: sampleLines(),
        totalPkr: 2_500_000,
        packageName: "Premium",
      },
      "Executive furniture upgraded",
    );
    const latest = getProject(project.id)!;
    const v2 = latest.versions[latest.versions.length - 1]!.id;
    const diff = compareProjectVersions(project.id, v1, v2);
    expect(diff).not.toBeNull();
    expect(diff!.budgetDeltaPkr).not.toBe(0);

    const restored = restoreVersion(project.id, v1);
    expect(restored?.versions.length).toBeGreaterThan(latest.versions.length);
  });

  it("syncs AI consultant state without resetting recommendations", () => {
    const project = createProject({ title: "AI Office", templateId: "office" });
    syncConsultantState(
      project.id,
      { endUse: "office", budgetPkr: 1_200_000, spaceTemplateId: "office" },
      [
        { role: "user", text: "Need ergonomic chairs", at: new Date().toISOString() },
        { role: "assistant", text: "I recommend task chairs for all workstations.", at: new Date().toISOString() },
      ],
    );
    const updated = getProject(project.id)!;
    expect(updated.aiAssisted).toBe(true);
    expect(updated.consultantMessages.length).toBe(2);
    expect(welcomeBackMessage(updated)).toMatch(/Welcome back/i);
  });

  it("records quotations and exposes CRM metadata", () => {
    const project = createProject({ title: "Quoted", templateId: "office" });
    const lines = sampleLines();
    recordQuote(project.id, {
      label: "Office package v1",
      lines: lines.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty, unitPkr: l.unitPkr })),
      totalPkr: 1_000_000,
    });
    const updated = getProject(project.id)!;
    expect(updated.status).toBe("quoted");
    expect(updated.quotes.some((q) => q.isLatest)).toBe(true);
    const meta = buildCrmProjectMeta(updated);
    expect(meta.projectId).toBe(project.id);
    expect(meta.quotationTotal).toBe(1_000_000);
    expect(Array.isArray(meta.rooms)).toBe(true);
  });

  it("supports share links and collaborator permissions", () => {
    const project = createProject({ title: "Shared", templateId: "office" });
    const share = createShareLink(project.id, "view", "Family view");
    expect(share?.url).toContain("share=");
    const token = share!.url.split("share=")[1]!;
    const opened = openSharedProject(token);
    expect(opened?.id).toBe(project.id);

    inviteCollaborator(project.id, {
      email: "designer@example.com",
      name: "Interior Designer",
      role: "Interior Designer",
      permission: "comment",
    });
    const withCollab = getProject(project.id)!;
    expect(withCollab.collaborators.some((c) => c.email === "designer@example.com")).toBe(true);
    expect(canAccessProject(withCollab, "designer@example.com", "view")).toBe(true);
    expect(canAccessProject(withCollab, "designer@example.com", "edit")).toBe(false);
    expect(canAccessProject(withCollab, "other-user", "view")).toBe(false);
  });

  it("merges guest projects on login", () => {
    const guest = createProject({ title: "Guest plan", templateId: "cafe" });
    expect(getLocalOwnerId()).toBe("guest-local");
    const merged = mergeProjectsOnLogin("user-42", "user@example.com");
    expect(merged).toBe(1);
    const loaded = getProject(guest.id, "user-42");
    expect(loaded?.ownerId).toBe("user-42");
  });

  it("stores project notes on save", () => {
    const project = createProject({ title: "Notes", templateId: "office" });
    addProjectNote(project.id, "Client prefers oak finish.");
    const updated = getProject(project.id)!;
    expect(updated.notes[0]?.text).toContain("oak");
  });
});
