/**
 * RC7.2e — CRM List* handler tests (Policy + authorized totals + paging).
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
  Account,
  AccountRepository,
  Activity,
  ActivityRepository,
  Campaign,
  CampaignRepository,
  Contact,
  ContactRepository,
  Lead,
  LeadRepository,
} from "@afh/crm";
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
import { createCrmApplication } from "../composition/composition-root.js";
import {
  createListAccountHandler,
  createListActivityHandler,
  createListCampaignHandler,
  createListContactHandler,
  createListLeadHandler,
} from "./list-handlers.js";
import {
  createGetAccountHandler,
  createGetActivityHandler,
  createGetCampaignHandler,
  createGetContactHandler,
  createGetLeadHandler,
} from "./query-handlers.js";
import type { CrmHandlerDeps } from "./deps.js";
import {
  CrmCommandTypes,
  CrmPolicyActions,
  CrmQueryTypes,
} from "../constants.js";
import {
  listAccountQueryValidator,
  listActivityQueryValidator,
  listCampaignQueryValidator,
  listContactQueryValidator,
  listLeadQueryValidator,
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
    async listByCompany() {
      return ok(pageSlice([]));
    },
  } as never;
}

function makeLead(
  partial: Partial<Lead> & Pick<Lead, "id" | "companyId">,
): Lead {
  return {
    code: null,
    title: null,
    status: "new",
    classification: null,
    source: null,
    contactId: null,
    accountId: null,
    ownerUserId: null,
    salesCustomerId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeContact(
  partial: Partial<Contact> &
    Pick<Contact, "id" | "companyId" | "displayName">,
): Contact {
  return {
    contactType: "person",
    email: null,
    phone: null,
    userId: null,
    accountId: null,
    leadId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeAccount(
  partial: Partial<Account> & Pick<Account, "id" | "companyId" | "name">,
): Account {
  return {
    code: null,
    accountType: "prospect",
    identityOrganizationId: null,
    primaryContactId: null,
    ownerUserId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeActivity(
  partial: Partial<Activity> & Pick<Activity, "id" | "companyId" | "subject">,
): Activity {
  return {
    activityType: "call",
    notes: null,
    outcome: null,
    leadId: null,
    contactId: null,
    accountId: null,
    opportunityId: null,
    ownerUserId: null,
    dueAt: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeCampaign(
  partial: Partial<Campaign> & Pick<Campaign, "id" | "companyId" | "name">,
): Campaign {
  return {
    code: null,
    status: "draft",
    audience: null,
    startAt: null,
    endAt: null,
    ownerUserId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function memoryLeadRepo(rows: Lead[]): LeadRepository {
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

function memoryContactRepo(rows: Contact[]): ContactRepository {
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
    async saveMethod() {
      return ok(undefined);
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function memoryAccountRepo(rows: Account[]): AccountRepository {
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
    async saveRelationship() {
      return ok(undefined);
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function memoryActivityRepo(rows: Activity[]): ActivityRepository {
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
    async listBySubject(companyId, subjectType, subjectId, page) {
      const field =
        subjectType === "opportunity" ? "opportunityId" : `${subjectType}Id`;
      return ok(
        pageSlice(
          rows.filter(
            (r) =>
              r.companyId === companyId &&
              (r as unknown as Record<string, unknown>)[field] === subjectId,
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

function memoryCampaignRepo(rows: Campaign[]): CampaignRepository {
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

function baseDeps(partial: {
  leads?: Lead[];
  contacts?: Contact[];
  accounts?: Account[];
  activities?: Activity[];
  campaigns?: Campaign[];
}): CrmHandlerDeps {
  return {
    leads: memoryLeadRepo(partial.leads ?? []),
    contacts: memoryContactRepo(partial.contacts ?? []),
    accounts: memoryAccountRepo(partial.accounts ?? []),
    activities: memoryActivityRepo(partial.activities ?? []),
    campaigns: memoryCampaignRepo(partial.campaigns ?? []),
    communications: emptyRepo(),
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
        roleCode: "crm",
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
    deps: CrmHandlerDeps,
  ) => QueryHandler<ListQueryRequest, Page<Row>>;
  readonly depsFor: (rows: readonly Row[]) => CrmHandlerDeps;
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
    name: "ListLead",
    queryType: CrmQueryTypes.ListLead,
    action: CrmPolicyActions.LeadRead,
    validator: listLeadQueryValidator,
    createHandler: createListLeadHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ leads: rows as Lead[] }),
    owned: (id) =>
      makeLead({
        id,
        companyId: "co-1",
        code: `L-${id}`,
        title: `Lead ${id}`,
      }),
    otherOwned: (id) =>
      makeLead({
        id,
        companyId: "co-1",
        code: `L-${id}`,
        title: `Other ${id}`,
      }),
    foreignCompany: (id) =>
      makeLead({
        id,
        companyId: "co-2",
        code: "LX",
        title: "Foreign",
      }),
    searchable: (id) =>
      makeLead({
        id,
        companyId: "co-1",
        code: "WIDGET-LEAD",
        title: "Widget Lead",
      }),
    filterable: (id) =>
      makeLead({
        id,
        companyId: "co-1",
        code: `L-${id}`,
        title: `Filtered ${id}`,
        status: "qualified",
      }),
    sortableA: () =>
      makeLead({
        id: "a",
        companyId: "co-1",
        code: "Z-1",
        title: "Zebra",
      }),
    sortableB: () =>
      makeLead({
        id: "b",
        companyId: "co-1",
        code: "A-1",
        title: "Alpha",
      }),
    sortField: "title",
    filterField: "status",
    filterValue: "qualified",
    searchNeedle: "Widget",
  },
  {
    name: "ListContact",
    queryType: CrmQueryTypes.ListContact,
    action: CrmPolicyActions.ContactRead,
    validator: listContactQueryValidator,
    createHandler:
      createListContactHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ contacts: rows as Contact[] }),
    owned: (id) =>
      makeContact({
        id,
        companyId: "co-1",
        displayName: `Contact ${id}`,
      }),
    otherOwned: (id) =>
      makeContact({
        id,
        companyId: "co-1",
        displayName: `Other ${id}`,
      }),
    foreignCompany: (id) =>
      makeContact({
        id,
        companyId: "co-2",
        displayName: "Foreign",
      }),
    searchable: (id) =>
      makeContact({
        id,
        companyId: "co-1",
        displayName: "Widget Contact",
        email: "widget@example.com",
      }),
    filterable: (id) =>
      makeContact({
        id,
        companyId: "co-1",
        displayName: `Filtered ${id}`,
        contactType: "billing",
      }),
    sortableA: () =>
      makeContact({
        id: "a",
        companyId: "co-1",
        displayName: "Zebra",
      }),
    sortableB: () =>
      makeContact({
        id: "b",
        companyId: "co-1",
        displayName: "Alpha",
      }),
    sortField: "displayName",
    filterField: "contactType",
    filterValue: "billing",
    searchNeedle: "Widget",
  },
  {
    name: "ListAccount",
    queryType: CrmQueryTypes.ListAccount,
    action: CrmPolicyActions.AccountRead,
    validator: listAccountQueryValidator,
    createHandler:
      createListAccountHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ accounts: rows as Account[] }),
    owned: (id) =>
      makeAccount({
        id,
        companyId: "co-1",
        code: `A-${id}`,
        name: `Account ${id}`,
      }),
    otherOwned: (id) =>
      makeAccount({
        id,
        companyId: "co-1",
        code: `A-${id}`,
        name: `Other ${id}`,
      }),
    foreignCompany: (id) =>
      makeAccount({
        id,
        companyId: "co-2",
        code: "AX",
        name: "Foreign",
      }),
    searchable: (id) =>
      makeAccount({
        id,
        companyId: "co-1",
        code: "WIDGET-ACC",
        name: "Widget Account",
      }),
    filterable: (id) =>
      makeAccount({
        id,
        companyId: "co-1",
        code: `A-${id}`,
        name: `Filtered ${id}`,
        accountType: "customer",
      }),
    sortableA: () =>
      makeAccount({
        id: "a",
        companyId: "co-1",
        code: "Z-1",
        name: "Zebra",
      }),
    sortableB: () =>
      makeAccount({
        id: "b",
        companyId: "co-1",
        code: "A-1",
        name: "Alpha",
      }),
    sortField: "name",
    filterField: "accountType",
    filterValue: "customer",
    searchNeedle: "Widget",
  },
  {
    name: "ListActivity",
    queryType: CrmQueryTypes.ListActivity,
    action: CrmPolicyActions.ActivityRead,
    validator: listActivityQueryValidator,
    createHandler:
      createListActivityHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ activities: rows as Activity[] }),
    owned: (id) =>
      makeActivity({
        id,
        companyId: "co-1",
        subject: `Activity ${id}`,
      }),
    otherOwned: (id) =>
      makeActivity({
        id,
        companyId: "co-1",
        subject: `Other ${id}`,
      }),
    foreignCompany: (id) =>
      makeActivity({
        id,
        companyId: "co-2",
        subject: "Foreign",
      }),
    searchable: (id) =>
      makeActivity({
        id,
        companyId: "co-1",
        subject: "Widget Call",
        notes: "Widget notes",
      }),
    filterable: (id) =>
      makeActivity({
        id,
        companyId: "co-1",
        subject: `Filtered ${id}`,
        activityType: "meeting",
      }),
    sortableA: () =>
      makeActivity({
        id: "a",
        companyId: "co-1",
        subject: "Zebra",
      }),
    sortableB: () =>
      makeActivity({
        id: "b",
        companyId: "co-1",
        subject: "Alpha",
      }),
    sortField: "subject",
    filterField: "activityType",
    filterValue: "meeting",
    searchNeedle: "Widget",
  },
  {
    name: "ListCampaign",
    queryType: CrmQueryTypes.ListCampaign,
    action: CrmPolicyActions.CampaignRead,
    validator: listCampaignQueryValidator,
    createHandler:
      createListCampaignHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ campaigns: rows as Campaign[] }),
    owned: (id) =>
      makeCampaign({
        id,
        companyId: "co-1",
        code: `C-${id}`,
        name: `Campaign ${id}`,
      }),
    otherOwned: (id) =>
      makeCampaign({
        id,
        companyId: "co-1",
        code: `C-${id}`,
        name: `Other ${id}`,
      }),
    foreignCompany: (id) =>
      makeCampaign({
        id,
        companyId: "co-2",
        code: "CX",
        name: "Foreign",
      }),
    searchable: (id) =>
      makeCampaign({
        id,
        companyId: "co-1",
        code: "WIDGET-CMP",
        name: "Widget Campaign",
      }),
    filterable: (id) =>
      makeCampaign({
        id,
        companyId: "co-1",
        code: `C-${id}`,
        name: `Filtered ${id}`,
        status: "active",
      }),
    sortableA: () =>
      makeCampaign({
        id: "a",
        companyId: "co-1",
        code: "Z-1",
        name: "Zebra",
      }),
    sortableB: () =>
      makeCampaign({
        id: "b",
        companyId: "co-1",
        code: "A-1",
        name: "Alpha",
      }),
    sortField: "name",
    filterField: "status",
    filterValue: "active",
    searchNeedle: "Widget",
  },
];

for (const suite of suites) {
  describe(`RC7.2e ${suite.name}`, () => {
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
      if (suite.name === "ListLead") {
        (deps.leads as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else if (suite.name === "ListContact") {
        (deps.contacts as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else if (suite.name === "ListAccount") {
        (deps.accounts as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else if (suite.name === "ListActivity") {
        (deps.activities as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else {
        (deps.campaigns as unknown as { listByCompany: typeof leakingList }).listByCompany =
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

describe("RC7.2e composition regression — Get and lifecycle unchanged", () => {
  const leads = [
    makeLead({
      id: "lead-1",
      companyId: "co-1",
      code: "L-1",
      title: "Acme Lead",
    }),
  ];
  const contacts = [
    makeContact({
      id: "contact-1",
      companyId: "co-1",
      displayName: "Jane Doe",
    }),
  ];
  const accounts = [
    makeAccount({
      id: "account-1",
      companyId: "co-1",
      code: "ACC-1",
      name: "Acme Inc",
    }),
  ];
  const activities = [
    makeActivity({
      id: "activity-1",
      companyId: "co-1",
      subject: "Intro Call",
    }),
  ];
  const campaigns = [
    makeCampaign({
      id: "campaign-1",
      companyId: "co-1",
      code: "CMP-1",
      name: "Spring Promo",
    }),
  ];
  const deps = baseDeps({ leads, contacts, accounts, activities, campaigns });

  it("existing Get handlers still behave identically after List registration", async () => {
    const app = createCrmApplication(deps);
    assert.ok(app.handlers.resolveQuery(CrmQueryTypes.GetLead));
    assert.ok(app.handlers.resolveQuery(CrmQueryTypes.GetContact));
    assert.ok(app.handlers.resolveQuery(CrmQueryTypes.GetAccount));
    assert.ok(app.handlers.resolveQuery(CrmQueryTypes.GetActivity));
    assert.ok(app.handlers.resolveQuery(CrmQueryTypes.GetCampaign));
    assert.ok(app.handlers.resolveQuery(CrmQueryTypes.ListLead));
    assert.ok(app.handlers.resolveQuery(CrmQueryTypes.ListContact));
    assert.ok(app.handlers.resolveQuery(CrmQueryTypes.ListAccount));
    assert.ok(app.handlers.resolveQuery(CrmQueryTypes.ListActivity));
    assert.ok(app.handlers.resolveQuery(CrmQueryTypes.ListCampaign));

    const getCtx = ctx({
      userId: "user-a",
      permission: CrmPolicyActions.LeadRead,
      policy: {
        async evaluate() {
          return { allowed: true };
        },
      },
    });

    const getLead = createGetLeadHandler(deps);
    const leadResult = await getLead.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000010"),
        queryType: CrmQueryTypes.GetLead,
        payload: { companyId: "co-1", leadId: "lead-1" },
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
    assert.equal(leadResult.ok, true);
    if (!leadResult.ok) return;
    assert.equal(leadResult.value.id, "lead-1");

    const getContact = createGetContactHandler(deps);
    const contactResult = await getContact.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000012"),
        queryType: CrmQueryTypes.GetContact,
        payload: { companyId: "co-1", contactId: "contact-1" },
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
    assert.equal(contactResult.ok, true);
    if (!contactResult.ok) return;
    assert.equal(contactResult.value.id, "contact-1");

    const getAccount = createGetAccountHandler(deps);
    const accountResult = await getAccount.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000014"),
        queryType: CrmQueryTypes.GetAccount,
        payload: { companyId: "co-1", accountId: "account-1" },
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
    assert.equal(accountResult.ok, true);
    if (!accountResult.ok) return;
    assert.equal(accountResult.value.id, "account-1");

    const getActivity = createGetActivityHandler(deps);
    const activityResult = await getActivity.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000016"),
        queryType: CrmQueryTypes.GetActivity,
        payload: { companyId: "co-1", activityId: "activity-1" },
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
    assert.equal(activityResult.ok, true);
    if (!activityResult.ok) return;
    assert.equal(activityResult.value.id, "activity-1");

    const getCampaign = createGetCampaignHandler(deps);
    const campaignResult = await getCampaign.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000018"),
        queryType: CrmQueryTypes.GetCampaign,
        payload: { companyId: "co-1", campaignId: "campaign-1" },
        metadata: {
          correlationId: CorrelationId.from(
            "00000000-0000-4000-8000-000000000019",
          ),
          causationId: null,
          companyId: "co-1",
          actorId: "user-a",
          issuedAt: new Date(),
        },
      },
      getCtx,
    );
    assert.equal(campaignResult.ok, true);
    if (!campaignResult.ok) return;
    assert.equal(campaignResult.value.id, "campaign-1");
  });

  it("existing Create/Update/Lifecycle command handlers remain registered", () => {
    const app = createCrmApplication(deps);
    const required = [
      CrmCommandTypes.CreateLead,
      CrmCommandTypes.UpdateLead,
      CrmCommandTypes.QualifyLead,
      CrmCommandTypes.ConvertLead,
      CrmCommandTypes.CreateContact,
      CrmCommandTypes.UpdateContact,
      CrmCommandTypes.CreateAccount,
      CrmCommandTypes.UpdateAccount,
      CrmCommandTypes.LogActivity,
      CrmCommandTypes.RecordCommunication,
      CrmCommandTypes.CreateCampaign,
      CrmCommandTypes.UpdateCampaign,
    ];
    for (const type of required) {
      assert.ok(
        app.handlers.resolveCommand(type),
        `missing command handler ${type}`,
      );
    }
  });
});
