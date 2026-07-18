/**
 * RC7.1 — bounded authorized scan tests (ADR D56).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  PolicyDecision,
  PolicyEngine,
  PolicyPrincipal,
  PolicyResource,
} from "@afh/identity";
import {
  ok,
  type Clock,
  type PlatformError,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";
import {
  buildAuthorizedListPage,
  LIST_MAX_CANDIDATE_SCAN,
  type ApplicationContext,
} from "../index.js";

type Row = {
  readonly id: string;
  readonly companyId: string;
  readonly ownerUserId: string | null;
};

const clock: Clock = { now: () => new Date() };

const passthroughUnitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(passthroughUnitOfWork);
  },
};

function principal(userId: string): PolicyPrincipal {
  return {
    userId,
    companyId: "co-1",
    roles: [
      {
        roleCode: "viewer",
        scopeType: "own",
        scopeId: null,
        permissionCodes: ["demo.items.read"],
      },
    ],
    permissionCodes: ["demo.items.read"],
  };
}

function policyAllowOwn(): PolicyEngine {
  return {
    async evaluate(
      p: PolicyPrincipal,
      _action: string,
      resource: PolicyResource,
    ): Promise<PolicyDecision> {
      if (resource.companyId !== "co-1") {
        return {
          allowed: false,
          reasonCode: "company_mismatch",
          message: "company",
        };
      }
      if (resource.ownerUserId === p.userId) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reasonCode: "scope_mismatch",
        message: "scope",
      };
    },
  };
}

function ctx(userId: string): ApplicationContext {
  return {
    correlationId: "corr-1",
    userId,
    companyId: "co-1",
    branchId: null,
    principal: principal(userId),
    metadata: {},
    clock,
    signal: null,
    policyEngine: policyAllowOwn(),
    workflow: null,
    approval: null,
    rules: null,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

describe("RC7.1 buildAuthorizedListPage", () => {
  it("sets totalCount to authorized rows only — never repository candidate count", async () => {
    const user = "user-a";
    const candidates: Row[] = [
      { id: "1", companyId: "co-1", ownerUserId: "user-a" },
      { id: "2", companyId: "co-1", ownerUserId: "user-b" },
      { id: "3", companyId: "co-1", ownerUserId: "user-a" },
      { id: "4", companyId: "co-1", ownerUserId: "user-b" },
    ];

    const page = await buildAuthorizedListPage<Row>({
      ctx: ctx(user),
      action: "demo.items.read",
      resourceType: "demo.item",
      request: {
        companyId: "co-1",
        criteria: { page: { page: 1, pageSize: 10 } },
      },
      toScope: (r: Row) => ({
        id: r.id,
        companyId: r.companyId,
        ownerUserId: r.ownerUserId,
      }),
      fetchCandidates: async ({ offset, limit }) =>
        ok(candidates.slice(offset, offset + limit)),
    });

    assert.equal(page.ok, true);
    if (!page.ok) return;
    assert.equal(page.value.totalCount, 2, "authorized total, not repo 4");
    assert.deepEqual(
      page.value.items.map((r: Row) => r.id),
      ["1", "3"],
    );
  });

  it("pages over the authorized sequence", async () => {
    const candidates: Row[] = Array.from({ length: 6 }, (_, i) => ({
      id: String(i + 1),
      companyId: "co-1",
      ownerUserId: i % 2 === 0 ? "user-a" : "user-b",
    }));

    const page = await buildAuthorizedListPage<Row>({
      ctx: ctx("user-a"),
      action: "demo.items.read",
      resourceType: "demo.item",
      request: {
        companyId: "co-1",
        criteria: { page: { page: 2, pageSize: 2 } },
      },
      toScope: (r: Row) => ({
        id: r.id,
        companyId: r.companyId,
        ownerUserId: r.ownerUserId,
      }),
      fetchCandidates: async ({ offset, limit }) =>
        ok(candidates.slice(offset, offset + limit)),
      batchSize: 2,
    });

    assert.equal(page.ok, true);
    if (!page.ok) return;
    assert.equal(page.value.totalCount, 3);
    assert.deepEqual(
      page.value.items.map((r: Row) => r.id),
      ["5"],
    );
    assert.equal(page.value.hasMore, false);
  });

  it("fails closed when candidate scan exceeds safety ceiling", async () => {
    const page = await buildAuthorizedListPage<Row>({
      ctx: ctx("user-a"),
      action: "demo.items.read",
      resourceType: "demo.item",
      request: { companyId: "co-1" },
      toScope: (r: Row) => ({
        id: r.id,
        companyId: r.companyId,
        ownerUserId: r.ownerUserId,
      }),
      maxCandidateScan: 3,
      batchSize: 2,
      fetchCandidates: async ({ offset, limit }) => {
        const items: Row[] = [];
        for (let i = 0; i < limit; i += 1) {
          items.push({
            id: String(offset + i),
            companyId: "co-1",
            ownerUserId: "user-a",
          });
        }
        return ok(items);
      },
    });

    assert.equal(page.ok, false);
    if (page.ok) return;
    assert.equal(page.error.code, "list_scan_ceiling");
    assert.ok(LIST_MAX_CANDIDATE_SCAN >= 3);
  });
});

describe("RC7.1 public export reuse sketch", () => {
  it("exposes buildAuthorizedListPage for module handlers", () => {
    assert.equal(typeof buildAuthorizedListPage, "function");
  });
});
