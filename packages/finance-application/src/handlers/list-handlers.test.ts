/**
 * RC7.2d — Finance List* handler tests (Policy + authorized totals + paging).
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
  AccountRepository,
  FinancialAccount,
  FinancialLedger,
  Invoice,
  InvoiceRepository,
  LedgerRepository,
  Payment,
  PaymentRepository,
} from "@afh/finance";
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
import { createFinanceApplication } from "../composition/composition-root.js";
import {
  createListFinancialAccountHandler,
  createListInvoiceHandler,
  createListLedgerHandler,
  createListPaymentHandler,
} from "./list-handlers.js";
import {
  createGetFinancialAccountHandler,
  createGetInvoiceHandler,
  createGetLedgerHandler,
  createGetPaymentHandler,
} from "./query-handlers.js";
import type { FinanceHandlerDeps } from "./deps.js";
import {
  FinanceCommandTypes,
  FinancePolicyActions,
  FinanceQueryTypes,
} from "../constants.js";
import {
  listFinancialAccountQueryValidator,
  listInvoiceQueryValidator,
  listLedgerQueryValidator,
  listPaymentQueryValidator,
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

function makeAccount(
  partial: Partial<FinancialAccount> &
    Pick<FinancialAccount, "id" | "companyId" | "code" | "name">,
): FinancialAccount {
  return {
    accountType: "asset",
    status: "active",
    currencyCode: "USD",
    parentAccountId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeInvoice(
  partial: Partial<Invoice> &
    Pick<Invoice, "id" | "companyId" | "number">,
): Invoice {
  return {
    status: "issued",
    currencyCode: "USD",
    customerId: null,
    organizationId: null,
    billToAddressId: null,
    issuedAt: "2026-01-01T00:00:00.000Z",
    dueAt: null,
    subtotal: null,
    taxTotal: null,
    total: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makePayment(
  partial: Partial<Payment> & Pick<Payment, "id" | "companyId">,
): Payment {
  return {
    status: "captured",
    amount: { currencyCode: "USD", amountMinor: 1000n },
    method: null,
    invoiceId: "inv-1",
    payerCustomerId: null,
    payerOrganizationId: null,
    externalRef: null,
    correlationId: null,
    recordedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function makeLedger(
  partial: Partial<FinancialLedger> &
    Pick<FinancialLedger, "id" | "companyId" | "code" | "name">,
): FinancialLedger {
  return {
    kind: "general",
    currencyCode: "USD",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function memoryAccountRepo(rows: FinancialAccount[]): AccountRepository {
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

function memoryInvoiceRepo(rows: Invoice[]): InvoiceRepository {
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
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
    async listLines() {
      return ok([]);
    },
  };
}

function memoryPaymentRepo(rows: Payment[]): PaymentRepository {
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
    async listByInvoice(companyId, invoiceId, page) {
      return ok(
        pageSlice(
          rows.filter(
            (r) => r.companyId === companyId && r.invoiceId === invoiceId,
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

function memoryLedgerRepo(rows: FinancialLedger[]): LedgerRepository {
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
    async appendEntry() {
      return ok(undefined);
    },
    async listEntries() {
      return ok(pageSlice([]));
    },
    async listByCompany(companyId, page) {
      return ok(pageSlice(rows.filter((r) => r.companyId === companyId), page));
    },
  };
}

function baseDeps(partial: {
  accounts?: FinancialAccount[];
  invoices?: Invoice[];
  payments?: Payment[];
  ledgers?: FinancialLedger[];
}): FinanceHandlerDeps {
  return {
    accounts: memoryAccountRepo(partial.accounts ?? []),
    invoices: memoryInvoiceRepo(partial.invoices ?? []),
    payments: memoryPaymentRepo(partial.payments ?? []),
    ledgers: memoryLedgerRepo(partial.ledgers ?? []),
    credits: emptyRepo(),
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
        roleCode: "fin",
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
    deps: FinanceHandlerDeps,
  ) => QueryHandler<ListQueryRequest, Page<Row>>;
  readonly depsFor: (rows: readonly Row[]) => FinanceHandlerDeps;
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
    name: "ListFinancialAccount",
    queryType: FinanceQueryTypes.ListFinancialAccount,
    action: FinancePolicyActions.AccountRead,
    validator: listFinancialAccountQueryValidator,
    createHandler:
      createListFinancialAccountHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ accounts: rows as FinancialAccount[] }),
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
        code: "WIDGET-CASH",
        name: "Widget Cash Account",
      }),
    filterable: (id) =>
      makeAccount({
        id,
        companyId: "co-1",
        code: `A-${id}`,
        name: `Filtered ${id}`,
        status: "inactive",
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
    filterField: "status",
    filterValue: "inactive",
    searchNeedle: "Widget",
  },
  {
    name: "ListInvoice",
    queryType: FinanceQueryTypes.ListInvoice,
    action: FinancePolicyActions.InvoiceRead,
    validator: listInvoiceQueryValidator,
    createHandler: createListInvoiceHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ invoices: rows as Invoice[] }),
    owned: (id) =>
      makeInvoice({
        id,
        companyId: "co-1",
        number: `INV-${id}`,
        organizationId: "org-a",
      }),
    otherOwned: (id) =>
      makeInvoice({
        id,
        companyId: "co-1",
        number: `INV-${id}`,
        organizationId: "org-b",
      }),
    foreignCompany: (id) =>
      makeInvoice({
        id,
        companyId: "co-2",
        number: "INV-X",
      }),
    searchable: (id) =>
      makeInvoice({
        id,
        companyId: "co-1",
        number: "WIDGET-INV-99",
      }),
    filterable: (id) =>
      makeInvoice({
        id,
        companyId: "co-1",
        number: `INV-${id}`,
        status: "void",
      }),
    sortableA: () =>
      makeInvoice({
        id: "a",
        companyId: "co-1",
        number: "Z-INV",
      }),
    sortableB: () =>
      makeInvoice({
        id: "b",
        companyId: "co-1",
        number: "A-INV",
      }),
    sortField: "number",
    filterField: "status",
    filterValue: "void",
    searchNeedle: "WIDGET",
  },
  {
    name: "ListPayment",
    queryType: FinanceQueryTypes.ListPayment,
    action: FinancePolicyActions.PaymentRead,
    validator: listPaymentQueryValidator,
    createHandler: createListPaymentHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ payments: rows as Payment[] }),
    owned: (id) =>
      makePayment({
        id,
        companyId: "co-1",
        invoiceId: `inv-${id}`,
        payerOrganizationId: "org-a",
      }),
    otherOwned: (id) =>
      makePayment({
        id,
        companyId: "co-1",
        invoiceId: `inv-${id}`,
        payerOrganizationId: "org-b",
      }),
    foreignCompany: (id) =>
      makePayment({
        id,
        companyId: "co-2",
        invoiceId: "inv-x",
      }),
    searchable: (id) =>
      makePayment({
        id,
        companyId: "co-1",
        invoiceId: "WIDGET-INV",
        externalRef: "WIDGET-PAY-REF",
      }),
    filterable: (id) =>
      makePayment({
        id,
        companyId: "co-1",
        invoiceId: `inv-${id}`,
        status: "failed",
      }),
    sortableA: () =>
      makePayment({
        id: "a",
        companyId: "co-1",
        status: "pending",
        recordedAt: "2026-02-01T00:00:00.000Z",
      }),
    sortableB: () =>
      makePayment({
        id: "b",
        companyId: "co-1",
        status: "captured",
        recordedAt: "2026-01-01T00:00:00.000Z",
      }),
    sortField: "status",
    filterField: "status",
    filterValue: "failed",
    searchNeedle: "WIDGET",
  },
  {
    name: "ListLedger",
    queryType: FinanceQueryTypes.ListLedger,
    action: FinancePolicyActions.LedgerRead,
    validator: listLedgerQueryValidator,
    createHandler: createListLedgerHandler as unknown as Suite["createHandler"],
    depsFor: (rows) => baseDeps({ ledgers: rows as FinancialLedger[] }),
    owned: (id) =>
      makeLedger({
        id,
        companyId: "co-1",
        code: `L-${id}`,
        name: `Ledger ${id}`,
      }),
    otherOwned: (id) =>
      makeLedger({
        id,
        companyId: "co-1",
        code: `L-${id}`,
        name: `Other ${id}`,
      }),
    foreignCompany: (id) =>
      makeLedger({
        id,
        companyId: "co-2",
        code: "LX",
        name: "Foreign",
      }),
    searchable: (id) =>
      makeLedger({
        id,
        companyId: "co-1",
        code: "WIDGET-GL",
        name: "Widget General Ledger",
      }),
    filterable: (id) =>
      makeLedger({
        id,
        companyId: "co-1",
        code: `L-${id}`,
        name: `Filtered ${id}`,
        kind: "accounts_receivable",
      }),
    sortableA: () =>
      makeLedger({
        id: "a",
        companyId: "co-1",
        code: "Z-1",
        name: "Zebra",
      }),
    sortableB: () =>
      makeLedger({
        id: "b",
        companyId: "co-1",
        code: "A-1",
        name: "Alpha",
      }),
    sortField: "name",
    filterField: "kind",
    filterValue: "accounts_receivable",
    searchNeedle: "Widget",
  },
];

for (const suite of suites) {
  describe(`RC7.2d ${suite.name}`, () => {
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
      if (suite.name === "ListFinancialAccount") {
        (deps.accounts as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else if (suite.name === "ListInvoice") {
        (deps.invoices as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else if (suite.name === "ListPayment") {
        (deps.payments as unknown as { listByCompany: typeof leakingList }).listByCompany =
          leakingList;
      } else {
        (deps.ledgers as unknown as { listByCompany: typeof leakingList }).listByCompany =
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

describe("RC7.2d composition regression — Get and lifecycle unchanged", () => {
  const accounts = [
    makeAccount({
      id: "acc-1",
      companyId: "co-1",
      code: "1000",
      name: "Cash",
    }),
  ];
  const invoices = [
    makeInvoice({
      id: "inv-1",
      companyId: "co-1",
      number: "INV-1",
      organizationId: "org-a",
    }),
  ];
  const payments = [
    makePayment({
      id: "pay-1",
      companyId: "co-1",
      invoiceId: "inv-1",
    }),
  ];
  const ledgers = [
    makeLedger({
      id: "led-1",
      companyId: "co-1",
      code: "GL",
      name: "General",
    }),
  ];
  const deps = baseDeps({ accounts, invoices, payments, ledgers });

  it("existing Get handlers still behave identically after List registration", async () => {
    const app = createFinanceApplication(deps);
    assert.ok(app.handlers.resolveQuery(FinanceQueryTypes.GetFinancialAccount));
    assert.ok(app.handlers.resolveQuery(FinanceQueryTypes.GetInvoice));
    assert.ok(app.handlers.resolveQuery(FinanceQueryTypes.GetPayment));
    assert.ok(app.handlers.resolveQuery(FinanceQueryTypes.GetLedger));
    assert.ok(app.handlers.resolveQuery(FinanceQueryTypes.ListFinancialAccount));
    assert.ok(app.handlers.resolveQuery(FinanceQueryTypes.ListInvoice));
    assert.ok(app.handlers.resolveQuery(FinanceQueryTypes.ListPayment));
    assert.ok(app.handlers.resolveQuery(FinanceQueryTypes.ListLedger));

    const getCtx = ctx({
      userId: "user-a",
      permission: FinancePolicyActions.AccountRead,
      policy: {
        async evaluate() {
          return { allowed: true };
        },
      },
    });

    const getAccount = createGetFinancialAccountHandler(deps);
    const accountResult = await getAccount.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000010"),
        queryType: FinanceQueryTypes.GetFinancialAccount,
        payload: { companyId: "co-1", accountId: "acc-1" },
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
    assert.equal(accountResult.ok, true);
    if (!accountResult.ok) return;
    assert.equal(accountResult.value.id, "acc-1");

    const getInvoice = createGetInvoiceHandler(deps);
    const invoiceResult = await getInvoice.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000012"),
        queryType: FinanceQueryTypes.GetInvoice,
        payload: { companyId: "co-1", invoiceId: "inv-1", includeLines: false },
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
    assert.equal(invoiceResult.ok, true);
    if (!invoiceResult.ok) return;
    assert.equal(invoiceResult.value.invoice.id, "inv-1");

    const getPayment = createGetPaymentHandler(deps);
    const paymentResult = await getPayment.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000014"),
        queryType: FinanceQueryTypes.GetPayment,
        payload: { companyId: "co-1", paymentId: "pay-1" },
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
    assert.equal(paymentResult.ok, true);
    if (!paymentResult.ok) return;
    assert.equal(paymentResult.value.id, "pay-1");

    const getLedger = createGetLedgerHandler(deps);
    const ledgerResult = await getLedger.handle(
      {
        queryId: QueryId.from("00000000-0000-4000-8000-000000000016"),
        queryType: FinanceQueryTypes.GetLedger,
        payload: {
          companyId: "co-1",
          ledgerId: "led-1",
          includeEntries: false,
        },
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
    assert.equal(ledgerResult.ok, true);
    if (!ledgerResult.ok) return;
    assert.equal(ledgerResult.value.ledger.id, "led-1");
  });

  it("existing Create/Update/Lifecycle command handlers remain registered", () => {
    const app = createFinanceApplication(deps);
    const required = [
      FinanceCommandTypes.CreateFinancialAccount,
      FinanceCommandTypes.UpdateFinancialAccount,
      FinanceCommandTypes.CreateInvoice,
      FinanceCommandTypes.UpdateInvoice,
      FinanceCommandTypes.RecordPayment,
      FinanceCommandTypes.RecordCreditAdjustment,
      FinanceCommandTypes.CreateLedger,
      FinanceCommandTypes.AppendLedgerEntry,
    ];
    for (const type of required) {
      assert.ok(
        app.handlers.resolveCommand(type),
        `missing command handler ${type}`,
      );
    }
  });
});
