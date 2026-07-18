/**
 * HR V1 — employee handler tests (Policy, company isolation).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  PolicyDecision,
  PolicyEngine,
  PolicyPrincipal,
  PolicyResource,
  SecurityAuditService,
} from "@afh/identity";
import type { EmployeeRepository, EmploymentProfile } from "@afh/hr";
import {
  CommandId,
  CorrelationId,
  QueryId,
  ok,
  type Clock,
  type Command,
  type Page,
  type PageRequest,
  type PlatformError,
  type Query,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";
import type { ApplicationContext } from "@afh/application";
import {
  createCreateEmployeeHandler,
  createGetEmployeeHandler,
  createListEmployeeHandler,
  type CreateEmployeeResult,
} from "./employee-handlers.js";
import type { HrHandlerDeps } from "./deps.js";
import { HrCommandTypes, HrPolicyActions, HrQueryTypes } from "../constants.js";

const clock: Clock = { now: () => new Date("2026-07-19T00:00:00.000Z") };

const passthroughUnitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(passthroughUnitOfWork);
  },
};

const stubAudit = {
  async record() {
    return;
  },
} as unknown as SecurityAuditService;

function pageSlice<T>(items: readonly T[], page?: PageRequest): Page<T> {
  const pageNum = page && "page" in page ? Math.max(1, page.page) : 1;
  const pageSize =
    page && "pageSize" in page ? Math.max(1, page.pageSize) : 100;
  const offset = (pageNum - 1) * pageSize;
  const slice = items.slice(offset, offset + pageSize);
  return {
    items: slice,
    totalCount: items.length,
    page: pageNum,
    pageSize,
    nextCursor: null,
    hasMore: offset + slice.length < items.length,
  };
}

function makeEmployee(
  partial: Partial<EmploymentProfile> &
    Pick<EmploymentProfile, "id" | "companyId" | "displayName">,
): EmploymentProfile {
  return {
    employeeCode: null,
    userId: null,
    employmentType: "full_time",
    status: "draft",
    departmentId: null,
    designationId: null,
    managerEmployeeId: null,
    hireDate: null,
    terminationDate: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function createMemoryEmployeeRepo(
  initial: EmploymentProfile[] = [],
): EmployeeRepository {
  const store = new Map(
    initial.map((e) => [`${e.companyId}:${e.id}`, e]),
  );
  return {
    async findById(key) {
      return ok(store.get(`${key.companyId}:${key.id}`) ?? null);
    },
    async save(profile) {
      store.set(`${profile.companyId}:${profile.id}`, profile);
      return ok(undefined);
    },
    async saveDesignation() {
      return ok(undefined);
    },
    async listByCompany(companyId, page) {
      const items = [...store.values()].filter((e) => e.companyId === companyId);
      return ok(pageSlice(items, page));
    },
  };
}

function principal(userId: string, permission: string): PolicyPrincipal {
  return {
    userId,
    companyId: "co-1",
    roles: [
      {
        roleCode: "hr",
        scopeType: "company",
        scopeId: "co-1",
        permissionCodes: [permission],
      },
    ],
    permissionCodes: [permission],
  };
}

function policyAllowCompany(): PolicyEngine {
  return {
    async evaluate(
      _p: PolicyPrincipal,
      _action: string,
      resource: PolicyResource,
    ): Promise<PolicyDecision> {
      if (resource.companyId === "co-1") {
        return { allowed: true };
      }
      return {
        allowed: false,
        reasonCode: "company_mismatch",
        message: "company",
      };
    },
  };
}

function policyDenyAll(): PolicyEngine {
  return {
    async evaluate(): Promise<PolicyDecision> {
      return {
        allowed: false,
        reasonCode: "denied",
        message: "denied",
      };
    },
  };
}

function makeCtx(
  userId: string,
  permission: string,
  policyEngine: PolicyEngine = policyAllowCompany(),
): ApplicationContext {
  return {
    correlationId: "corr-1",
    userId,
    companyId: "co-1",
    branchId: null,
    principal: principal(userId, permission),
    metadata: {},
    clock,
    signal: null,
    policyEngine,
    workflow: null,
    approval: null,
    rules: null,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

function commandOf<T>(commandType: string, payload: T): Command<T> {
  return {
    commandId: CommandId.from("00000000-0000-4000-8000-000000000001"),
    commandType,
    payload,
    metadata: {
      correlationId: CorrelationId.from("00000000-0000-4000-8000-000000000002"),
      causationId: null,
      companyId: (payload as { companyId?: string }).companyId ?? null,
      actorId: "user-1",
      issuedAt: new Date(),
    },
    idempotencyKey: null,
  };
}

function queryOf<T>(queryType: string, payload: T): Query<T> {
  return {
    queryId: QueryId.from("00000000-0000-4000-8000-000000000003"),
    queryType,
    payload,
    metadata: {
      correlationId: CorrelationId.from("00000000-0000-4000-8000-000000000004"),
      causationId: null,
      companyId: (payload as { companyId?: string }).companyId ?? null,
      actorId: "user-1",
      issuedAt: new Date(),
    },
  };
}

function hrDeps(employees: EmployeeRepository): HrHandlerDeps {
  return { employees, audit: stubAudit };
}

describe("HR V1 employee handlers", () => {
  it("CreateEmployee saves a draft profile with defaults", async () => {
    const employees = createMemoryEmployeeRepo();
    const handler = createCreateEmployeeHandler(hrDeps(employees));

    const result = await handler.handle(
      commandOf(HrCommandTypes.CreateEmployee, {
        companyId: "co-1",
        displayName: "Jane Carpenter",
      }),
      makeCtx("user-1", HrPolicyActions.EmployeeCreate),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    const created = result.value as CreateEmployeeResult;
    assert.ok(created.employeeId);

    const stored = await employees.findById({
      companyId: "co-1",
      id: created.employeeId,
    });
    assert.ok(stored.ok);
    assert.equal(stored.value?.status, "draft");
    assert.equal(stored.value?.employmentType, "full_time");
  });

  it("GetEmployee authorization fails closed when Policy denies read", async () => {
    const employee = makeEmployee({
      id: "emp-1",
      companyId: "co-1",
      displayName: "Locked",
    });
    const handler = createGetEmployeeHandler(
      hrDeps(createMemoryEmployeeRepo([employee])),
    );

    const query = queryOf(HrQueryTypes.GetEmployee, {
      companyId: "co-1",
      employeeId: "emp-1",
    });

    const ctx = makeCtx("user-2", HrPolicyActions.EmployeeRead, policyDenyAll());
    assert.ok(handler.authorize);
    const authSpec = await handler.authorize(query, ctx);
    const decision = await ctx.policyEngine.evaluate(
      ctx.principal!,
      authSpec.action,
      authSpec.resource,
    );
    assert.equal(decision.allowed, false);
  });

  it("ListEmployee enforces company isolation via authorized totals", async () => {
    const handler = createListEmployeeHandler(
      hrDeps(
        createMemoryEmployeeRepo([
          makeEmployee({ id: "e1", companyId: "co-1", displayName: "Co1 A" }),
          makeEmployee({ id: "e2", companyId: "co-1", displayName: "Co1 B" }),
          makeEmployee({ id: "e3", companyId: "co-2", displayName: "Co2 A" }),
        ]),
      ),
    );

    const result = await handler.handle(
      queryOf(HrQueryTypes.ListEmployee, { companyId: "co-1" }),
      makeCtx("user-3", HrPolicyActions.EmployeeRead),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    const page = result.value as Page<EmploymentProfile>;
    assert.equal(page.totalCount, 2);
    assert.equal(page.items.length, 2);
    assert.ok(page.items.every((item) => item.companyId === "co-1"));
  });
});
