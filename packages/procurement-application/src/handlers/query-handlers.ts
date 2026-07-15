import type { QueryHandler } from "@afh/application";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseRequisition,
  RequisitionLine,
  Supplier,
} from "@afh/procurement";
import {
  ProcurementPolicyActions,
  ProcurementQueryTypes,
} from "../constants.js";
import type {
  GetProcurementSummaryPayload,
  GetPurchaseOrderPayload,
  GetPurchaseRequisitionPayload,
  GetSupplierPayload,
  ProcurementSummary,
} from "../queries/queries.js";
import {
  getProcurementSummaryQueryValidator,
  getPurchaseOrderQueryValidator,
  getPurchaseRequisitionQueryValidator,
  getSupplierQueryValidator,
} from "../validators/validators.js";
import type { ProcurementHandlerDeps } from "./deps.js";
import { companyResource, requireCompanyId } from "../support/support.js";

export function createGetSupplierHandler(
  deps: ProcurementHandlerDeps,
): QueryHandler<GetSupplierPayload, Supplier> {
  return {
    queryType: ProcurementQueryTypes.GetSupplier,
    authorize(query) {
      return companyResource(
        "supplier",
        ProcurementPolicyActions.SupplierRead,
        query.payload.companyId,
        query.payload.supplierId,
      );
    },
    validate() {
      return getSupplierQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.suppliers.findById({
        companyId: scope.value,
        id: query.payload.supplierId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Supplier not found", {
            code: "supplier_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetPurchaseRequisitionHandler(
  deps: ProcurementHandlerDeps,
): QueryHandler<
  GetPurchaseRequisitionPayload,
  { requisition: PurchaseRequisition; lines: readonly RequisitionLine[] }
> {
  return {
    queryType: ProcurementQueryTypes.GetPurchaseRequisition,
    authorize(query) {
      return companyResource(
        "requisition",
        ProcurementPolicyActions.RequisitionRead,
        query.payload.companyId,
        query.payload.requisitionId,
      );
    },
    validate() {
      return getPurchaseRequisitionQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.requisitions.findById({
        companyId: scope.value,
        id: query.payload.requisitionId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Purchase requisition not found", {
            code: "requisition_not_found",
          }),
        );
      }

      let lines: readonly RequisitionLine[] = [];
      if (query.payload.includeLines !== false) {
        const listed = await deps.requisitions.listLines(
          scope.value,
          found.value.id,
        );
        if (!listed.ok) return listed;
        lines = listed.value;
      }

      return ok({ requisition: found.value, lines });
    },
  };
}

export function createGetPurchaseOrderHandler(
  deps: ProcurementHandlerDeps,
): QueryHandler<
  GetPurchaseOrderPayload,
  { order: PurchaseOrder; lines: readonly PurchaseOrderLine[] }
> {
  return {
    queryType: ProcurementQueryTypes.GetPurchaseOrder,
    authorize(query) {
      return companyResource(
        "purchase_order",
        ProcurementPolicyActions.PurchaseOrderRead,
        query.payload.companyId,
        query.payload.purchaseOrderId,
      );
    },
    validate() {
      return getPurchaseOrderQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.purchaseOrders.findById({
        companyId: scope.value,
        id: query.payload.purchaseOrderId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Purchase order not found", {
            code: "purchase_order_not_found",
          }),
        );
      }

      let lines: readonly PurchaseOrderLine[] = [];
      if (query.payload.includeLines !== false) {
        const listed = await deps.purchaseOrders.listLines(
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

export function createGetProcurementSummaryHandler(
  deps: ProcurementHandlerDeps,
): QueryHandler<GetProcurementSummaryPayload, ProcurementSummary> {
  return {
    queryType: ProcurementQueryTypes.GetProcurementSummary,
    authorize(query) {
      return companyResource(
        "purchase_order",
        ProcurementPolicyActions.ProcurementSummaryRead,
        query.payload.companyId,
      );
    },
    validate() {
      return getProcurementSummaryQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const supplierFilter = query.payload.supplierId ?? null;
      const page = { page: 1, pageSize: 500 };

      const suppliers = await deps.suppliers.listByCompany(scope.value, page);
      if (!suppliers.ok) return suppliers;

      const requisitions = await deps.requisitions.listByCompany(
        scope.value,
        page,
      );
      if (!requisitions.ok) return requisitions;

      const orders = await deps.purchaseOrders.listByCompany(
        scope.value,
        page,
      );
      if (!orders.ok) return orders;

      const filteredSuppliers = supplierFilter
        ? suppliers.value.items.filter((s) => s.id === supplierFilter)
        : suppliers.value.items;

      const filteredOrders = supplierFilter
        ? orders.value.items.filter((o) => o.supplierId === supplierFilter)
        : orders.value.items;

      const summary: ProcurementSummary = {
        companyId: scope.value,
        supplierId: supplierFilter,
        supplierCount: filteredSuppliers.length,
        requisitionCount: requisitions.value.items.length,
        purchaseOrderCount: filteredOrders.length,
        draftRequisitionIds: requisitions.value.items
          .filter((r) => r.status === "draft")
          .map((r) => r.id),
        submittedRequisitionIds: requisitions.value.items
          .filter((r) => r.status === "submitted")
          .map((r) => r.id),
        draftPurchaseOrderIds: filteredOrders
          .filter((o) => o.status === "draft")
          .map((o) => o.id),
        issuedPurchaseOrderIds: filteredOrders
          .filter((o) => o.status === "issued")
          .map((o) => o.id),
      };

      return ok(summary);
    },
  };
}
