import type { QueryHandler } from "@afh/application";
import { filterAuthorizedRecords, principalListScope } from "@afh/application";
import type { PageRequest } from "@afh/shared-kernel";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  CreditAdjustment,
  FinancialAccount,
  FinancialLedger,
  FinancialLedgerEntry,
  InvoiceLine,
} from "@afh/finance";
import { FinancePolicyActions, FinanceQueryTypes } from "../constants.js";
import type {
  FinancialSummary,
  GetCreditAccountPayload,
  GetFinancialAccountPayload,
  GetFinancialSummaryPayload,
  GetInvoicePayload,
  GetLedgerPayload,
  GetPaymentPayload,
} from "../queries/queries.js";
import {
  getCreditAccountQueryValidator,
  getFinancialAccountQueryValidator,
  getFinancialSummaryQueryValidator,
  getInvoiceQueryValidator,
  getLedgerQueryValidator,
  getPaymentQueryValidator,
} from "../validators/validators.js";
import type { FinanceHandlerDeps } from "./deps.js";
import {
  companyResource,
  loadRecordForAuthorization,
  requireCompanyId,
} from "../support/support.js";
import {
  projectCreditAccountFields,
  projectInvoiceFields,
  projectPaymentFields,
  type CreditAccountFieldView,
  type InvoiceFieldView,
  type InvoiceLineFieldView,
  type PaymentFieldView,
} from "../security/field-security.js";

export function createGetFinancialAccountHandler(
  deps: FinanceHandlerDeps,
): QueryHandler<
  GetFinancialAccountPayload,
  FinancialAccount & { version: number }
> {
  return {
    queryType: FinanceQueryTypes.GetFinancialAccount,
    authorize(query) {
      return companyResource(
        "financial_account",
        FinancePolicyActions.AccountRead,
        query.payload.companyId,
        query.payload.accountId,
      );
    },
    validate() {
      return getFinancialAccountQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.accounts.findByIdWithVersion({
        companyId: scope.value,
        id: query.payload.accountId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Financial account not found", {
            code: "financial_account_not_found",
          }),
        );
      }
      return ok({ ...found.value.entity, version: found.value.version });
    },
  };
}

export function createGetInvoiceHandler(
  deps: FinanceHandlerDeps,
): QueryHandler<
  GetInvoicePayload,
  {
    invoice: InvoiceFieldView;
    lines: readonly InvoiceLineFieldView[];
  }
> {
  return {
    queryType: FinanceQueryTypes.GetInvoice,
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.invoices.findById({ companyId: p.companyId, id: p.invoiceId }),
      );
      return companyResource(
        "invoice",
        FinancePolicyActions.InvoiceRead,
        p.companyId,
        p.invoiceId,
        {
          organizationId: record?.organizationId ?? null,
          attributes: {
            customerId: record?.customerId ?? null,
            billToAddressId: record?.billToAddressId ?? null,
          },
        },
      );
    },
    validate() {
      return getInvoiceQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.invoices.findById({
        companyId: scope.value,
        id: query.payload.invoiceId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Invoice not found", { code: "invoice_not_found" }),
        );
      }

      let lines: readonly InvoiceLine[] = [];
      if (query.payload.includeLines !== false) {
        const listed = await deps.invoices.listLines(
          scope.value,
          found.value.id,
        );
        if (!listed.ok) return listed;
        lines = listed.value;
      }

      const resource = companyResource(
        "invoice",
        FinancePolicyActions.InvoiceRead,
        scope.value,
        found.value.id,
        {
          organizationId: found.value.organizationId,
          attributes: {
            customerId: found.value.customerId,
            billToAddressId: found.value.billToAddressId,
          },
        },
      ).resource;
      return projectInvoiceFields(
        ctx,
        deps.audit,
        resource,
        found.value,
        lines,
      );
    },
  };
}

export function createGetPaymentHandler(
  deps: FinanceHandlerDeps,
): QueryHandler<GetPaymentPayload, PaymentFieldView> {
  return {
    queryType: FinanceQueryTypes.GetPayment,
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.payments.findById({ companyId: p.companyId, id: p.paymentId }),
      );
      return companyResource(
        "payment",
        FinancePolicyActions.PaymentRead,
        p.companyId,
        p.paymentId,
        {
          organizationId: record?.payerOrganizationId ?? null,
          attributes: {
            invoiceId: record?.invoiceId ?? null,
            payerCustomerId: record?.payerCustomerId ?? null,
          },
        },
      );
    },
    validate() {
      return getPaymentQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.payments.findById({
        companyId: scope.value,
        id: query.payload.paymentId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Payment not found", { code: "payment_not_found" }),
        );
      }
      const resource = companyResource(
        "payment",
        FinancePolicyActions.PaymentRead,
        scope.value,
        found.value.id,
        {
          organizationId: found.value.payerOrganizationId,
          attributes: {
            invoiceId: found.value.invoiceId,
            payerCustomerId: found.value.payerCustomerId,
          },
        },
      ).resource;
      return projectPaymentFields(ctx, deps.audit, resource, found.value);
    },
  };
}

