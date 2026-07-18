/**
 * RC7.2d — Finance List* query handlers.
 * Authorization totals and paging via buildAuthorizedListPage (ADR D56).
 * Finance remains owner of aggregates/repositories; this file only adds List*.
 * ListLedger returns ledger headers only — entries remain outside RC7.2d.
 */

import type { QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { Page } from "@afh/shared-kernel";
import { ok } from "@afh/shared-kernel";
import type {
  FinancialAccount,
  FinancialLedger,
  Invoice,
  Payment,
} from "@afh/finance";
import { FinancePolicyActions, FinanceQueryTypes } from "../constants.js";
import type {
  ListFinancialAccountPayload,
  ListInvoicePayload,
  ListLedgerPayload,
  ListPaymentPayload,
} from "../queries/queries.js";
import {
  listFinancialAccountQueryValidator,
  listInvoiceQueryValidator,
  listLedgerQueryValidator,
  listPaymentQueryValidator,
} from "../validators/validators.js";
import type { FinanceHandlerDeps } from "./deps.js";
import { companyResource, requireCompanyId } from "../support/support.js";
import { createFinanceListCandidateFetcher } from "./list-support.js";
import {
  projectInvoiceFields,
  projectPaymentFields,
  type InvoiceFieldView,
  type PaymentFieldView,
} from "../security/field-security.js";

export {
  FINANCIAL_ACCOUNT_FILTER_FIELDS,
  FINANCIAL_ACCOUNT_SORT_FIELDS,
  INVOICE_FILTER_FIELDS,
  INVOICE_SORT_FIELDS,
  PAYMENT_FILTER_FIELDS,
  PAYMENT_SORT_FIELDS,
  LEDGER_FILTER_FIELDS,
  LEDGER_SORT_FIELDS,
} from "../list-fields.js";

export function createListFinancialAccountHandler(
  deps: FinanceHandlerDeps,
): QueryHandler<ListFinancialAccountPayload, Page<FinancialAccount>> {
  return {
    queryType: FinanceQueryTypes.ListFinancialAccount,
    authorize(query, ctx) {
      return companyResource(
        "financial_account",
        FinancePolicyActions.AccountRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, FinancePolicyActions.AccountRead),
      );
    },
    validate() {
      return listFinancialAccountQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<FinancialAccount>({
        ctx,
        action: FinancePolicyActions.AccountRead,
        resourceType: "financial_account",
        request,
        toScope: (a) => ({
          id: a.id,
          companyId: a.companyId,
        }),
        fetchCandidates: createFinanceListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.accounts.listByCompany(companyId, page),
          request,
          searchFields: ["name", "code"],
        }),
      });
    },
  };
}

export function createListInvoiceHandler(
  deps: FinanceHandlerDeps,
): QueryHandler<ListInvoicePayload, Page<InvoiceFieldView>> {
  return {
    queryType: FinanceQueryTypes.ListInvoice,
    authorize(query, ctx) {
      return companyResource(
        "invoice",
        FinancePolicyActions.InvoiceRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, FinancePolicyActions.InvoiceRead),
      );
    },
    validate() {
      return listInvoiceQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      const page = await buildAuthorizedListPage<Invoice>({
        ctx,
        action: FinancePolicyActions.InvoiceRead,
        resourceType: "invoice",
        request,
        toScope: (inv) => ({
          id: inv.id,
          companyId: inv.companyId,
          organizationId: inv.organizationId,
          attributes: {
            customerId: inv.customerId,
            billToAddressId: inv.billToAddressId,
          },
        }),
        fetchCandidates: createFinanceListCandidateFetcher({
          listByCompany: (companyId, pageReq) =>
            deps.invoices.listByCompany(companyId, pageReq),
          request,
          searchFields: ["number"],
        }),
      });
      if (!page.ok) return page;

      const projected: InvoiceFieldView[] = [];
      for (const inv of page.value.items) {
        const resource = companyResource(
          "invoice",
          FinancePolicyActions.InvoiceRead,
          inv.companyId,
          inv.id,
          {
            organizationId: inv.organizationId,
            attributes: {
              customerId: inv.customerId,
              billToAddressId: inv.billToAddressId,
            },
          },
        ).resource;
        const proj = await projectInvoiceFields(
          ctx,
          deps.audit,
          resource,
          inv,
          [],
        );
        if (!proj.ok) return proj;
        projected.push(proj.value.invoice);
      }

      return ok({
        ...page.value,
        items: projected,
      });
    },
  };
}

export function createListPaymentHandler(
  deps: FinanceHandlerDeps,
): QueryHandler<ListPaymentPayload, Page<PaymentFieldView>> {
  return {
    queryType: FinanceQueryTypes.ListPayment,
    authorize(query, ctx) {
      return companyResource(
        "payment",
        FinancePolicyActions.PaymentRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, FinancePolicyActions.PaymentRead),
      );
    },
    validate() {
      return listPaymentQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      const page = await buildAuthorizedListPage<Payment>({
        ctx,
        action: FinancePolicyActions.PaymentRead,
        resourceType: "payment",
        request,
        toScope: (p) => ({
          id: p.id,
          companyId: p.companyId,
          organizationId: p.payerOrganizationId,
          attributes: {
            invoiceId: p.invoiceId,
            payerCustomerId: p.payerCustomerId,
          },
        }),
        fetchCandidates: createFinanceListCandidateFetcher({
          listByCompany: (companyId, pageReq) =>
            deps.payments.listByCompany(companyId, pageReq),
          request,
          searchFields: ["externalRef", "invoiceId"],
        }),
      });
      if (!page.ok) return page;

      const projected: PaymentFieldView[] = [];
      for (const payment of page.value.items) {
        const resource = companyResource(
          "payment",
          FinancePolicyActions.PaymentRead,
          payment.companyId,
          payment.id,
          {
            organizationId: payment.payerOrganizationId,
            attributes: {
              invoiceId: payment.invoiceId,
              payerCustomerId: payment.payerCustomerId,
            },
          },
        ).resource;
        const proj = await projectPaymentFields(
          ctx,
          deps.audit,
          resource,
          payment,
        );
        if (!proj.ok) return proj;
        projected.push(proj.value);
      }

      return ok({
        ...page.value,
        items: projected,
      });
    },
  };
}

/**
 * ListLedger returns ledger headers only.
 * Ledger entries/accounting line details remain outside RC7.2d.
 */
export function createListLedgerHandler(
  deps: FinanceHandlerDeps,
): QueryHandler<ListLedgerPayload, Page<FinancialLedger>> {
  return {
    queryType: FinanceQueryTypes.ListLedger,
    authorize(query, ctx) {
      return companyResource(
        "ledger",
        FinancePolicyActions.LedgerRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, FinancePolicyActions.LedgerRead),
      );
    },
    validate() {
      return listLedgerQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<FinancialLedger>({
        ctx,
        action: FinancePolicyActions.LedgerRead,
        resourceType: "ledger",
        request,
        toScope: (l) => ({
          id: l.id,
          companyId: l.companyId,
        }),
        fetchCandidates: createFinanceListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.ledgers.listByCompany(companyId, page),
          request,
          searchFields: ["name", "code"],
        }),
      });
    },
  };
}
