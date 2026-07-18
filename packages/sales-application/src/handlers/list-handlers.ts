/**
 * RC7.2a — Sales List* query handlers.
 * Authorization totals and paging via buildAuthorizedListPage (ADR D56).
 */

import type { QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { Page } from "@afh/shared-kernel";
import type { Opportunity, Quote, SalesOrder } from "@afh/sales";
import { SalesPolicyActions, SalesQueryTypes } from "../constants.js";
import type {
  ListOpportunityPayload,
  ListQuotePayload,
  ListSalesOrderPayload,
} from "../queries/queries.js";
import {
  listOpportunityQueryValidator,
  listQuoteQueryValidator,
  listSalesOrderQueryValidator,
} from "../validators/validators.js";
import type { SalesHandlerDeps } from "./deps.js";
import {
  companyResource,
  requireCompanyId,
} from "../support/support.js";
import {
  createSalesListCandidateFetcher,
} from "./list-support.js";

export {
  OPPORTUNITY_FILTER_FIELDS,
  OPPORTUNITY_SORT_FIELDS,
  QUOTE_FILTER_FIELDS,
  QUOTE_SORT_FIELDS,
  SALES_ORDER_FILTER_FIELDS,
  SALES_ORDER_SORT_FIELDS,
} from "../list-fields.js";

export function createListOpportunityHandler(
  deps: SalesHandlerDeps,
): QueryHandler<ListOpportunityPayload, Page<Opportunity>> {
  return {
    queryType: SalesQueryTypes.ListOpportunity,
    authorize(query, ctx) {
      return companyResource(
        "opportunity",
        SalesPolicyActions.OpportunityRead,
        query.payload.companyId,
        null,
        principalListScope(
          ctx.principal,
          SalesPolicyActions.OpportunityRead,
        ),
      );
    },
    validate() {
      return listOpportunityQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Opportunity>({
        ctx,
        action: SalesPolicyActions.OpportunityRead,
        resourceType: "opportunity",
        request,
        toScope: (o) => ({
          id: o.id,
          companyId: o.companyId,
          ownerUserId: o.salesRepUserId,
          organizationId: o.organizationId,
        }),
        fetchCandidates: createSalesListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.opportunities.listByCompany(companyId, page),
          request,
          searchFields: ["title", "code"],
        }),
      });
    },
  };
}

export function createListQuoteHandler(
  deps: SalesHandlerDeps,
): QueryHandler<ListQuotePayload, Page<Quote>> {
  return {
    queryType: SalesQueryTypes.ListQuote,
    authorize(query, ctx) {
      return companyResource(
        "quote",
        SalesPolicyActions.QuoteRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, SalesPolicyActions.QuoteRead),
      );
    },
    validate() {
      return listQuoteQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Quote>({
        ctx,
        action: SalesPolicyActions.QuoteRead,
        resourceType: "quote",
        request,
        toScope: (q) => ({
          id: q.id,
          companyId: q.companyId,
          ownerUserId: q.salesRepUserId,
          organizationId: q.organizationId,
        }),
        fetchCandidates: createSalesListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.quotes.listByCompany(companyId, page),
          request,
          searchFields: ["number"],
        }),
      });
    },
  };
}

export function createListSalesOrderHandler(
  deps: SalesHandlerDeps,
): QueryHandler<ListSalesOrderPayload, Page<SalesOrder>> {
  return {
    queryType: SalesQueryTypes.ListSalesOrder,
    authorize(query, ctx) {
      return companyResource(
        "order",
        SalesPolicyActions.OrderRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, SalesPolicyActions.OrderRead),
      );
    },
    validate() {
      return listSalesOrderQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<SalesOrder>({
        ctx,
        action: SalesPolicyActions.OrderRead,
        resourceType: "order",
        request,
        toScope: (o) => ({
          id: o.id,
          companyId: o.companyId,
          ownerUserId: o.salesRepUserId,
          organizationId: o.organizationId,
        }),
        fetchCandidates: createSalesListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.orders.listByCompany(companyId, page),
          request,
          searchFields: ["number"],
        }),
      });
    },
  };
}
