/**
 * RC10.2.1 — Project continuity (owner sync before planner open).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { planFromBrief } from "./planner";
import { createProject, getProject, upsertRoomSnapshot } from "../projects/service";
import { restorePlannerFromRoom } from "../projects/planner-bridge";
import {
  getLocalOwnerId,
  loadProject,
  mergeProjectsOnLogin,
  setLocalOwnerId,
} from "../projects/store";

beforeEach(() => {
  localStorage.clear();
  setLocalOwnerId("guest-local");
});

describe("RC10.2.1 project continuity", () => {
  it("opens project after login merge when create used session owner", () => {
    const created = createProject({
      title: "Continuity Office",
      templateId: "office",
      owner: {
        ownerId: "user-42",
        ownerLabel: "user@example.com",
        customerName: "user@example.com",
      },
    });
    expect(getLocalOwnerId()).toBe("user-42");
    expect(getProject(created.id)?.id).toBe(created.id);

    // Simulate stale actor (e.g. another tab) then recover like planner boot.
    setLocalOwnerId("guest-local");
    expect(getProject(created.id)).toBeNull();
    expect(loadProject(created.id)?.id).toBe(created.id);

    mergeProjectsOnLogin("user-42", "user@example.com");
    expect(getLocalOwnerId()).toBe("user-42");
    expect(getProject(created.id)?.title).toBe("Continuity Office");
  });

  it("recovers via setLocalOwnerId from raw owner when merge is not needed", () => {
    const created = createProject({
      title: "Raw recover",
      templateId: "home",
      owner: { ownerId: "acct-9", ownerLabel: "A" },
    });
    setLocalOwnerId("other");
    expect(getProject(created.id)).toBeNull();
    const raw = loadProject(created.id);
    expect(raw).not.toBeNull();
    setLocalOwnerId(raw!.ownerId);
    expect(getProject(created.id)?.id).toBe(created.id);
  });

  it("empty new project can seed package lines from brief without hanging", () => {
    const created = createProject({
      title: "Empty seed",
      templateId: "office",
    });
    const loaded = getProject(created.id)!;
    expect(loaded.rooms[0]?.lines.length).toBe(0);
    const restored = restorePlannerFromRoom(loaded.rooms[0]!);
    expect(restored).not.toBeNull();
    expect(restored!.lines.length).toBe(0);
    const seedPlan = planFromBrief(restored!.brief);
    const seedResult =
      seedPlan.results.find((r) => r.tier === restored!.activeTier) ?? seedPlan.primaryResult;
    expect(seedResult).toBeTruthy();
    expect(seedResult!.lines.length).toBeGreaterThan(0);
  });

  it("persists removed lines across reload when packageCustomized", () => {
    const created = createProject({ title: "Edit persist", templateId: "office" });
    const brief = created.rooms[0]!.brief;
    const plan = planFromBrief(brief);
    const primary = plan.primaryResult;
    expect(primary.lines.length).toBeGreaterThan(1);
    const kept = primary.lines.slice(1).map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      qty: l.qty,
      role: l.role,
      ...(l.zone ? { zone: l.zone } : {}),
      unitPkr: l.product.pricePkr,
    }));
    const roomId = created.activeRoomId;
    upsertRoomSnapshot(
      created.id,
      {
        roomId,
        templateId: "office",
        brief,
        activeTier: "recommended",
        lines: kept,
        totalPkr: kept.reduce((s, l) => s + l.unitPkr * l.qty, 0),
        packageName: "Recommended package",
        packageCustomized: true,
      },
      "Package line edit",
    );
    const reloaded = getProject(created.id)!;
    const room = reloaded.rooms.find((r) => r.id === roomId)!;
    expect(room.packageCustomized).toBe(true);
    expect(room.lines.length).toBe(kept.length);
    expect(room.lines.length).toBeLessThan(primary.lines.length);
  });
});
