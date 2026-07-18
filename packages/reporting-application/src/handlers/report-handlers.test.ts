/**
 * Reporting V1 — handler tests (Policy, company isolation, run execution).
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
import type {
  ReportDefinition,
  ReportDefinitionRepository,
  ReportExecution,
  ReportExecutionRepository,
} from "@afh/reporting";
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
  createGetReportDefinitionHandler,
  createListReportDefinitionHandler,
  createRunReportHandler,
  type RunReportResult,
} from "./report-handlers.js";
import type { ReportingHandlerDeps } from "./deps.js";
import {
  ReportingCommandTypes,
  ReportingPolicyActions,
  ReportingQueryTypes,
} from "../constants.js";

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

function makeDefinition(
  partial: Partial<ReportDefinition> &
    Pick<ReportDefinition, "id" | "companyId" | "code" | "name">,
): ReportDefinition {
  return {
    description: null,
    status: "active",
    templateId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function createMemoryReportDefinitionRepo(
  initial: ReportDefinition[] = [],
): ReportDefinitionRepository {
  const store = new Map(
    initial.map((d) => [`${d.companyId ?? "_"}:${d.id}`, d]),
  );
  return {
    async findById(key) {
      return ok(store.get(`${key.companyId ?? "_"}:${key.id}`) ?? null);
    },
    async save(definition) {
      store.set(`${definition.companyId ?? "_"}:${definition.id}`, definition);
      return ok(undefined);
    },
    async list(companyId, page) {
      const items = [...store.values()].filter((d) => d.companyId === companyId);
      return ok(pageSlice(items, page));
    },
  };
}

function createMemoryReportExecutionRepo(): ReportExecutionRepository {
  const store = new Map<string, ReportExecution>();
  return {
    async findById(key) {
      return ok(store.get(`${key.companyId ?? "_"}:${key.id}`) ?? null);
    },
    async save(execution) {
      store.set(`${execution.companyId ?? "_"}:${execution.id}`, execution);
      return ok(undefined);
    },
    async listByDefinition(companyId, reportDefinitionId, page) {
      const items = [...store.values()].filter(
        (e) => e.companyId === companyId && e.reportDefinitionId === reportDefinitionId,
      );
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
        roleCode: "reporting",
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

function reportingDeps(
  reportDefinitions: ReportDefinitionRepository,
  reportExecutions: ReportExecutionRepository = createMemoryReportExecutionRepo(),
): ReportingHandlerDeps {
  return { reportDefinitions, reportExecutions, audit: stubAudit };
}

describe("Reporting V1 handlers", () => {
  it("RunReport creates a succeeded execution with an empty snapshot", async () => {
    const definition = makeDefinition({
      id: "rd-1",
      companyId: "co-1",
      code: "sales-summary",
      name: "Sales Summary",
    });
    const reportExecutions = createMemoryReportExecutionRepo();
    const handler = createRunReportHandler(
      reportingDeps(createMemoryReportDefinitionRepo([definition]), reportExecutions),
    );

    const result = await handler.handle(
      commandOf(ReportingCommandTypes.RunReport, {
        companyId: "co-1",
        reportDefinitionId: "rd-1",
      }),
      makeCtx("user-1", ReportingPolicyActions.ReportRun),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    const { executionId, status } = result.value as RunReportResult;
    assert.equal(status, "succeeded");

    const stored = await reportExecutions.findById({ companyId: "co-1", id: executionId });
    assert.ok(stored.ok);
    assert.equal(stored.value?.snapshotId, null);
    assert.equal(stored.value?.status, "succeeded");
  });

  it("RunReport fails when the report definition does not exist", async () => {
    const handler = createRunReportHandler(
      reportingDeps(createMemoryReportDefinitionRepo()),
    );

    const result = await handler.handle(
      commandOf(ReportingCommandTypes.RunReport, {
        companyId: "co-1",
        reportDefinitionId: "missing",
      }),
      makeCtx("user-1", ReportingPolicyActions.ReportRun),
    );
    assert.ok(!result.ok);
    assert.equal(result.error.code, "report_definition_not_found");
  });

  it("GetReportDefinition authorization fails closed when Policy denies read", async () => {
    const definition = makeDefinition({
      id: "rd-1",
      companyId: "co-1",
      code: "locked",
      name: "Locked",
    });
    const handler = createGetReportDefinitionHandler(
      reportingDeps(createMemoryReportDefinitionRepo([definition])),
    );

    const query = queryOf(ReportingQueryTypes.GetReportDefinition, {
      companyId: "co-1",
      reportDefinitionId: "rd-1",
    });

    const ctx = makeCtx("user-2", ReportingPolicyActions.ReportRead, policyDenyAll());
    assert.ok(handler.authorize);
    const authSpec = await handler.authorize(query, ctx);
    const decision = await ctx.policyEngine.evaluate(
      ctx.principal!,
      authSpec.action,
      authSpec.resource,
    );
    assert.equal(decision.allowed, false);
  });

  it("ListReportDefinition enforces company isolation via authorized totals", async () => {
    const handler = createListReportDefinitionHandler(
      reportingDeps(
        createMemoryReportDefinitionRepo([
          makeDefinition({ id: "d1", companyId: "co-1", code: "a", name: "A" }),
          makeDefinition({ id: "d2", companyId: "co-1", code: "b", name: "B" }),
          makeDefinition({ id: "d3", companyId: "co-2", code: "c", name: "C" }),
        ]),
      ),
    );

    const result = await handler.handle(
      queryOf(ReportingQueryTypes.ListReportDefinition, { companyId: "co-1" }),
      makeCtx("user-3", ReportingPolicyActions.ReportRead),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    const page = result.value as Page<ReportDefinition>;
    assert.equal(page.totalCount, 2);
    assert.equal(page.items.length, 2);
    assert.ok(page.items.every((item) => item.companyId === "co-1"));
  });
});
