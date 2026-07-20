/**
 * RC10.2 — Notification producers from project actions.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createProject, createShareLink, recordQuote } from "../cx/projects/service";
import { listNotifications, unreadNotificationCount } from "./notifications";
import { setLocalOwnerId } from "../cx/projects/store";

beforeEach(() => {
  localStorage.clear();
  setLocalOwnerId("guest-local");
});

describe("RC10.2 notification producers", () => {
  it("pushes project_shared when a share link is created", () => {
    const project = createProject({ title: "Share me", templateId: "office" });
    const before = listNotifications().length;
    const share = createShareLink(project.id, "view", "Family");
    expect(share).not.toBeNull();
    const items = listNotifications();
    expect(items.length).toBeGreaterThan(before);
    expect(items.some((n) => n.category === "project_shared" && !n.read)).toBe(true);
    expect(unreadNotificationCount()).toBeGreaterThan(0);
  });

  it("pushes quotation_ready when a quote is recorded", () => {
    const project = createProject({ title: "Quote me", templateId: "home" });
    recordQuote(project.id, {
      label: "Presentation estimate",
      lines: [{ productId: "x", name: "Chair", qty: 2, unitPkr: 1000 }],
      totalPkr: 2000,
    });
    expect(
      listNotifications().some(
        (n) => n.category === "quotation_ready" && n.title === "Quotation ready",
      ),
    ).toBe(true);
  });
});
