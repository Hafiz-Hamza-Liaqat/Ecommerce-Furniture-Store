/**
 * RC5.2 RequirePermission component tests — permitted render, forbidden
 * experience, pending-permission loading state, auth-only routes, and the
 * rollout feature flag bypass.
 */

import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../state/session";
import { RequirePermission } from "./RequirePermission";

const STORAGE_KEY = "afh.web.session";

const TEST_USER = {
  id: "user-1",
  email: "user@example.com",
  companyId: "company-1",
  status: "active",
  mfaEnabled: false,
};

function seedStoredSession() {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: TEST_USER,
      tokens: {
        sessionId: "session-1",
        refreshToken: "refresh-1",
        expiresAt: future,
        absoluteExpiresAt: future,
      },
    }),
  );
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

function stubSessionFetch(permissionCodes: readonly string[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/v1/auth/session")) {
        return jsonResponse({
          ok: true,
          data: { sessionId: "session-1", user: TEST_USER, permissionCodes },
          correlationId: "corr-1",
        });
      }
      return jsonResponse({ ok: true, data: {}, correlationId: "corr-2" });
    }),
  );
}

function renderGuarded(required: readonly string[]) {
  return render(
    <MemoryRouter>
      <SessionProvider>
        <RequirePermission required={required}>
          <div data-testid="protected-content" />
        </RequirePermission>
      </SessionProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("RequirePermission", () => {
  it("renders children when the session grants the required permission", async () => {
    seedStoredSession();
    stubSessionFetch(["finance.dashboard.read"]);
    const screen = renderGuarded(["finance.dashboard.read"]);
    expect(await screen.findByTestId("protected-content")).toBeTruthy();
  });

  it("shows the forbidden experience when a permission is missing", async () => {
    seedStoredSession();
    stubSessionFetch(["sales.dashboard.read"]);
    const screen = renderGuarded(["finance.dashboard.read"]);
    expect(await screen.findByText("Permission denied")).toBeTruthy();
    expect(screen.queryByTestId("protected-content")).toBeNull();
  });

  it("requires every listed permission (AND semantics)", async () => {
    seedStoredSession();
    stubSessionFetch(["analytics.dashboards.read"]);
    const screen = renderGuarded([
      "analytics.dashboards.read",
      "analytics.dashboards.configure",
    ]);
    expect(await screen.findByText("Permission denied")).toBeTruthy();
  });

  it("shows a retriable error (not access) when the permission load fails", async () => {
    seedStoredSession();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    const screen = renderGuarded(["finance.dashboard.read"]);
    expect(
      await screen.findByText("Could not load your permissions"),
    ).toBeTruthy();
    expect(screen.queryByTestId("protected-content")).toBeNull();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("shows a loading state while permissions resolve, never a false deny", () => {
    seedStoredSession();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    const screen = renderGuarded(["finance.dashboard.read"]);
    expect(screen.getByLabelText("Loading page")).toBeTruthy();
    expect(screen.queryByTestId("protected-content")).toBeNull();
    expect(screen.queryByText("Permission denied")).toBeNull();
  });

  it("renders children immediately for authentication-only routes", () => {
    seedStoredSession();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    const screen = renderGuarded([]);
    expect(screen.getByTestId("protected-content")).toBeTruthy();
  });

  it("bypasses permission gating when the rollout flag disables it", () => {
    seedStoredSession();
    localStorage.setItem("afh.web.routeGuard", "0");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    const screen = renderGuarded(["finance.dashboard.read"]);
    expect(screen.getByTestId("protected-content")).toBeTruthy();
  });
});
