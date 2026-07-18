/**
 * RC7.2g — Service List* handler tests (Policy + authorized totals + paging).
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
  Appointment,
  AppointmentRepository,
  ServiceRequest,
  ServiceRequestRepository,
  TechnicianAssignmentReference,
  TechnicianAssignmentRepository,
  WorkOrder,
  WorkOrderRepository,
} from "@afh/service";
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
import { createServiceApplication } from "../composition/composition-root.js";
import {
  createListAppointmentHandler,
  createListServiceRequestHandler,
  createListTechnicianAssignmentHandler,
  createListWorkOrderHandler,
} from "./list-handlers.js";
import {
  createGetAppointmentHandler,
  createGetServiceRequestHandler,
  createGetTechnicianAssignmentHandler,
  createGetWorkOrderHandler,
} from "./query-handlers.js";
import type { ServiceHandlerDeps } from "./deps.js";
import {
  ServiceCommandTypes,
  ServicePolicyActions,
  ServiceQueryTypes,
} from "../constants.js";
import {
  listAppointmentQueryValidator,
  listServiceRequestQueryValidator,
  listTechnicianAssignmentQueryValidator,
  listWorkOrderQueryValidator,
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

function makeServiceRequest(
  partial: Partial<ServiceRequest> &
    Pick<ServiceRequest, "id" | "companyId" | "number" | "title">,
): ServiceRequest {
  return {
    description: null,
    status: "open",
    priority: "normal",
    category: null,
    customerId: null,
    crmContactId: null,
    crmAccountId: null,
    projectId: null,
    salesOrderId: null,
    siteAddressId: null,
    requestedByUserId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeWorkOrder(
  partial: Partial<WorkOrder> & Pick<WorkOrder, "id" | "companyId" | "number">,
): WorkOrder {
  return {
    status: "draft",
    serviceRequestId: null,
    workType: null,
    projectId: null,
    siteAddressId: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeAppointment(
  partial: Partial<Appointment> & Pick<Appointment, "id" | "companyId">,
): Appointment {
  return {
    status: "scheduled",
    window: {
      startAt: "2026-01-01T09:00:00.000Z",
      endAt: "2026-01-01T10:00:00.000Z",
      timezone: null,
    },
    serviceRequestId: null,
    workOrderId: null,
    projectId: null,
    siteAddressId: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeAssignment(
  partial: Partial<TechnicianAssignmentReference> &
    Pick<TechnicianAssignmentReference, "assignmentId" | "companyId">,
): TechnicianAssignmentReference {
  return {
    workOrderId: null,
    appointmentId: null,
    technician: {
      employeeId: "emp-1",
      companyId: partial.companyId,
      userId: null,
      displayName: null,
    },
    team: null,
    assignedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function memoryServiceRequestRepo(
  rows: ServiceRequest[],
): ServiceRequestRepository {
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
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function memoryWorkOrderRepo(rows: WorkOrder[]): WorkOrderRepository {
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
    async saveLine() {
      return ok(undefined);
    },
    async listLines() {
      return ok([]);
    },
    async listByServiceRequest(companyId, serviceRequestId, page) {
      return ok(
        pageSlice(
          rows.filter(
            (r) =>
              r.companyId === companyId &&
              r.serviceRequestId === serviceRequestId,
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

function memoryAppointmentRepo(rows: Appointment[]): AppointmentRepository {
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
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function memoryTechnicianAssignmentRepo(
  rows: TechnicianAssignmentReference[],
): TechnicianAssignmentRepository {
  return {
    async findById(key) {
      return ok(
        rows.find(
          (r) => r.companyId === key.companyId && r.assignmentId === key.id,
        ) ?? null,
      );
    },
    async save() {
      return ok(undefined);
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function baseDeps(partial: {
  serviceRequests?: ServiceRequest[];
  workOrders?: WorkOrder[];
  appointments?: Appointment[];
  technicianAssignments?: TechnicianAssignmentReference[];
}): ServiceHandlerDeps {
  return {
    serviceRequests: memoryServiceRequestRepo(partial.serviceRequests ?? []),
    workOrders: memoryWorkOrderRepo(partial.workOrders ?? []),
    appointments: memoryAppointmentRepo(partial.appointments ?? []),
    technicianAssignments: memoryTechnicianAssignmentRepo(
      partial.technicianAssignments ?? [],
    ),
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
        roleCode: "svc",
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

function rowId(row: Row): string {
  const anyRow = row as unknown as { id?: string; assignmentId?: string };
  return anyRow.assignmentId ?? anyRow.id ?? "";
}

type Suite = {
  readonly name: string;
  readonly queryType: string;
  readonly action: string;
  readonly validator: Validator<Query<ListQueryRequest>>;
  readonly createHandler: (
    deps: ServiceHandlerDeps,
  ) => QueryHandler<ListQueryRequest, Page<Row>>;
  readonly depsFor: (rows: readonly Row[]) => ServiceHandlerDeps;
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
    name: "ListServiceRequest",
    queryType: ServiceQueryTypes.ListServiceRequest,
    action: ServicePolicyActions.ServiceRequestRead,
    validator: listServiceRequestQueryValidator,
    createHandler:
      createListServiceRequestHandler as unknown as Suite["createHandler"],
    depsFor: (rows) =>
      baseDeps({ serviceRequests: rows as unknown as ServiceRequest[] }),
    owned: (id) =>
      makeServiceRequest({
        id,
        companyId: "co-1",
        number: `SR-${id}`,
        title: `Request ${id}`,
      }) as unknown as Row,
    otherOwned: (id) =>
      makeServiceRequest({
        id,
        companyId: "co-1",
        number: `SR-${id}`,
        title: `Other ${id}`,
      }) as unknown as Row,
    foreignCompany: (id) =>
      makeServiceRequest({
        id,
        companyId: "co-2",
        number: "SR-X",
        title: "Foreign",
      }) as unknown as Row,
    searchable: (id) =>
      makeServiceRequest({
        id,
        companyId: "co-1",
        number: "SR-99",
        title: "Widget Service Request",
      }) as unknown as Row,
    filterable: (id) =>
      makeServiceRequest({
        id,
        companyId: "co-1",
        number: `SR-${id}`,
        title: `Filtered ${id}`,
        status: "waiting",
      }) as unknown as Row,
    sortableA: () =>
      makeServiceRequest({
        id: "a",
        companyId: "co-1",
        number: "SR-Z",
        title: "Zebra",
      }) as unknown as Row,
    sortableB: () =>
      makeServiceRequest({
        id: "b",
        companyId: "co-1",
        number: "SR-A",
        title: "Alpha",
      }) as unknown as Row,
    sortField: "title",
    filterField: "status",
    filterValue: "waiting",
    searchNeedle: "Widget",
  },
  {
    name: "ListWorkOrder",
    queryType: ServiceQueryTypes.ListWorkOrder,
    action: ServicePolicyActions.WorkOrderRead,
    validator: listWorkOrderQueryValidator,
    createHandler:
      createListWorkOrderHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ workOrders: rows as unknown as WorkOrder[] }),
    owned: (id) =>
      makeWorkOrder({
        id,
        companyId: "co-1",
        number: `WO-${id}`,
      }) as unknown as Row,
    otherOwned: (id) =>
      makeWorkOrder({
        id,
        companyId: "co-1",
        number: `WO-${id}`,
        notes: "other",
      }) as unknown as Row,
    foreignCompany: (id) =>
      makeWorkOrder({
        id,
        companyId: "co-2",
        number: "WO-X",
      }) as unknown as Row,
    searchable: (id) =>
      makeWorkOrder({
        id,
        companyId: "co-1",
        number: "WIDGET-WO-99",
      }) as unknown as Row,
    filterable: (id) =>
      makeWorkOrder({
        id,
        companyId: "co-1",
        number: `WO-${id}`,
        status: "cancelled",
      }) as unknown as Row,
    sortableA: () =>
      makeWorkOrder({
        id: "a",
        companyId: "co-1",
        number: "Z-100",
      }) as unknown as Row,
    sortableB: () =>
      makeWorkOrder({
        id: "b",
        companyId: "co-1",
        number: "A-100",
      }) as unknown as Row,
    sortField: "number",
    filterField: "status",
    filterValue: "cancelled",
    searchNeedle: "WIDGET",
  },
  {
    name: "ListAppointment",
    queryType: ServiceQueryTypes.ListAppointment,
    action: ServicePolicyActions.AppointmentRead,
    validator: listAppointmentQueryValidator,
    createHandler:
      createListAppointmentHandler as unknown as Suite["createHandler"],
    depsFor: (rows) =>
      baseDeps({ appointments: rows as unknown as Appointment[] }),
    owned: (id) =>
      makeAppointment({
        id,
        companyId: "co-1",
      }) as unknown as Row,
    otherOwned: (id) =>
      makeAppointment({
        id,
        companyId: "co-1",
        notes: "other",
      }) as unknown as Row,
    foreignCompany: (id) =>
      makeAppointment({
        id,
        companyId: "co-2",
      }) as unknown as Row,
    searchable: (id) =>
      makeAppointment({
        id,
        companyId: "co-1",
        notes: "Widget onsite inspection",
      }) as unknown as Row,
    filterable: (id) =>
      makeAppointment({
        id,
        companyId: "co-1",
        status: "cancelled",
      }) as unknown as Row,
    sortableA: () =>
      makeAppointment({
        id: "a",
        companyId: "co-1",
        status: "scheduled",
      }) as unknown as Row,
    sortableB: () =>
      makeAppointment({
        id: "b",
        companyId: "co-1",
        status: "confirmed",
      }) as unknown as Row,
    sortField: "status",
    filterField: "status",
    filterValue: "cancelled",
    searchNeedle: "Widget",
  },
  {
    name: "ListTechnicianAssignment",
    queryType: ServiceQueryTypes.ListTechnicianAssignment,
    action: ServicePolicyActions.TechnicianAssignmentRead,
    validator: listTechnicianAssignmentQueryValidator,
    createHandler:
      createListTechnicianAssignmentHandler as unknown as Suite["createHandler"],
    depsFor: (rows) =>
      baseDeps({
        technicianAssignments: rows as unknown as TechnicianAssignmentReference[],
      }),
    owned: (id) =>
      makeAssignment({
        assignmentId: id,
        companyId: "co-1",
        workOrderId: `wo-${id}`,
      }) as unknown as Row,
    otherOwned: (id) =>
      makeAssignment({
        assignmentId: id,
        companyId: "co-1",
        workOrderId: `wo-${id}`,
      }) as unknown as Row,
    foreignCompany: (id) =>
      makeAssignment({
        assignmentId: id,
        companyId: "co-2",
        workOrderId: "wo-x",
      }) as unknown as Row,
    searchable: (id) =>
      makeAssignment({
        assignmentId: id,
        companyId: "co-1",
        workOrderId: "WIDGET-WO",
      }) as unknown as Row,
    filterable: (id) =>
      makeAssignment({
        assignmentId: id,
        companyId: "co-1",
        workOrderId: "WO-FILTER",
      }) as unknown as Row,
    sortableA: () =>
      makeAssignment({
        assignmentId: "a",
        companyId: "co-1",
        assignedAt: "2026-02-01T00:00:00.000Z",
      }) as unknown as Row,
    sortableB: () =>
      makeAssignment({
        assignmentId: "b",
        companyId: "co-1",
        assignedAt: "2026-01-01T00:00:00.000Z",
      }) as unknown as Row,
    sortField: "assignedAt",
    filterField: "workOrderId",
    filterValue: "WO-FILTER",
    searchNeedle: "WIDGET",
  },
];

for (const suite of suites) {
  describe(`RC7.2g ${suite.name}`, () => {
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
        result.value.items.map((r) => rowId(r)),
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
        result.value.items.map((r) => rowId(r)),
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
      if (suite.name === "ListServiceRequest") {
        (deps.serviceRequests as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else if (suite.name === "ListWorkOrder") {
        (deps.workOrders as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else if (suite.name === "ListAppointment") {
        (deps.appointments as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else {
        (deps.technicianAssignments as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      }
      const handler = suite.createHandler(deps);
      const result = await handler.handle(
        queryOf(suite.queryType, { companyId: "co-1" }),
        appCtx(allow("1", "leak")),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.ok(!result.value.items.some((r) => rowId(r) === "leak"));
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
        result.value.items.map((r) => rowId(r)),
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
        result.value.items.map((r) => rowId(r)),
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
        result.value.items.map((r) => rowId(r)),
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

describe("RC7.2g composition regression — Get and lifecycle unchanged", () => {
  const serviceRequests = [
    makeServiceRequest({
      id: "sr-1",
      companyId: "co-1",
      number: "SR-1",
      title: "Broken heater",
    }),
  ];
  const workOrders = [
    makeWorkOrder({
      id: "wo-1",
      companyId: "co-1",
      number: "WO-1",
      serviceRequestId: "sr-1",
    }),
  ];
  const appointments = [
    makeAppointment({
      id: "appt-1",
      companyId: "co-1",
      serviceRequestId: "sr-1",
    }),
  ];
  const technicianAssignments = [
    makeAssignment({
      assignmentId: "asg-1",
      companyId: "co-1",
      workOrderId: "wo-1",
    }),
  ];
  const deps = baseDeps({
    serviceRequests,
    workOrders,
    appointments,
    technicianAssignments,
  });

  it("existing Get handlers still behave identically after List registration", async () => {
    const app = createServiceApplication(deps);
    assert.ok(app.handlers.resolveQuery(ServiceQueryTypes.GetServiceRequest));
    assert.ok(app.handlers.resolveQuery(ServiceQueryTypes.GetWorkOrder));
    assert.ok(app.handlers.resolveQuery(ServiceQueryTypes.GetAppointment));
    assert.ok(
      app.handlers.resolveQuery(ServiceQueryTypes.GetTechnicianAssignment),
    );
    assert.ok(app.handlers.resolveQuery(ServiceQueryTypes.ListServiceRequest));
    assert.ok(app.handlers.resolveQuery(ServiceQueryTypes.ListWorkOrder));
    assert.ok(app.handlers.resolveQuery(ServiceQueryTypes.ListAppointment));
    assert.ok(
      app.handlers.resolveQuery(ServiceQueryTypes.ListTechnicianAssignment),
    );

    const getCtx = ctx({
      userId: "user-a",
      permission: ServicePolicyActions.ServiceRequestRead,
      policy: {
        async evaluate() {
          return { allowed: true };
        },
      },
    });

    const getServiceRequest = createGetServiceRequestHandler(deps);
    const serviceRequestResult = await getServiceRequest.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000010"),
        queryType: ServiceQueryTypes.GetServiceRequest,
        payload: { companyId: "co-1", serviceRequestId: "sr-1" },
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
    assert.equal(serviceRequestResult.ok, true);
    if (!serviceRequestResult.ok) return;
    assert.equal(serviceRequestResult.value.id, "sr-1");

    const getWorkOrder = createGetWorkOrderHandler(deps);
    const workOrderResult = await getWorkOrder.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000012"),
        queryType: ServiceQueryTypes.GetWorkOrder,
        payload: { companyId: "co-1", workOrderId: "wo-1", includeLines: false },
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
    assert.equal(workOrderResult.ok, true);
    if (!workOrderResult.ok) return;
    assert.equal(workOrderResult.value.workOrder.id, "wo-1");

    const getAppointment = createGetAppointmentHandler(deps);
    const appointmentResult = await getAppointment.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000014"),
        queryType: ServiceQueryTypes.GetAppointment,
        payload: { companyId: "co-1", appointmentId: "appt-1" },
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
    assert.equal(appointmentResult.ok, true);
    if (!appointmentResult.ok) return;
    assert.equal(appointmentResult.value.id, "appt-1");

    const getAssignment = createGetTechnicianAssignmentHandler(deps);
    const assignmentResult = await getAssignment.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000016"),
        queryType: ServiceQueryTypes.GetTechnicianAssignment,
        payload: { companyId: "co-1", assignmentId: "asg-1" },
        metadata: {
          correlationId: CorrelationId.from(
            "00000000-0000-4000-8000-000000000017",
          ),
          causationId: null,
          companyId: "co-1",
          actorId: "user-a",
          issuedAt: new Date(),
        },
      },
      getCtx,
    );
    assert.equal(assignmentResult.ok, true);
    if (!assignmentResult.ok) return;
    assert.equal(assignmentResult.value.assignmentId, "asg-1");
  });

  it("existing Create/Update/Lifecycle command handlers remain registered", () => {
    const app = createServiceApplication(deps);
    const required = [
      ServiceCommandTypes.CreateServiceRequest,
      ServiceCommandTypes.UpdateServiceRequest,
      ServiceCommandTypes.AssignTechnician,
      ServiceCommandTypes.ReassignTechnician,
      ServiceCommandTypes.ScheduleAppointment,
      ServiceCommandTypes.RescheduleAppointment,
      ServiceCommandTypes.CreateWorkOrder,
      ServiceCommandTypes.UpdateWorkOrder,
      ServiceCommandTypes.CompleteWorkOrder,
      ServiceCommandTypes.CloseServiceRequest,
    ];
    for (const type of required) {
      assert.ok(
        app.handlers.resolveCommand(type),
        `missing command handler ${type}`,
      );
    }
  });
});
