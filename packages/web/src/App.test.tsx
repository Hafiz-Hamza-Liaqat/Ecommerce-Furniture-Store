/**
 * RC5.2 route protection integration tests over the real AppRoutes tree —
 * direct URL authorization, unauthorized access experiences, preserved
 * RequireAuth behavior, and the rollout feature flag.
 *
 * Heavy lazy pages and shells are mocked; guards, session state, and route
 * structure are real.
 */

import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "./App";
import { SessionProvider } from "./state/session";

vi.mock("./routes/lazy", async () => {
  const React = await import("react");
  const cache = new Map<string, () => React.ReactElement>();
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string" || prop === "then" || prop === "default") {
          return undefined;
        }
        let component = cache.get(prop);
        if (!component) {
          component = () =>
            React.createElement("div", { "data-testid": `page-${prop}` });
          cache.set(prop, component);
        }
        return component;
      },
      has: () => true,
    },
  );
});

vi.mock("./shell/AppShell", async () => {
  const React = await import("react");
  const { Outlet } = await import("react-router-dom");
  return {
    AppShell: () =>
      React.createElement(
        "div",
        { "data-testid": "app-shell" },
        React.createElement(Outlet),
      ),
  };
});

vi.mock("./marketing/MarketingShell", async () => {
  const React = await import("react");
  const { Outlet } = await import("react-router-dom");
  return {
    MarketingShell: () =>
      React.createElement(
        "div",
        { "data-testid": "marketing-shell" },
        React.createElement(Outlet),
      ),
  };
});

vi.mock("./auth/LoginPage", async () => {
  const React = await import("react");
  return {
    LoginPage: () => React.createElement("div", { "data-testid": "login-page" }),
  };
});

vi.mock("./auth/RegisterPage", async () => {
  const React = await import("react");
  return {
    RegisterPage: () => React.createElement("div"),
  };
});

vi.mock("./auth/PasswordResetPage", async () => {
  const React = await import("react");
  return {
    PasswordResetPage: () => React.createElement("div"),
  };
});

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

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </MemoryRouter>,
  );
}

function renderAuthenticatedAt(
  path: string,
  permissionCodes: readonly string[],
) {
  seedStoredSession();
  stubSessionFetch(permissionCodes);
  return renderAt(path);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("RequireAuth behavior is preserved", () => {
  it("redirects unauthenticated direct URLs to /login", async () => {
    stubSessionFetch([]);
    const screen = renderAt("/app/finance/invoices");
    expect(await screen.findByTestId("login-page")).toBeTruthy();
  });

  it("redirects unauthenticated /admin/platform to /login", async () => {
    stubSessionFetch([]);
    const screen = renderAt("/admin/platform");
    expect(await screen.findByTestId("login-page")).toBeTruthy();
  });
});

describe("unauthorized access (authenticated, missing permission)", () => {
  it("shows Access denied on a protected module route", async () => {
    const screen = renderAuthenticatedAt("/app/finance", []);
    expect(await screen.findByText("Access denied")).toBeTruthy();
    expect(screen.queryByTestId("page-LazyFinancePage")).toBeNull();
  });

  it("keeps the app shell visible (no nav filtering) while denying", async () => {
    const screen = renderAuthenticatedAt("/app/finance", []);
    expect(await screen.findByText("Access denied")).toBeTruthy();
    expect(screen.getByTestId("app-shell")).toBeTruthy();
  });

  it("denies the workspace dashboard without executive.dashboard.read", async () => {
    const screen = renderAuthenticatedAt("/app", ["sales.dashboard.read"]);
    expect(await screen.findByText("Access denied")).toBeTruthy();
  });

  it("denies /admin/platform without platform.administration.read", async () => {
    const screen = renderAuthenticatedAt("/admin/platform", [
      "finance.dashboard.read",
    ]);
    expect(await screen.findByText("Access denied")).toBeTruthy();
    expect(screen.queryByTestId("page-LazyAdminRoutes")).toBeNull();
  });

  it("denies /portal without portal.customer_portal.read", async () => {
    const screen = renderAuthenticatedAt("/portal", []);
    expect(await screen.findByText("Access denied")).toBeTruthy();
  });
});

describe("authorized access renders the documented route", () => {
  it("renders the workspace dashboard with executive.dashboard.read", async () => {
    const screen = renderAuthenticatedAt("/app", ["executive.dashboard.read"]);
    expect(await screen.findByTestId("page-LazyDashboardPage")).toBeTruthy();
  });

  it("renders a module route with its module dashboard permission", async () => {
    const screen = renderAuthenticatedAt("/app/finance", [
      "finance.dashboard.read",
    ]);
    expect(await screen.findByTestId("page-LazyFinancePage")).toBeTruthy();
  });

  it("renders /portal with portal.customer_portal.read", async () => {
    const screen = renderAuthenticatedAt("/portal", [
      "portal.customer_portal.read",
    ]);
    expect(await screen.findByTestId("page-LazyPortalRoutes")).toBeTruthy();
  });

  it("renders /admin/platform with platform.administration.read", async () => {
    const screen = renderAuthenticatedAt("/admin/platform", [
      "platform.administration.read",
    ]);
    expect(await screen.findByTestId("page-LazyAdminRoutes")).toBeTruthy();
  });

  it("keeps authentication-only routes reachable without permissions", async () => {
    const screen = renderAuthenticatedAt("/app/me", []);
    expect(
      await screen.findByTestId("page-LazyPersonalWorkspacePage"),
    ).toBeTruthy();
  });
});

describe("direct URL authorization follows the same checks", () => {
  it("denies a deep module URL without the module permission", async () => {
    const screen = renderAuthenticatedAt("/app/sales/orders/ord-1/edit", [
      "finance.dashboard.read",
    ]);
    expect(await screen.findByText("Access denied")).toBeTruthy();
  });

  it("allows a deep module URL with the module permission", async () => {
    const screen = renderAuthenticatedAt("/app/sales/orders/ord-1/edit", [
      "sales.dashboard.read",
    ]);
    expect(await screen.findByTestId("page-LazySalesPage")).toBeTruthy();
  });

  it("requires both permissions on the analytics builder deep link", async () => {
    const denied = renderAuthenticatedAt("/app/analytics/builder", [
      "analytics.dashboards.read",
    ]);
    expect(await denied.findByText("Access denied")).toBeTruthy();
  });

  it("allows the analytics builder deep link with both permissions", async () => {
    const screen = renderAuthenticatedAt("/app/analytics/builder", [
      "analytics.dashboards.read",
      "analytics.dashboards.configure",
    ]);
    expect(
      await screen.findByTestId("page-LazyAnalyticsCenterPage"),
    ).toBeTruthy();
  });
});

describe("rollout feature flag", () => {
  it("reverts to session-only protection when the guard is disabled", async () => {
    localStorage.setItem("afh.web.routeGuard", "0");
    const screen = renderAuthenticatedAt("/app/finance", []);
    expect(await screen.findByTestId("page-LazyFinancePage")).toBeTruthy();
  });
});
