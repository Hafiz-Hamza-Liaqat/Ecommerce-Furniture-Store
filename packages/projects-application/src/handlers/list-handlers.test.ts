/**
 * RC7.2f — Projects List* handler tests (Policy + authorized totals + paging).
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
import type { OutboxStore } from "@afh/persistence";
import type {
  Milestone,
  MilestoneRepository,
  Project,
  ProjectRepository,
  Task,
  TaskRepository,
} from "@afh/projects";
import {
  CorrelationId,
  QueryId,
  ok,
  type Clock,
  type ListQueryRequest,
  type Page,
  type PageRequest,
  type PlatformError,
  type Query,
  type Result,
  type UnitOfWork,
  type Validator,
} from "@afh/shared-kernel";
import type {
  ApplicationContext,
  AuthorizationSpec,
  QueryHandler,
} from "@afh/application";
import { createProjectApplication } from "../composition/composition-root.js";
import {
  createListMilestoneHandler,
  createListProjectHandler,
  createListTaskHandler,
} from "./list-handlers.js";
import {
  createGetMilestoneHandler,
  createGetProjectHandler,
  createGetTaskHandler,
} from "./query-handlers.js";
import type { ProjectHandlerDeps } from "./deps.js";
import {
  ProjectsCommandTypes,
  ProjectsPolicyActions,
  ProjectsQueryTypes,
} from "../constants.js";
import {
  listMilestoneQueryValidator,
  listProjectQueryValidator,
  listTaskQueryValidator,
} from "../validators/validators.js";

const clock: Clock = { now: () => new Date() };

const passthroughUnitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(passthroughUnitOfWork);
  },
};

const stubOutbox = {
  async enqueue() {
    return ok(undefined);
  },
  async listPending() {
    return ok([]);
  },
  async markPublished() {
    return ok(undefined);
  },
  async markFailed() {
    return ok(undefined);
  },
} as unknown as OutboxStore;

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

function emptyRepo(): never {
  return {
    async findById() {
      return ok(null);
    },
    async save() {
      return ok(undefined);
    },
    async remove() {
      return ok(undefined);
    },
    async listByCompany() {
      return ok(pageSlice([]));
    },
    async listByProject() {
      return ok(pageSlice([]));
    },
    async listChildren() {
      return ok([]);
    },
    async listMemberships() {
      return ok([]);
    },
    async saveMembership() {
      return ok(undefined);
    },
    async saveAssignment() {
      return ok(undefined);
    },
  } as never;
}

function makeProject(
  partial: Partial<Project> &
    Pick<Project, "id" | "companyId" | "code" | "name">,
): Project {
  return {
    projectType: "interior",
    status: "active",
    classification: "commercial",
    customerId: null,
    organizationId: null,
    siteAddressId: null,
    ownerUserId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeTask(
  partial: Partial<Task> & Pick<Task, "id" | "companyId" | "title">,
): Task {
  return {
    projectId: null,
    parentTaskId: null,
    code: null,
    description: null,
    status: "ready",
    priority: "normal",
    assigneeUserId: null,
    assigneeTeamId: null,
    dueAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeMilestone(
  partial: Partial<Milestone> &
    Pick<Milestone, "id" | "companyId" | "projectId" | "name">,
): Milestone {
  return {
    code: null,
    status: "planned",
    due: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function memoryProjectRepo(rows: Project[]): ProjectRepository {
  return {
    async findById(key) {
      return ok(
        rows.find((r) => r.companyId === key.companyId && r.id === key.id) ??
          null,
      );
    },
    async save() {
      return ok(undefined);
    },
    async remove() {
      return ok(undefined);
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function memoryTaskRepo(rows: Task[]): TaskRepository {
  return {
    async findById(key) {
      return ok(
        rows.find((r) => r.companyId === key.companyId && r.id === key.id) ??
          null,
      );
    },
    async save() {
      return ok(undefined);
    },
    async listByProject(companyId, projectId, page) {
      return ok(
        pageSlice(
          rows.filter(
            (r) => r.companyId === companyId && r.projectId === projectId,
          ),
          page,
        ),
      );
    },
    async listChildren() {
      return ok([]);
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function memoryMilestoneRepo(rows: Milestone[]): MilestoneRepository {
  return {
    async findById(key) {
      return ok(
        rows.find((r) => r.companyId === key.companyId && r.id === key.id) ??
          null,
      );
    },
    async save() {
      return ok(undefined);
    },
    async listByProject(companyId, projectId, page) {
      return ok(
        pageSlice(
          rows.filter(
            (r) => r.companyId === companyId && r.projectId === projectId,
          ),
          page,
        ),
      );
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function baseDeps(partial: {
  projects?: Project[];
  tasks?: Task[];
  milestones?: Milestone[];
}): ProjectHandlerDeps {
  return {
    projects: memoryProjectRepo(partial.projects ?? []),
    tasks: memoryTaskRepo(partial.tasks ?? []),
    milestones: memoryMilestoneRepo(partial.milestones ?? []),
    resources: emptyRepo(),
    teams: emptyRepo(),
    schedules: emptyRepo(),
    workItems: emptyRepo(),
    outbox: stubOutbox,
    audit: stubAudit,
  };
}

function principal(
  userId: string,
  permission: string,
  scopeType: "company" | "own" | "organization" = "company",
  scopeId: string | null = null,
): PolicyPrincipal {
  return {
    userId,
    companyId: "co-1",
    roles: [
      {
        roleCode: "pm",
        scopeType,
        scopeId,
        permissionCodes: [permission],
      },
    ],
    permissionCodes: [permission],
  };
}

function policyAllowCompanySelective(
  allowedIds: ReadonlySet<string>,
): PolicyEngine {
  return {
    async evaluate(
      _p: PolicyPrincipal,
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
      if (resource.id != null && allowedIds.has(resource.id)) {
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

function policyDenyAll(): PolicyEngine {
  return {
    async evaluate(): Promise<PolicyDecision> {
      return {
        allowed: false,
        reasonCode: "permission_denied",
        message: "denied",
      };
    },
  };
}

function policyThrow(): PolicyEngine {
  return {
    async evaluate(): Promise<PolicyDecision> {
      throw new Error("policy boom");
    },
  };
}

function ctx(args: {
  readonly userId: string;
  readonly permission: string;
  readonly policy?: PolicyEngine;
  readonly principal?: PolicyPrincipal | null;
  readonly scopeType?: "company" | "own" | "organization";
  readonly scopeId?: string | null;
}): ApplicationContext {
  return {
    correlationId: "corr-1",
    userId: args.userId,
    companyId: "co-1",
    branchId: null,
    principal:
      args.principal === undefined
        ? principal(
            args.userId,
            args.permission,
            args.scopeType ?? "company",
            args.scopeId ?? null,
          )
        : args.principal,
    metadata: {},
    clock,
    signal: null,
    policyEngine: args.policy ?? policyAllowCompanySelective(new Set()),
    workflow: null,
    approval: null,
    rules: null,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

function queryOf<T extends ListQueryRequest>(
  queryType: string,
  payload: T,
): Query<T> {
  return {
    queryId: QueryId.from("00000000-0000-4000-8000-000000000001"),
    queryType,
    payload,
    metadata: {
      correlationId: CorrelationId.from(
        "00000000-0000-4000-8000-000000000002",
      ),
      causationId: null,
      companyId: payload.companyId,
      actorId: "user-a",
      issuedAt: new Date(),
    },
  };
}

type Row = { readonly id: string };

type Suite = {
  readonly name: string;
  readonly queryType: string;
  readonly action: string;
  readonly validator: Validator<Query<ListQueryRequest>>;
  readonly createHandler: (
    deps: ProjectHandlerDeps,
  ) => QueryHandler<ListQueryRequest, Page<Row>>;
  readonly depsFor: (rows: readonly Row[]) => ProjectHandlerDeps;
  readonly owned: (id: string) => Row;
  readonly otherOwned: (id: string) => Row;
  readonly foreignCompany: (id: string) => Row;
  readonly searchable: (id: string) => Row;
  readonly filterable: (id: string) => Row;
  readonly sortableA: () => Row;
  readonly sortableB: () => Row;
  readonly sortField: string;
  readonly filterField: string;
  readonly filterValue: unknown;
  readonly searchNeedle: string;
};

const suites: Suite[] = [
  {
    name: "ListProject",
    queryType: ProjectsQueryTypes.ListProject,
    action: ProjectsPolicyActions.ProjectRead,
    validator: listProjectQueryValidator,
    createHandler:
      createListProjectHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ projects: rows as Project[] }),
    owned: (id) =>
      makeProject({
        id,
        companyId: "co-1",
        code: `P-${id}`,
        name: `Project ${id}`,
        organizationId: "org-a",
      }),
    otherOwned: (id) =>
      makeProject({
        id,
        companyId: "co-1",
        code: `P-${id}`,
        name: `Other ${id}`,
        organizationId: "org-b",
      }),
    foreignCompany: (id) =>
      makeProject({
        id,
        companyId: "co-2",
        code: "PX",
        name: "Foreign",
      }),
    searchable: (id) =>
      makeProject({
        id,
        companyId: "co-1",
        code: "WIDGET-PRJ",
        name: "Widget Renovation Project",
      }),
    filterable: (id) =>
      makeProject({
        id,
        companyId: "co-1",
        code: `P-${id}`,
        name: `Filtered ${id}`,
        status: "on_hold",
      }),
    sortableA: () =>
      makeProject({
        id: "a",
        companyId: "co-1",
        code: "Z-1",
        name: "Zebra",
      }),
    sortableB: () =>
      makeProject({
        id: "b",
        companyId: "co-1",
        code: "A-1",
        name: "Alpha",
      }),
    sortField: "name",
    filterField: "status",
    filterValue: "on_hold",
    searchNeedle: "Widget",
  },
  {
    name: "ListTask",
    queryType: ProjectsQueryTypes.ListTask,
    action: ProjectsPolicyActions.TaskRead,
    validator: listTaskQueryValidator,
    createHandler: createListTaskHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ tasks: rows as Task[] }),
    owned: (id) =>
      makeTask({
        id,
        companyId: "co-1",
        title: `Task ${id}`,
        code: `T-${id}`,
        assigneeTeamId: "team-a",
      }),
    otherOwned: (id) =>
      makeTask({
        id,
        companyId: "co-1",
        title: `Other ${id}`,
        code: `T-${id}`,
        assigneeTeamId: "team-b",
      }),
    foreignCompany: (id) =>
      makeTask({
        id,
        companyId: "co-2",
        title: "Foreign",
        code: "TX",
      }),
    searchable: (id) =>
      makeTask({
        id,
        companyId: "co-1",
        title: "Widget Cabinet Install",
        code: "WIDGET-T-99",
      }),
    filterable: (id) =>
      makeTask({
        id,
        companyId: "co-1",
        title: `Filtered ${id}`,
        code: `T-${id}`,
        status: "blocked",
      }),
    sortableA: () =>
      makeTask({
        id: "a",
        companyId: "co-1",
        title: "Zebra",
        code: "Z-1",
      }),
    sortableB: () =>
      makeTask({
        id: "b",
        companyId: "co-1",
        title: "Alpha",
        code: "A-1",
      }),
    sortField: "title",
    filterField: "status",
    filterValue: "blocked",
    searchNeedle: "Widget",
  },
  {
    name: "ListMilestone",
    queryType: ProjectsQueryTypes.ListMilestone,
    action: ProjectsPolicyActions.MilestoneRead,
    validator: listMilestoneQueryValidator,
    createHandler:
      createListMilestoneHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ milestones: rows as Milestone[] }),
    owned: (id) =>
      makeMilestone({
        id,
        companyId: "co-1",
        projectId: "proj-a",
        code: `M-${id}`,
        name: `Milestone ${id}`,
      }),
    otherOwned: (id) =>
      makeMilestone({
        id,
        companyId: "co-1",
        projectId: "proj-b",
        code: `M-${id}`,
        name: `Other ${id}`,
      }),
    foreignCompany: (id) =>
      makeMilestone({
        id,
        companyId: "co-2",
        projectId: "proj-x",
        code: "MX",
        name: "Foreign",
      }),
    searchable: (id) =>
      makeMilestone({
        id,
        companyId: "co-1",
        projectId: "proj-a",
        code: "WIDGET-MS",
        name: "Widget Handover Milestone",
      }),
    filterable: (id) =>
      makeMilestone({
        id,
        companyId: "co-1",
        projectId: "proj-a",
        code: `M-${id}`,
        name: `Filtered ${id}`,
        status: "missed",
      }),
    sortableA: () =>
      makeMilestone({
        id: "a",
        companyId: "co-1",
        projectId: "proj-a",
        code: "Z-1",
        name: "Zebra",
      }),
    sortableB: () =>
      makeMilestone({
        id: "b",
        companyId: "co-1",
        projectId: "proj-a",
        code: "A-1",
        name: "Alpha",
      }),
    sortField: "name",
    filterField: "status",
    filterValue: "missed",
    searchNeedle: "Widget",
  },
];

for (const suite of suites) {
  describe(`RC7.2f ${suite.name}`, () => {
    const allow = (...ids: string[]) =>
      policyAllowCompanySelective(new Set(ids));

    const appCtx = (policy?: PolicyEngine) =>
      ctx({
        userId: "user-a",
        permission: suite.action,
        ...(policy !== undefined ? { policy } : {}),
      });

    it("happy path returns authorized rows", async () => {
      const rows = [
        suite.owned("1"),
        suite.otherOwned("2"),
        suite.owned("3"),
      ];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(allow("1", "3")),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["1", "3"],
      );
      assert.equal(result.value.totalCount, 2);
    });

    it("Policy deny omits unauthorized rows", async () => {
      const rows = [suite.owned("1"), suite.otherOwned("2")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(policyDenyAll()),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.value.items.length, 0);
      assert.equal(result.value.totalCount, 0);
    });

    it("company isolation excludes foreign company candidates", async () => {
      const rows = [suite.owned("1"), suite.foreignCompany("x")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(allow("1", "x")),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["1"],
      );
      assert.equal(result.value.totalCount, 1);
    });

    it("IDOR negative: leaked foreign-company row is Policy-denied", async () => {
      const foreign = suite.foreignCompany("leak");
      const deps = suite.depsFor([suite.owned("1")]);
      const leakingList = async (
        _companyId: string,
        page?: PageRequest,
      ) => ok(pageSlice([suite.owned("1"), foreign] as never[], page));
      if (suite.name === "ListProject") {
        (deps.projects as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else if (suite.name === "ListTask") {
        (deps.tasks as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else {
        (deps.milestones as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      }
      const handler = suite.createHandler(deps);
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(allow("1", "leak")),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.ok(!result.value.items.some((r) => r.id === "leak"));
    });

    it("authorized totalCount never equals raw repository candidate total when scopes filter", async () => {
      const rows = [
        suite.owned("1"),
        suite.otherOwned("2"),
        suite.owned("3"),
        suite.otherOwned("4"),
      ];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(allow("1", "3")),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.value.totalCount, 2);
      assert.notEqual(result.value.totalCount, rows.length);
    });

    it("empty authorized result when no rows match Policy", async () => {
      const rows = [suite.owned("1"), suite.otherOwned("2")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(allow()),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.value.items.length, 0);
      assert.equal(result.value.totalCount, 0);
    });

    it("pagination pages over the authorized sequence", async () => {
      const rows = [
        suite.owned("1"),
        suite.owned("2"),
        suite.owned("3"),
      ];
      const handler = suite.createHandler(suite.depsFor(rows));
      const page1 = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: { page: { page: 1, pageSize: 2 } },
        }),
        appCtx(allow("1", "2", "3")),
      );
      assert.equal(page1.ok, true);
      if (!page1.ok) return;
      assert.equal(page1.value.items.length, 2);
      assert.equal(page1.value.totalCount, 3);
      assert.equal(page1.value.hasMore, true);

      const page2 = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: { page: { page: 2, pageSize: 2 } },
        }),
        appCtx(allow("1", "2", "3")),
      );
      assert.equal(page2.ok, true);
      if (!page2.ok) return;
      assert.equal(page2.value.items.length, 1);
      assert.equal(page2.value.totalCount, 3);
    });

    it("sorting applies allow-listed field order", async () => {
      const rows = [suite.sortableA(), suite.sortableB()];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: {
            sort: [{ field: suite.sortField, direction: "asc" }],
          },
        }),
        appCtx(allow("a", "b")),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["b", "a"],
      );
    });

    it("filtering applies allow-listed field", async () => {
      const rows = [suite.owned("1"), suite.filterable("2")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: {
            filters: [
              {
                field: suite.filterField,
                operator: "eq",
                value: suite.filterValue,
              },
            ],
          },
        }),
        appCtx(allow("1", "2")),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["2"],
      );
      assert.equal(result.value.totalCount, 1);
    });

    it("search q matches module text fields (application-bounded, not Search module)", async () => {
      const rows = [suite.owned("1"), suite.searchable("2")];
      const handler = suite.createHandler(suite.depsFor(rows));
      const result = await handler.handle(
        queryOf(suite.queryType, {
          companyId: "co-1",
          q: suite.searchNeedle,
        }),
        appCtx(allow("1", "2")),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(
        result.value.items.map((r) => r.id),
        ["2"],
      );
    });

    it("invalid sort field fails validation (no silent fallback)", () => {
      const outcome = suite.validator.validate(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: {
            sort: [{ field: "not_a_real_field", direction: "asc" }],
          },
        }),
      );
      assert.ok(!(outcome instanceof Promise));
      assert.equal(outcome.valid, false);
      assert.equal(outcome.violations[0]?.code, "list_sort_field_not_allowed");
    });

    it("invalid filter field fails validation", () => {
      const outcome = suite.validator.validate(
        queryOf(suite.queryType, {
          companyId: "co-1",
          criteria: {
            filters: [
              { field: "not_a_real_field", operator: "eq", value: "x" },
            ],
          },
        }),
      );
      assert.ok(!(outcome instanceof Promise));
      assert.equal(outcome.valid, false);
      assert.equal(
        outcome.violations[0]?.code,
        "list_filter_field_not_allowed",
      );
    });

    it("missing principal fails closed", async () => {
      const handler = suite.createHandler(suite.depsFor([suite.owned("1")]));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        ctx({
          userId: "user-a",
          permission: suite.action,
          principal: null,
          policy: allow("1"),
        }),
      );
      assert.equal(result.ok, false);
    });

    it("Policy evaluation failure fails closed", async () => {
      const handler = suite.createHandler(suite.depsFor([suite.owned("1")]));
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(policyThrow()),
      );
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.error.code, "policy_evaluation_failed");
    });

    it("AuthorizationSpec uses collection principalListScope gate", async () => {
      const handler = suite.createHandler(suite.depsFor([]));
      assert.ok(handler.authorize);
      const spec = (await handler.authorize!(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(allow()),
      )) as AuthorizationSpec;
      assert.equal(spec.action, suite.action);
      assert.equal(spec.resource.companyId, "co-1");
      assert.equal(spec.resource.id, null);
    });
  });
}

describe("RC7.2f composition regression — Get and lifecycle unchanged", () => {
  const projects = [
    makeProject({
      id: "proj-1",
      companyId: "co-1",
      code: "PRJ-1",
      name: "Cafe Fitout",
    }),
  ];
  const tasks = [
    makeTask({
      id: "task-1",
      companyId: "co-1",
      title: "Install cabinetry",
      projectId: "proj-1",
    }),
  ];
  const milestones = [
    makeMilestone({
      id: "ms-1",
      companyId: "co-1",
      projectId: "proj-1",
      name: "Handover",
    }),
  ];
  const deps = baseDeps({ projects, tasks, milestones });

  it("existing Get handlers still behave identically after List registration", async () => {
    const app = createProjectApplication(deps);
    assert.ok(app.handlers.resolveQuery(ProjectsQueryTypes.GetProject));
    assert.ok(app.handlers.resolveQuery(ProjectsQueryTypes.GetTask));
    assert.ok(app.handlers.resolveQuery(ProjectsQueryTypes.GetMilestone));
    assert.ok(app.handlers.resolveQuery(ProjectsQueryTypes.ListProject));
    assert.ok(app.handlers.resolveQuery(ProjectsQueryTypes.ListTask));
    assert.ok(app.handlers.resolveQuery(ProjectsQueryTypes.ListMilestone));

    const getCtx = ctx({
      userId: "user-a",
      permission: ProjectsPolicyActions.ProjectRead,
      policy: {
        async evaluate() {
          return { allowed: true };
        },
      },
    });

    const getProject = createGetProjectHandler(deps);
    const projectResult = await getProject.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000010"),
        queryType: ProjectsQueryTypes.GetProject,
        payload: { companyId: "co-1", projectId: "proj-1" },
        metadata: {
          correlationId: CorrelationId.from(
            "00000000-0000-4000-8000-000000000011",
          ),
          causationId: null,
          companyId: "co-1",
          actorId: "user-a",
          issuedAt: new Date(),
        },
      },
      getCtx,
    );
    assert.equal(projectResult.ok, true);
    if (!projectResult.ok) return;
    assert.equal(projectResult.value.id, "proj-1");

    const getTask = createGetTaskHandler(deps);
    const taskResult = await getTask.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000012"),
        queryType: ProjectsQueryTypes.GetTask,
        payload: { companyId: "co-1", taskId: "task-1" },
        metadata: {
          correlationId: CorrelationId.from(
            "00000000-0000-4000-8000-000000000013",
          ),
          causationId: null,
          companyId: "co-1",
          actorId: "user-a",
          issuedAt: new Date(),
        },
      },
      getCtx,
    );
    assert.equal(taskResult.ok, true);
    if (!taskResult.ok) return;
    assert.equal(taskResult.value.id, "task-1");

    const getMilestone = createGetMilestoneHandler(deps);
    const milestoneResult = await getMilestone.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000014"),
        queryType: ProjectsQueryTypes.GetMilestone,
        payload: { companyId: "co-1", milestoneId: "ms-1" },
        metadata: {
          correlationId: CorrelationId.from(
            "00000000-0000-4000-8000-000000000015",
          ),
          causationId: null,
          companyId: "co-1",
          actorId: "user-a",
          issuedAt: new Date(),
        },
      },
      getCtx,
    );
    assert.equal(milestoneResult.ok, true);
    if (!milestoneResult.ok) return;
    assert.equal(milestoneResult.value.id, "ms-1");
  });

  it("existing Create/Update/Lifecycle command handlers remain registered", () => {
    const app = createProjectApplication(deps);
    const required = [
      ProjectsCommandTypes.CreateProject,
      ProjectsCommandTypes.UpdateProject,
      ProjectsCommandTypes.ArchiveProject,
      ProjectsCommandTypes.CreateTask,
      ProjectsCommandTypes.UpdateTask,
      ProjectsCommandTypes.AssignTask,
      ProjectsCommandTypes.CompleteTask,
      ProjectsCommandTypes.CreateMilestone,
      ProjectsCommandTypes.UpdateMilestone,
      ProjectsCommandTypes.AssignResource,
      ProjectsCommandTypes.ReleaseResource,
      ProjectsCommandTypes.UpdateSchedule,
    ];
    for (const type of required) {
      assert.ok(
        app.handlers.resolveCommand(type),
        `missing command handler ${type}`,
      );
    }
  });
});