export function createGetLedgerHandler(
  deps: FinanceHandlerDeps,
): QueryHandler<
  GetLedgerPayload,
  { ledger: FinancialLedger; entries: readonly FinancialLedgerEntry[] }
> {
  return {
    queryType: FinanceQueryTypes.GetLedger,
    authorize(query) {
      return companyResource(
        "ledger",
        FinancePolicyActions.LedgerRead,
        query.payload.companyId,
        query.payload.ledgerId,
      );
    },
    validate() {
      return getLedgerQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.ledgers.findById({
        companyId: scope.value,
        id: query.payload.ledgerId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Financial ledger not found", {
            code: "ledger_not_found",
          }),
        );
      }

      let entries: readonly FinancialLedgerEntry[] = [];
      if (query.payload.includeEntries !== false) {
        const page: PageRequest | undefined = query.payload.page;
        const listed = await deps.ledgers.listEntries(
          scope.value,
          found.value.id,
          page,
        );
        if (!listed.ok) return listed;
        entries = listed.value.items;
      }

      return ok({ ledger: found.value, entries });
    },
  };
}

export function createGetCreditAccountHandler(
  deps: FinanceHandlerDeps,
): QueryHandler<GetCreditAccountPayload, CreditAccountFieldView> {
  return {
    queryType: FinanceQueryTypes.GetCreditAccount,
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.credits.findAccountById({
          companyId: p.companyId,
          id: p.creditAccountId,
        }),
      );
      return companyResource(
        "credit_account",
        FinancePolicyActions.CreditRead,
        p.companyId,
        p.creditAccountId,
        {
          organizationId:
            record?.ownerType === "organization" ? record.ownerId : null,
          attributes: {
            ownerType: record?.ownerType ?? null,
            ownerId: record?.ownerId ?? null,
          },
        },
      );
    },
    validate() {
      return getCreditAccountQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.credits.findAccountById({
        companyId: scope.value,
        id: query.payload.creditAccountId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Credit account not found", {
            code: "credit_account_not_found",
          }),
        );
      }

      let adjustments: readonly CreditAdjustment[] = [];
      if (query.payload.includeAdjustments !== false) {
        const page: PageRequest | undefined = query.payload.page;
        const listed = await deps.credits.listAdjustments(
          scope.value,
          found.value.id,
          page,
        );
        if (!listed.ok) return listed;
        adjustments = listed.value.items;
      }

      const resource = companyResource(
        "credit_account",
        FinancePolicyActions.CreditRead,
        scope.value,
        found.value.id,
        {
          organizationId:
            found.value.ownerType === "organization"
              ? found.value.ownerId
              : null,
          attributes: {
            ownerType: found.value.ownerType,
            ownerId: found.value.ownerId,
          },
        },
      ).resource;
      return projectCreditAccountFields(
        ctx,
        deps.audit,
        resource,
        found.value,
        adjustments,
      );
    },
  };
}

export function createGetFinancialSummaryHandler(
  deps: FinanceHandlerDeps,
): QueryHandler<GetFinancialSummaryPayload, FinancialSummary> {
  return {
    queryType: FinanceQueryTypes.GetFinancialSummary,
    authorize(query, ctx) {
      // RC5.7: the collection gate targets records within the caller's own
      // scopes; per-row Policy filtering in handle() enforces exactly that.
      return companyResource(
        "finance",
        FinancePolicyActions.SummaryRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, FinancePolicyActions.SummaryRead),
      );
    },
    validate() {
      return getFinancialSummaryQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const page = { page: 1, pageSize: 500 };
      const accounts = await deps.accounts.listByCompany(scope.value, page);
      if (!accounts.ok) return accounts;
      const invoices = await deps.invoices.listByCompany(scope.value, page);
      if (!invoices.ok) return invoices;

      // RC5.7: Policy-filter every row before counting or projecting ids.
      // Financial accounts persist no owner/org/branch fields, so scoped
      // principals see none of them (missing data denies); invoices carry
      // organizationId.
      const visibleAccounts = await filterAuthorizedRecords(
        ctx,
        FinancePolicyActions.AccountRead,
        "financial_account",
        accounts.value.items,
        (a) => ({ id: a.id, companyId: a.companyId }),
      );
      if (!visibleAccounts.ok) return visibleAccounts;

      const visibleInvoices = await filterAuthorizedRecords(
        ctx,
        FinancePolicyActions.InvoiceRead,
        "invoice",
        invoices.value.items,
        (i) => ({
          id: i.id,
          companyId: i.companyId,
          organizationId: i.organizationId,
        }),
      );
      if (!visibleInvoices.ok) return visibleInvoices;

      return ok({
        companyId: scope.value,
        accountCount: visibleAccounts.value.length,
        invoiceCount: visibleInvoices.value.length,
        draftInvoiceIds: visibleInvoices.value
          .filter((i) => i.status === "draft")
          .map((i) => i.id),
        issuedInvoiceIds: visibleInvoices.value
          .filter((i) => i.status === "issued")
          .map((i) => i.id),
        activeCreditAccountIds: [],
      });
    },
  };
}
