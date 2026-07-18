/**
 * RC6.3 — Workflow / Approvals pages load via operator CQRS (no fixtures).
 */

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../state/session";
import { WorkspaceUiProvider } from "../workspace/context";
import { ApprovalsPage, WorkflowPage } from "./platform";

const STORAGE_KEY = "afh.web.session";

const TEST_USER = {
  id: "user-1",
  email: "user@example.com",
  companyId: "company-1",
  status: "active",
  mfaEnabled: false,
};

function seedStoredSession(companyId: string | null = "company-1") {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: { ...TEST_USER, companyId },
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

function errorBody(code: string, message: string, category = "authorization") {
  return {
    error: {
      code,
      category,
      message,
      details: {},
      retryable: false,
      correlationId: "corr-err",
    },
  };
}

type QueryHandler = (body: {
  readonly queryType: string;
  readonly payload: Record<string, unknown>;
}) => unknown;

type CommandHandler = (body: {
  readonly commandType: string;
  readonly payload: Record<string, unknown>;
}) => unknown;

function stubApi(options: {
  readonly onQuery?: QueryHandler;
  readonly onCommand?: CommandHandler;
  readonly permissionCodes?: readonly string[];
}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/v1/auth/session")) {
      return jsonResponse({
        ok: true,
        data: {
          sessionId: "session-1",
          user: TEST_USER,
          permissionCodes: options.permissionCodes ?? [
            "platform.workflows.read",
            "platform.approvals.read",
          ],
        },
        correlationId: "corr-session",
      });
    }
    if (url.includes("/api/v1/queries")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        queryType: string;
        payload: Record<string, unknown>;
      };
      const data = options.onQuery?.(body) ?? [];
      return jsonResponse({ ok: true, data, correlationId: "corr-q" });
    }
    if (url.includes("/api/v1/commands")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        commandType: string;
        payload: Record<string, unknown>;
      };
      const data = options.onCommand?.(body) ?? {};
      return jsonResponse({ ok: true, data, correlationId: "corr-c" });
    }
    return jsonResponse({ ok: true, data: {}, correlationId: "corr-x" });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderWorkflow() {
  return render(
    <MemoryRouter>
      <SessionProvider>
        <WorkflowPage />
      </SessionProvider>
    </MemoryRouter>,
  );
}

function renderApprovals() {
  return render(
    <MemoryRouter>
      <SessionProvider>
        <WorkspaceUiProvider>
          <ApprovalsPage />
        </WorkspaceUiProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("WorkflowPage (RC6.3)", () => {
  it("loads definitions and instances from operator queries", async () => {
    seedStoredSession();
    const fetchMock = stubApi({
      onQuery: ({ queryType }) => {
        if (queryType === "workflow.ListDefinitions") {
          return [
            {
              id: "def-1",
              code: "sales_order",
              name: "Sales Order",
              entityType: "sales_order",
              version: 1,
              isActive: true,
            },
          ];
        }
        if (queryType === "workflow.ListInstances") {
          return [
            {
              id: "inst-1",
              workflowDefinitionId: "def-1",
              subjectType: "sales_order",
              subjectId: "SO-1",
              statusProjection: "draft",
              instanceStatus: "running",
              startedAt: "2026-07-18T00:00:00.000Z",
              stageEnteredAt: "2026-07-18T00:00:00.000Z",
              completedAt: null,
            },
          ];
        }
        return [];
      },
    });

    const screen = renderWorkflow();
    expect(await screen.findByText(/Sales Order · sales_order SO-1/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Definitions/i }));
    expect(await screen.findByText(/Sales Order \(sales_order\)/)).toBeTruthy();

    const queryCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/api/v1/queries"),
    );
    expect(queryCalls.length).toBeGreaterThanOrEqual(2);
    const bodies = queryCalls.map((c) =>
      JSON.parse(String((c[1] as RequestInit).body)),
    );
    expect(bodies.some((b) => b.queryType === "workflow.ListDefinitions")).toBe(
      true,
    );
    expect(bodies.some((b) => b.queryType === "workflow.ListInstances")).toBe(
      true,
    );
  });

  it("loads transitions and tasks when an instance is selected", async () => {
    seedStoredSession();
    stubApi({
      onQuery: ({ queryType }) => {
        if (queryType === "workflow.ListDefinitions") {
          return [
            {
              id: "def-1",
              code: "sales_order",
              name: "Sales Order",
              entityType: "sales_order",
              version: 1,
              isActive: true,
            },
          ];
        }
        if (queryType === "workflow.ListInstances") {
          return [
            {
              id: "inst-1",
              workflowDefinitionId: "def-1",
              subjectType: "sales_order",
              subjectId: "SO-1",
              statusProjection: "draft",
              instanceStatus: "running",
              startedAt: "2026-07-18T00:00:00.000Z",
              stageEnteredAt: "2026-07-18T00:00:00.000Z",
              completedAt: null,
            },
          ];
        }
        if (queryType === "workflow.ListAvailableTransitions") {
          return [
            {
              id: "tr-1",
              code: "submit",
              fromStageId: "s1",
              toStageId: "s2",
              requiresApprovalType: null,
            },
          ];
        }
        if (queryType === "workflow.ListTasks") {
          return [
            {
              id: "task-1",
              stageId: "s1",
              teamId: null,
              userId: "user-9",
              assignedAt: "2026-07-18T01:00:00.000Z",
            },
          ];
        }
        return [];
      },
    });

    const screen = renderWorkflow();
    const row = await screen.findByRole("button", {
      name: /Sales Order · sales_order SO-1/,
    });
    fireEvent.click(row);
    expect(await screen.findByText("Available transitions")).toBeTruthy();
    expect(await screen.findByText("submit")).toBeTruthy();
    expect(await screen.findByText(/User user-9/)).toBeTruthy();
  });

  it("surfaces Policy forbidden errors without fixture fallback", async () => {
    seedStoredSession();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/v1/auth/session")) {
          return jsonResponse({
            ok: true,
            data: {
              sessionId: "session-1",
              user: TEST_USER,
              permissionCodes: ["platform.workflows.read"],
            },
            correlationId: "corr-session",
          });
        }
        if (url.includes("/api/v1/queries")) {
          return jsonResponse(
            errorBody("policy_denied", "Not permitted"),
            403,
          );
        }
        return jsonResponse({ ok: true, data: {}, correlationId: "corr-x" });
      }),
    );

    const screen = renderWorkflow();
    expect(await screen.findByText(/Forbidden by Policy/)).toBeTruthy();
    expect(screen.queryByText(/SO-22901 fulfillment/)).toBeNull();
  });

  it("shows empty state when backend returns no instances", async () => {
    seedStoredSession();
    stubApi({
      onQuery: () => [],
    });
    const screen = renderWorkflow();
    expect(await screen.findByText("No workflow instances")).toBeTruthy();
  });
});

