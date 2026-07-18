/**
 * RC7.3 — ModuleApp EntityListPage live List* (Production fail-closed).
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../../state/session";
import { WorkspaceUiProvider } from "../../workspace/context";
import { ModuleApp } from "./ModuleApp";
import type { ModuleDefinition } from "./types";
import { row } from "./fixtures";

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

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

function errorBody(code: string, message: string) {
  return {
    error: {
      code,
      category: "authorization",
      message,
      details: {},
      retryable: false,
      correlationId: "corr-err",
    },
  };
}

const listModule: ModuleDefinition = {
  id: "sales",
  title: "Sales",
  lead: "Sales module live list test",
  basePath: "/app/sales",
  nav: [{ label: "Opportunities", to: "opportunities" }],
  kpis: [],
  entities: [
    {
      key: "opportunities",
      label: "Opportunity",
      plural: "Opportunities",
      description: "Live list test entity",
      columns: [
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
      ],
      filters: [{ key: "status", label: "Status", options: ["Open", "Won"] }],
      fields: [],
      records: [
        row("fix-1", "Fixture Opp", "Open", { Source: "fixture" }),
      ],
      api: {
        listQueryType: "sales.ListOpportunity",
        getQueryType: "sales.GetOpportunity",
        mapEntity: (data) => {
          const d = data as { id?: string; title?: string; status?: string };
          if (!d.id) return null;
          return row(d.id, d.title ?? d.id, d.status ?? "Open", {}, {
            source: "api",
          });
        },
      },
    },
  ],
};

function stubApi(options: {
  readonly onQuery?: (body: {
    readonly queryType: string;
    readonly payload: Record<string, unknown>;
  }) => unknown;
  readonly queryStatus?: number;
  readonly queryError?: ReturnType<typeof errorBody>;
}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/v1/auth/session")) {
      return jsonResponse({
        ok: true,
        data: {
          sessionId: "session-1",
          user: TEST_USER,
          permissionCodes: ["sales.opportunities.read"],
        },
        correlationId: "corr-session",
      });
    }
    if (url.includes("/api/v1/queries")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        queryType: string;
        payload: Record<string, unknown>;
      };
      if (options.queryError) {
        return jsonResponse(options.queryError, options.queryStatus ?? 403);
      }
      const data = options.onQuery?.(body) ?? {
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 25,
        hasMore: false,
      };
      return jsonResponse({ ok: true, data, correlationId: "corr-q" });
    }
    return jsonResponse({ ok: true, data: {}, correlationId: "corr-x" });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={["/app/sales/opportunities"]}>
      <SessionProvider>
        <WorkspaceUiProvider>
          <Routes>
            <Route path="/app/sales/*" element={<ModuleApp module={listModule} />} />
          </Routes>
        </WorkspaceUiProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_UI_PROFILE", "production");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("ModuleApp EntityListPage (RC7.3)", () => {
  it("loads Included entity rows from live List* (no fixtures)", async () => {
    seedStoredSession();
    const fetchMock = stubApi({
      onQuery: ({ queryType, payload }) => {
        expect(queryType).toBe("sales.ListOpportunity");
        expect(payload.companyId).toBe("company-1");
        return {
          items: [{ id: "opp-live", title: "Live Opp", status: "open" }],
          totalCount: 1,
          page: 1,
          pageSize: 25,
          hasMore: false,
        };
      },
    });

    renderList();

    await waitFor(() => {
      expect(screen.getByText("Live Opp")).toBeTruthy();
    });
    expect(screen.queryByText("Fixture Opp")).toBeNull();
    expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes("/api/v1/queries")),
    ).toBe(true);
  });

  it("Production profile: 403 does not substitute fixtures", async () => {
    seedStoredSession();
    stubApi({
      queryStatus: 403,
      queryError: errorBody("POLICY_DENIED", "Not authorized"),
    });

    renderList();

    await waitFor(() => {
      expect(screen.getByText(/Not authorized/i)).toBeTruthy();
    });
    expect(screen.queryByText("Fixture Opp")).toBeNull();
    expect(
      screen.getByText(/fixtures were not substituted/i),
    ).toBeTruthy();
  });

  it("Production profile: empty authorized page stays empty", async () => {
    seedStoredSession();
    stubApi({
      onQuery: () => ({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 25,
        hasMore: false,
      }),
    });

    renderList();

    await waitFor(() => {
      expect(screen.getByText(/No opportunities/i)).toBeTruthy();
    });
    expect(screen.queryByText("Fixture Opp")).toBeNull();
  });
});
