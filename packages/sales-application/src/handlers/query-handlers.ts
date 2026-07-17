import type { QueryHandler } from "@afh/application";
import { filterAuthorizedRecords, principalListScope } from "@afh/application";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type { Opportunity, Quote, QuoteLine, SalesOrder, SalesOrderLine } from "@afh/sales";
import { SalesPolicyActions, SalesQueryTypes } from "../constants.js";
import type {
  CustomerSalesSummary,
  GetCustomerSalesSummaryPayload,
  GetOpportunityPayload,
  GetQuotePayload,
  GetSalesOrderPayload,
} from "../queries/queries.js";
import {
  getCustomerSalesSummaryQueryValidator,
  getOpportunityQueryValidator,
  getQuoteQueryValidator,
  getSalesOrderQueryValidator,
} from "../validators/validators.js";
import type { SalesHandlerDeps } from "./deps.js";
import {
  companyResource,
  loadRecordForAuthorization,
  requireCompanyId,
} from "../support/support.js";

export function createGetOpportunityHandler(
  deps: SalesHandlerDeps,
): QueryHandler<GetOpportunityPayload, Opportunity> {
  return {
    queryType: SalesQueryTypes.GetOpportunity,
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.opportunities.findById({
          companyId: p.companyId,
          id: p.opportunityId,
        }),
      );
      return companyResource(
        "opportunity",
        SalesPolicyActions.OpportunityRead,
        p.companyId,
        p.opportunityId,
        {
          ownerUserId: record?.salesRepUserId ?? null,
          organizationId: record?.organizationId ?? null,
          attributes: {
            customerId: record?.customerId ?? null,
            projectId: record?.projectId ?? null,
          },
        },
      );
    },
    validate() {
      return getOpportunityQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.opportunities.findById({
        companyId: scope.value,
        id: query.payload.opportunityId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Opportunity not found", {
            code: "opportunity_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetQuoteHandler(
  deps: SalesHandlerDeps,
): QueryHandler<
  GetQuotePayload,
  { quote: Quote; lines: readonly QuoteLine[] }
> {
  return {
    queryType: SalesQueryTypes.GetQuote,
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.quotes.findById({ companyId: p.companyId, id: p.quoteId }),
      );
      return companyResource(
        "quote",
        SalesPolicyActions.QuoteRead,
        p.companyId,
        p.quoteId,
        {
          ownerUserId: record?.salesRepUserId ?? null,
          organizationId: record?.organizationId ?? null,
          attributes: {
            customerId: record?.customerId ?? null,
            projectId: record?.projectId ?? null,
          },
        },
      );
    },
    validate() {
      return getQuoteQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.quotes.findById({
        companyId: scope.value,
        id: query.payload.quoteId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Quote not found", { code: "quote_not_found" }),
        );
      }

      let lines: readonly QuoteLine[] = [];
      if (query.payload.includeLines !== false && found.value.currentRevisionId) {
        const listed = await deps.quotes.listLines(
          scope.value,
          found.value.id,
          found.value.currentRevisionId,
        );
        if (!listed.ok) return listed;
        lines = listed.value;
      }

      return ok({ quote: found.value, lines });
    },
  };
}

export function createGetSalesOrderHandler(
  deps: SalesHandlerDeps,
): QueryHandler<
  GetSalesOrderPayload,
  { order: SalesOrder; lines: readonly SalesOrderLine[] }
> {
  return {
    queryType: SalesQueryTypes.GetSalesOrder,
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.orders.findById({ companyId: p.companyId, id: p.salesOrderId }),
      );
      return companyResource(
        "order",
        SalesPolicyActions.OrderRead,
        p.companyId,
        p.salesOrderId,
        {
          ownerUserId: record?.salesRepUserId ?? null,
          organizationId: record?.organizationId ?? null,
          attributes: {
            customerId: record?.customerId ?? null,
            projectId: record?.projectId ?? null,
          },
        },
      );
    },
    validate() {
      return getSalesOrderQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.orders.findById({
        companyId: scope.value,
        id: query.payload.salesOrderId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Sales order not found", {
            code: "sales_order_not_found",
          }),
        );
      }

      let lines: readonly SalesOrderLine[] = [];
      if (query.payload.includeLines !== false) {
        const listed = await deps.orders.listLines(
          scope.value,
          found.value.id,
        );
        if (!listed.ok) return listed;
        lines = listed.value;
      }

      return ok({ order: found.value, lines });
    },
  };
}

