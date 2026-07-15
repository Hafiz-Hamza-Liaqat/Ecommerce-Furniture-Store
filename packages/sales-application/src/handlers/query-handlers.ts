import type { QueryHandler } from "@afh/application";
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
import { companyResource, requireCompanyId } from "../support/support.js";

export function createGetOpportunityHandler(
  deps: SalesHandlerDeps,
): QueryHandler<GetOpportunityPayload, Opportunity> {
  return {
    queryType: SalesQueryTypes.GetOpportunity,
    authorize(query) {
      return companyResource(
        "opportunity",
        SalesPolicyActions.OpportunityRead,
        query.payload.companyId,
        query.payload.opportunityId,
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
    authorize(query) {
      return companyResource(
        "quote",
        SalesPolicyActions.QuoteRead,
        query.payload.companyId,
        query.payload.quoteId,
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
    authorize(query) {
      return companyResource(
        "order",
        SalesPolicyActions.OrderRead,
        query.payload.companyId,
        query.payload.salesOrderId,
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
    authorize(query) {
      return companyResource(
        "order",
        SalesPolicyActions.CustomerSalesSummaryRead,
        query.payload.companyId,
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

      const customerOpps = opportunities.value.items.filter(
        (o) => o.customerId === customerId,
      );
      const customerQuotes = quotes.value.items.filter(
        (q) => q.customerId === customerId,
      );
      const customerOrders = orders.value.items.filter(
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
