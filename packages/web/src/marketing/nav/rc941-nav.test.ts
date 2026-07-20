/**
 * RC9.4.1 — Workspace role resolution, routing helpers, notifications.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  addExtraWorkspaceRole,
  displayFirstName,
  inferWorkspaceRoles,
  loadActiveWorkspaceRole,
  resolveWorkspaceRoles,
  setActiveWorkspaceRole,
} from "./workspace";
import { COMPANY_MEGA_LINKS, GUEST_ACCOUNT_SECTIONS, ROLE_ACCOUNT_MENUS, WORKSPACE_ROLES } from "./config";
import {
  groupNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from "./notifications";
import {
  loginUrlForWorkspace,
  resolvePostLoginPath,
  roleHomePath,
  sanitizeReturnUrl,
} from "./role-home";

describe("RC9.4.1 workspace roles", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults authenticated users to buyer", () => {
    expect(inferWorkspaceRoles(null)).toEqual(["buyer"]);
    expect(inferWorkspaceRoles([])).toEqual(["buyer"]);
  });

  it("infers admin and sales from permission codes", () => {
    const roles = inferWorkspaceRoles([
      "platform.administration.read",
      "sales.dashboard.read",
      "crm.leads.read",
    ]);
    expect(roles).toContain("buyer");
    expect(roles).toContain("admin");
    expect(roles).toContain("sales");
  });

  it("persists active role and become extras", () => {
    addExtraWorkspaceRole("designer");
    setActiveWorkspaceRole("designer");
    const resolved = resolveWorkspaceRoles(["projects.dashboard.read"]);
    expect(resolved.available).toContain("designer");
    expect(resolved.active).toBe("designer");
    expect(resolved.badge).toMatch(/designer/i);
    expect(loadActiveWorkspaceRole(resolved.available)).toBe("designer");
  });

  it("formats display first name from full name or email", () => {
    expect(displayFirstName("Hamza Abbas", "h@example.com")).toBe("Hamza");
    expect(displayFirstName(null, "sarah@example.com")).toBe("Sarah");
  });

  it("exposes company mega and role menus", () => {
    expect(COMPANY_MEGA_LINKS.some((l) => l.to === "/about")).toBe(true);
    expect(COMPANY_MEGA_LINKS.some((l) => l.to === "/contact")).toBe(true);
    expect(GUEST_ACCOUNT_SECTIONS[0]?.links.some((l) => l.label === "Saved Wishlist")).toBe(true);
    expect(ROLE_ACCOUNT_MENUS.buyer[0]?.links.some((l) => l.label === "Buyer Dashboard")).toBe(true);
    const workspace = ROLE_ACCOUNT_MENUS.buyer.find((s) => s.id === "workspace");
    expect(workspace?.links.some((l) => l.action === "appearance")).toBe(true);
    expect(workspace?.links.some((l) => l.action === "notifications")).toBe(true);
    expect(workspace?.links.some((l) => l.label === "Compare")).toBe(true);
    expect(ROLE_ACCOUNT_MENUS.buyer.find((s) => s.id === "profile")?.links.some((l) => l.label === "Profile")).toBe(
      true,
    );
    expect(ROLE_ACCOUNT_MENUS.admin[0]?.links.some((l) => l.label === "Admin Dashboard")).toBe(true);
    expect(WORKSPACE_ROLES.find((r) => r.id === "supplier")?.badge).toBe("Manufacturer");
  });
});

describe("RC9.4.1 role home + login redirects", () => {
  it("sanitizes return URLs", () => {
    expect(sanitizeReturnUrl("/portal")).toBe("/portal");
    expect(sanitizeReturnUrl("//evil.com")).toBeNull();
    expect(sanitizeReturnUrl("/login")).toBeNull();
  });

  it("maps roles to homes", () => {
    expect(roleHomePath("buyer")).toBe("/my-projects");
    expect(roleHomePath("admin")).toBe("/app");
    expect(roleHomePath("sales")).toBe("/app/crm");
    expect(roleHomePath("designer")).toBe("/my-projects");
  });

  it("builds workspace login URL with message reason", () => {
    expect(loginUrlForWorkspace("/portal")).toContain("reason=workspace");
    expect(loginUrlForWorkspace("/portal")).toContain("returnUrl=");
  });

  it("resolves post-login portal soft landing without portal permission", () => {
    expect(resolvePostLoginPath([], "/portal")).toBe("/my-projects");
    expect(resolvePostLoginPath(["portal.customer_portal.read"], "/portal")).toBe("/portal");
  });
});

describe("RC9.4.1 notification center", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("seeds, groups, and marks notifications read", () => {
    const items = listNotifications();
    expect(items.length).toBeGreaterThan(0);
    expect(unreadNotificationCount()).toBeGreaterThan(0);
    const groups = groupNotifications(items);
    expect(groups.some((g) => g.label === "Today" || g.label === "Earlier")).toBe(true);
    markNotificationRead(items[0]!.id);
    markAllNotificationsRead();
    expect(unreadNotificationCount()).toBe(0);
  });
});