export function createGetCustomerSalesSummaryHandler(
  deps: SalesHandlerDeps,
): QueryHandler<GetCustomerSalesSummaryPayload, CustomerSalesSummary> {
  return {
    queryType: SalesQueryTypes.GetCustomerSalesSummary,
    authorize(query, ctx) {
      // RC5.7: the collection gate targets records within the caller's own
      // scopes; per-row Policy filtering in handle() enforces exactly that.
      return companyResource(
        "order",
        SalesPolicyActions.CustomerSalesSummaryRead,
        query.payload.companyId,
        null,
        principalListScope(
          ctx.principal,
          SalesPolicyActions.CustomerSalesSummaryRead,
        ),
      );
    },
    validate() {
      return getCustomerSalesSummaryQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const customerId = query.payload.customerId;
      const page = { page: 1, pageSize: 500 };

      const opportunities = await deps.opportunities.listByCompany(
        scope.value,
        page,
      );
      if (!opportunities.ok) return opportunities;

      const quotes = await deps.quotes.listByCompany(scope.value, page);
      if (!quotes.ok) return quotes;

      const orders = await deps.orders.listByCompany(scope.value, page);
      if (!orders.ok) return orders;

      // RC5.7: Policy-filter every row before counting or projecting ids.
      const visibleOpps = await filterAuthorizedRecords(
        ctx,
        SalesPolicyActions.OpportunityRead,
        "opportunity",
        opportunities.value.items,
        (o) => ({
          id: o.id,
          companyId: o.companyId,
          ownerUserId: o.salesRepUserId,
          organizationId: o.organizationId,
        }),
      );
      if (!visibleOpps.ok) return visibleOpps;

      const visibleQuotes = await filterAuthorizedRecords(
        ctx,
        SalesPolicyActions.QuoteRead,
        "quote",
        quotes.value.items,
        (q) => ({
          id: q.id,
          companyId: q.companyId,
          ownerUserId: q.salesRepUserId,
          organizationId: q.organizationId,
        }),
      );
      if (!visibleQuotes.ok) return visibleQuotes;

      const visibleOrders = await filterAuthorizedRecords(
        ctx,
        SalesPolicyActions.OrderRead,
        "order",
        orders.value.items,
        (o) => ({
          id: o.id,
          companyId: o.companyId,
          ownerUserId: o.salesRepUserId,
          organizationId: o.organizationId,
        }),
      );
      if (!visibleOrders.ok) return visibleOrders;

      const customerOpps = visibleOpps.value.filter(
        (o) => o.customerId === customerId,
      );
      const customerQuotes = visibleQuotes.value.filter(
        (q) => q.customerId === customerId,
      );
      const customerOrders = visibleOrders.value.filter(
        (o) => o.customerId === customerId,
      );

      const summary: CustomerSalesSummary = {
        companyId: scope.value,
        customerId,
        opportunityCount: customerOpps.length,
        quoteCount: customerQuotes.length,
        orderCount: customerOrders.length,
        openOpportunityIds: customerOpps
          .filter((o) => o.status !== "won" && o.status !== "lost" && o.status !== "cancelled")
          .map((o) => o.id),
        draftQuoteIds: customerQuotes
          .filter((q) => q.status === "draft")
          .map((q) => q.id),
        activeOrderIds: customerOrders
          .filter(
            (o) =>
              o.status !== "cancelled" && o.status !== "completed",
          )
          .map((o) => o.id),
      };

      return ok(summary);
    },
  };
}