describe("ApprovalsPage (RC6.3)", () => {
  it("loads approval requests and submits DecideRequest", async () => {
    seedStoredSession();
    const fetchMock = stubApi({
      onQuery: ({ queryType }) => {
        if (queryType === "approval.ListRequests") {
          return [
            {
              id: "apr-1",
              type: "quote_discount",
              subjectType: "quote",
              subjectId: "Q-1",
              status: "under_review",
              submittedByUserId: "user-2",
              reviewerUserId: "user-1",
              createdAt: "2026-07-18T00:00:00.000Z",
              updatedAt: "2026-07-18T00:00:00.000Z",
              decisionReason: null,
            },
          ];
        }
        return [];
      },
      onCommand: ({ commandType, payload }) => {
        expect(commandType).toBe("approval.DecideRequest");
        return {
          id: payload.requestId,
          type: "quote_discount",
          subjectType: "quote",
          subjectId: "Q-1",
          status: payload.decision === "approved" ? "approved" : "rejected",
          submittedByUserId: "user-2",
          reviewerUserId: "user-1",
          createdAt: "2026-07-18T00:00:00.000Z",
          updatedAt: "2026-07-18T00:01:00.000Z",
          decisionReason: null,
        };
      },
    });

    const screen = renderApprovals();
    expect(await screen.findByText(/quote_discount · quote Q-1/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => {
      const commandCalls = fetchMock.mock.calls.filter((c) =>
        String(c[0]).includes("/api/v1/commands"),
      );
      expect(commandCalls.length).toBe(1);
    });
    expect(await screen.findByText("approved")).toBeTruthy();
  });

  it("surfaces Policy forbidden on list without fixture queue", async () => {
    seedStoredSession();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/v1/auth/session")) {
          return jsonResponse({
            ok: true,
            data: {
              sessionId: "session-1",
              user: TEST_USER,
              permissionCodes: ["platform.approvals.read"],
            },
            correlationId: "corr-session",
          });
        }
        if (url.includes("/api/v1/queries")) {
          return jsonResponse(
            errorBody("policy_denied", "Not permitted"),
            403,
          );
        }
        return jsonResponse({ ok: true, data: {}, correlationId: "corr-x" });
      }),
    );

    const screen = renderApprovals();
    expect(await screen.findByText(/Forbidden by Policy/)).toBeTruthy();
    expect(screen.queryByText(/Discount exception/)).toBeNull();
  });
});
