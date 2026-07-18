/**
 * RC7.2b — Procurement List* query handlers.
 * Authorization totals and paging via buildAuthorizedListPage (ADR D56).
 * Procurement remains owner of aggregates/repositories; this file only adds List*.
 */

import type { QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { Page } from "@afh/shared-kernel";
import type {
  PurchaseOrder,
  PurchaseRequisition,
  Supplier,
} from "@afh/procurement";
import {
  ProcurementPolicyActions,
  ProcurementQueryTypes,
} from "../constants.js";
import type {
  ListPurchaseOrderPayload,
  ListPurchaseRequisitionPayload,
  ListSupplierPayload,
} from "../queries/queries.js";
import {
  listPurchaseOrderQueryValidator,
  listPurchaseRequisitionQueryValidator,
  listSupplierQueryValidator,
} from "../validators/validators.js";
import type { ProcurementHandlerDeps } from "./deps.js";
import { companyResource, requireCompanyId } from "../support/support.js";
import { createProcurementListCandidateFetcher } from "./list-support.js";

export {
  SUPPLIER_FILTER_FIELDS,
  SUPPLIER_SORT_FIELDS,
  REQUISITION_FILTER_FIELDS,
  REQUISITION_SORT_FIELDS,
  PURCHASE_ORDER_FILTER_FIELDS,
  PURCHASE_ORDER_SORT_FIELDS,
} from "../list-fields.js";

export function createListSupplierHandler(
  deps: ProcurementHandlerDeps,
): QueryHandler<ListSupplierPayload, Page<Supplier>> {
  return {
    queryType: ProcurementQueryTypes.ListSupplier,
    authorize(query, ctx) {
      return companyResource(
        "supplier",
        ProcurementPolicyActions.SupplierRead,
        query.payload.companyId,
        null,
        principalListScope(
          ctx.principal,
          ProcurementPolicyActions.SupplierRead,
        ),
      );
    },
    validate() {
      return listSupplierQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Supplier>({
        ctx,
        action: ProcurementPolicyActions.SupplierRead,
        resourceType: "supplier",
        request,
        toScope: (s) => ({
          id: s.id,
          companyId: s.companyId,
          organizationId: s.identityOrganizationId,
        }),
        fetchCandidates: createProcurementListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.suppliers.listByCompany(companyId, page),
          request,
          searchFields: ["name", "code"],
        }),
      });
    },
  };
}

export function createListPurchaseRequisitionHandler(
  deps: ProcurementHandlerDeps,
): QueryHandler<ListPurchaseRequisitionPayload, Page<PurchaseRequisition>> {
  return {
    queryType: ProcurementQueryTypes.ListPurchaseRequisition,
    authorize(query, ctx) {
      return companyResource(
        "requisition",
        ProcurementPolicyActions.RequisitionRead,
        query.payload.companyId,
        null,
        principalListScope(
          ctx.principal,
          ProcurementPolicyActions.RequisitionRead,
        ),
      );
    },
    validate() {
      return listPurchaseRequisitionQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<PurchaseRequisition>({
        ctx,
        action: ProcurementPolicyActions.RequisitionRead,
        resourceType: "requisition",
        request,
        toScope: (r) => ({
          id: r.id,
          companyId: r.companyId,
          ownerUserId: r.requestedByUserId,
        }),
        fetchCandidates: createProcurementListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.requisitions.listByCompany(companyId, page),
          request,
          searchFields: ["number", "notes"],
        }),
      });
    },
  };
}

export function createListPurchaseOrderHandler(
  deps: ProcurementHandlerDeps,
): QueryHandler<ListPurchaseOrderPayload, Page<PurchaseOrder>> {
  return {
    queryType: ProcurementQueryTypes.ListPurchaseOrder,
    authorize(query, ctx) {
      return companyResource(
        "purchase_order",
        ProcurementPolicyActions.PurchaseOrderRead,
        query.payload.companyId,
        null,
        principalListScope(
          ctx.principal,
          ProcurementPolicyActions.PurchaseOrderRead,
        ),
      );
    },
    validate() {
      return listPurchaseOrderQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<PurchaseOrder>({
        ctx,
        action: ProcurementPolicyActions.PurchaseOrderRead,
        resourceType: "purchase_order",
        request,
        toScope: (o) => ({
          id: o.id,
          companyId: o.companyId,
        }),
        fetchCandidates: createProcurementListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.purchaseOrders.listByCompany(companyId, page),
          request,
          searchFields: ["number"],
        }),
      });
    },
  };
}
