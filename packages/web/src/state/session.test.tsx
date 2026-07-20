/**
 * RC5.2.1 session permission lifecycle tests — permission codes stay
 * consistent across login, page reload, silent/manual refresh, revocation,
 * and logout, and the route guard's loading state always exits.
 *
 * The fetch stub mirrors backend semantics: refresh keeps sessionId stable
 * and rotates refreshToken/expiresAt (see identity SessionService).
 */

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RequirePermission } from "../auth/RequirePermission";
import { SessionProvider, useSession } from "./session";

const STORAGE_KEY = "afh.web.session";

const TEST_USER = {
  id: "user-1",
  email: "user@example.com",
  companyId: "company-1",
  status: "active",
  mfaEnabled: false,
};

function futureIso(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function makeTokens(rotation: number) {
  return {
    sessionId: "session-1",
    refreshToken: `refresh-${rotation}`,
    expiresAt: futureIso(60 * 60 * 1000 + rotation),
    absoluteExpiresAt: futureIso(24 * 60 * 60 * 1000),
  };
}

function seedStoredSession() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ user: TEST_USER, tokens: makeTokens(0) }),
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

/**
 * Stateful backend stub. `permissions` is mutable so tests can simulate
 * grants/revocations between refreshes. Counts session fetches to assert
 * exactly one permission fetch per token rotation.
 */
function stubBackend(initialPermissions: readonly string[]) {
  const state = {
    permissions: initialPermissions,
    sessionFetches: 0,
    refreshes: 0,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/auth/session")) {
        state.sessionFetches += 1;
        return jsonResponse({
          ok: true,
          data: {
            sessionId: "session-1",
            user: TEST_USER,
            permissionCodes: state.permissions,
          },
          correlationId: `sess-${state.sessionFetches}`,
        });
      }
      if (url.includes("/api/v1/auth/refresh")) {
        state.refreshes += 1;
        return jsonResponse({
          ok: true,
          data: { tokens: makeTokens(state.refreshes) },
          correlationId: `refresh-${state.refreshes}`,
        });
      }
      return jsonResponse({ ok: true, data: {}, correlationId: "other" });
    }),
  );
  return state;
}

function Probe() {
  const { permissionCodes, refreshSession, clearSession, setSession } =
    useSession();
  return (
    <div>
      <span data-testid="codes">
        {permissionCodes === null ? "<null>" : permissionCodes.join(",")}
      </span>
      <button
        data-testid="login"
        onClick={() => setSession(TEST_USER, makeTokens(0))}
      />
      <button data-testid="refresh" onClick={() => void refreshSession()} />
      <button data-testid="logout" onClick={() => clearSession()} />
      <RequirePermission required={["finance.dashboard.read"]}>
        <div data-testid="guarded-content" />
      </RequirePermission>
    </div>
  );
}

function renderProbe() {
  return render(
    <MemoryRouter>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </MemoryRouter>,
  );
}

async function expectCodes(
  screen: ReturnType<typeof renderProbe>,
  expected: string,
) {
  await waitFor(() => {
    expect(screen.getByTestId("codes").textContent).toBe(expected);
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("session permission lifecycle (RC5.2.1)", () => {
  it("login loads permissions", async () => {
    const backend = stubBackend(["finance.dashboard.read"]);
    const screen = renderProbe();
    expect(screen.getByTestId("codes").textContent).toBe("<null>");
    fireEvent.click(screen.getByTestId("login"));
    await expectCodes(screen, "finance.dashboard.read");
    expect(backend.sessionFetches).toBe(1);
  });

  it("page reload (stored session) loads permissions once", async () => {
    seedStoredSession();
    const backend = stubBackend(["finance.dashboard.read"]);
    const screen = renderProbe();
    await expectCodes(screen, "finance.dashboard.read");
    expect(backend.sessionFetches).toBe(1);
  });

  it("silent refresh reloads permissions without a loading regression", async () => {
    seedStoredSession();
    const backend = stubBackend(["finance.dashboard.read"]);
    const screen = renderProbe();
    await expectCodes(screen, "finance.dashboard.read");

    backend.permissions = ["finance.dashboard.read", "sales.dashboard.read"];
    fireEvent.click(screen.getByTestId("refresh"));
    await expectCodes(screen, "finance.dashboard.read,sales.dashboard.read");
    // Exactly one extra fetch per rotation; codes never regressed to <null>.
    expect(backend.sessionFetches).toBe(2);
    expect(backend.refreshes).toBe(1);
    expect(screen.getByTestId("guarded-content")).toBeTruthy();
  });

  it("permission revocation takes effect after refresh", async () => {
    seedStoredSession();
    const backend = stubBackend(["finance.dashboard.read"]);
    const screen = renderProbe();
    await expectCodes(screen, "finance.dashboard.read");
    expect(screen.getByTestId("guarded-content")).toBeTruthy();

    backend.permissions = [];
    fireEvent.click(screen.getByTestId("refresh"));
    await expectCodes(screen, "");
    expect(screen.queryByTestId("guarded-content")).toBeNull();
    expect(await screen.findByText("Permission denied")).toBeTruthy();
  });

  it("logout clears permissions", async () => {
    seedStoredSession();
    stubBackend(["finance.dashboard.read"]);
    const screen = renderProbe();
    await expectCodes(screen, "finance.dashboard.read");

    fireEvent.click(screen.getByTestId("logout"));
    await expectCodes(screen, "<null>");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("repeated refreshes never deadlock on the loading state", async () => {
    seedStoredSession();
    const backend = stubBackend(["finance.dashboard.read"]);
    const screen = renderProbe();
    await expectCodes(screen, "finance.dashboard.read");

    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByTestId("refresh"));
      await waitFor(() => {
        expect(backend.refreshes).toBe(i + 1);
      });
      await expectCodes(screen, "finance.dashboard.read");
    }
    // One initial fetch plus one per refresh — no loops, no stuck <null>.
    expect(backend.sessionFetches).toBe(4);
    expect(screen.getByTestId("guarded-content")).toBeTruthy();
  });

  it("guard loading state exits once permissions resolve", async () => {
    seedStoredSession();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("/api/v1/auth/session")) {
          await gate;
          return jsonResponse({
            ok: true,
            data: {
              sessionId: "session-1",
              user: TEST_USER,
              permissionCodes: ["finance.dashboard.read"],
            },
            correlationId: "sess-1",
          });
        }
        return jsonResponse({ ok: true, data: {}, correlationId: "other" });
      }),
    );
    const screen = renderProbe();
    expect(screen.getByLabelText("Loading page")).toBeTruthy();
    expect(screen.queryByTestId("guarded-content")).toBeNull();

    release?.();
    expect(await screen.findByTestId("guarded-content")).toBeTruthy();
    expect(screen.queryByLabelText("Loading page")).toBeNull();
  });
});
