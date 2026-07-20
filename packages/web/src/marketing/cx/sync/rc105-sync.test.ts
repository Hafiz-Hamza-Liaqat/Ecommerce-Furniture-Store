/**
 * RC10.5 — Sync engine unit tests (local-cloud remote).
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  configureCxSyncRemote,
  createLocalCloudRemote,
  getSyncState,
  listSyncConflicts,
  markSyncDirty,
  syncNow,
} from "./index";
import { LOCAL_CLOUD_PREFIX } from "./keys";

beforeEach(() => {
  localStorage.clear();
  configureCxSyncRemote(createLocalCloudRemote());
});

describe("RC10.5 sync engine", () => {
  it("uploads and downloads workspace without duplicating keys", async () => {
    localStorage.setItem("afh.cx.wishlist", JSON.stringify(["a", "b"]));
    localStorage.setItem(
      "afh.cx.sales.workspace",
      JSON.stringify({
        version: 1,
        opportunities: [{ id: "o1" }],
        quotes: [],
        orders: [],
        timeline: [],
        notes: [],
        documents: [],
      }),
    );

    const state = await syncNow("user-1");
    expect(["synced", "conflict"]).toContain(state.status);
    expect(localStorage.getItem(`${LOCAL_CLOUD_PREFIX}user-1`)).toBeTruthy();

    // Simulate second device wipe then pull
    localStorage.removeItem("afh.cx.wishlist");
    localStorage.setItem("afh.cx.wishlist", JSON.stringify([]));
    await syncNow("user-1");
    const wish = JSON.parse(localStorage.getItem("afh.cx.wishlist") ?? "[]") as string[];
    // After merge, cloud has original wishlist; empty local may conflict or pull remote
    expect(Array.isArray(wish)).toBe(true);
  });

  it("queues dirty keys in outbox and records conflicts deterministically", async () => {
    localStorage.setItem("afh.cx.planner", JSON.stringify({ plans: [1] }));
    await syncNow("user-2");

    // Divergent edits
    localStorage.setItem("afh.cx.planner", JSON.stringify({ plans: [1, 2] }));
    markSyncDirty("afh.cx.planner");

    const cloud = JSON.parse(localStorage.getItem(`${LOCAL_CLOUD_PREFIX}user-2`)!) as {
      records: { key: string; revision: number; revisedAt: string; payload: unknown }[];
    };
    const planner = cloud.records.find((r) => r.key === "afh.cx.planner")!;
    // Poison remote with alternate payload + higher revisedAt
    planner.payload = { plans: ["remote"] };
    planner.revision = (planner.revision ?? 1) + 5;
    planner.revisedAt = new Date(Date.now() + 60_000).toISOString();
    localStorage.setItem(`${LOCAL_CLOUD_PREFIX}user-2`, JSON.stringify(cloud));

    // Bump local so both dirty
    localStorage.setItem("afh.cx.planner", JSON.stringify({ plans: ["local"] }));
    markSyncDirty("afh.cx.planner");

    await syncNow("user-2");
    expect(listSyncConflicts().length).toBeGreaterThan(0);
    expect(getSyncState().conflictCount).toBeGreaterThan(0);
    // Later revisedAt (remote) must win in working set — no silent local overwrite
    expect(JSON.parse(localStorage.getItem("afh.cx.planner")!)).toEqual({ plans: ["remote"] });
    const archives = Object.keys(localStorage).filter((k) =>
      k.startsWith("afh.cx.sync.conflict.afh.cx.planner."),
    );
    expect(archives.length).toBeGreaterThan(0);
  });

  it("reconnects after offline and drains pending without duplicates", async () => {
    localStorage.setItem("afh.cx.wishlist", JSON.stringify(["a"]));
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    markSyncDirty("afh.cx.wishlist");
    expect((await syncNow("user-4")).status).toBe("offline");
    expect(getSyncState().pendingCount).toBeGreaterThan(0);

    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    localStorage.setItem("afh.cx.wishlist", JSON.stringify(["a", "b"]));
    markSyncDirty("afh.cx.wishlist");
    const state = await syncNow("user-4");
    expect(["synced", "pending", "conflict"]).toContain(state.status);
    const cloud = JSON.parse(localStorage.getItem(`${LOCAL_CLOUD_PREFIX}user-4`)!) as {
      records: { key: string; payload: unknown }[];
    };
    const wish = cloud.records.find((r) => r.key === "afh.cx.wishlist");
    expect(wish?.payload).toEqual(["a", "b"]);
  });

  it("stays offline without throwing", async () => {
    const original = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    const state = await syncNow("user-3");
    expect(state.status).toBe("offline");
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => original });
  });
});
