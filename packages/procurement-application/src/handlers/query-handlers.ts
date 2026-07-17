import type { QueryHandler } from "@afh/application";
import { filterAuthorizedRecords, principalListScope } from "@afh/application";
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
import {
  companyResource,
  loadRecordForAuthorization,
  requireCompanyId,
} from "../support/support.js";

export function createGetSupplierHandler(
  deps: ProcurementHandlerDeps,
): QueryHandler<GetSupplierPayload, Supplier> {
  return {
    queryType: ProcurementQueryTypes.GetSupplier,
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.suppliers.findById({ companyId: p.companyId, id: p.supplierId }),
      );
      return companyResource(
        "supplier",
        ProcurementPolicyActions.SupplierRead,
        p.companyId,
        p.supplierId,
        {
          organizationId: record?.identityOrganizationId ?? null,
          attributes: { categoryId: record?.categoryId ?? null },
        },
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
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.requisitions.findById({
          companyId: p.companyId,
          id: p.requisitionId,
        }),
      );
      return companyResource(
        "requisition",
        ProcurementPolicyActions.RequisitionRead,
        p.companyId,
        p.requisitionId,
        {
          ownerUserId: record?.requestedByUserId ?? null,
          attributes: {
            projectId: record?.projectId ?? null,
            warehouseId: record?.warehouseId ?? null,
          },
        },
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
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.purchaseOrders.findById({
          companyId: p.companyId,
          id: p.purchaseOrderId,
        }),
      );
      return companyResource(
        "purchase_order",
        ProcurementPolicyActions.PurchaseOrderRead,
        p.companyId,
        p.purchaseOrderId,
        {
          attributes: {
            supplierId: record?.supplierId ?? null,
            requisitionId: record?.requisitionId ?? null,
            projectId: record?.projectId ?? null,
            warehouseId: record?.warehouseId ?? null,
          },
        },
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
    authorize(query, ctx) {
      // RC5.7: the collection gate targets records within the caller's own
      // scopes; per-row Policy filtering in handle() enforces exactly that.
      return companyResource(
        "purchase_order",
        ProcurementPolicyActions.ProcurementSummaryRead,
        query.payload.companyId,
        null,
        principalListScope(
          ctx.principal,
          ProcurementPolicyActions.ProcurementSummaryRead,
        ),
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

      // RC5.7: Policy-filter every row before counting or projecting ids.
      // Suppliers and purchase orders persist no owner/org/branch fields, so
      // scoped principals see none of them (missing data denies).
      const visibleSuppliers = await filterAuthorizedRecords(
        ctx,
        ProcurementPolicyActions.SupplierRead,
        "supplier",
        suppliers.value.items,
        (s) => ({ id: s.id, companyId: s.companyId }),
      );
      if (!visibleSuppliers.ok) return visibleSuppliers;

      const visibleRequisitions = await filterAuthorizedRecords(
        ctx,
        ProcurementPolicyActions.RequisitionRead,
        "requisition",
        requisitions.value.items,
        (r) => ({
          id: r.id,
          companyId: r.companyId,
          ownerUserId: r.requestedByUserId,
        }),
      );
      if (!visibleRequisitions.ok) return visibleRequisitions;

      const visibleOrders = await filterAuthorizedRecords(
        ctx,
        ProcurementPolicyActions.PurchaseOrderRead,
        "purchase_order",
        orders.value.items,
        (o) => ({ id: o.id, companyId: o.companyId }),
      );
      if (!visibleOrders.ok) return visibleOrders;

      const filteredSuppliers = supplierFilter
        ? visibleSuppliers.value.filter((s) => s.id === supplierFilter)
        : visibleSuppliers.value;

      const filteredOrders = supplierFilter
        ? visibleOrders.value.filter((o) => o.supplierId === supplierFilter)
        : visibleOrders.value;

      const summary: ProcurementSummary = {
        companyId: scope.value,
        supplierId: supplierFilter,
        supplierCount: filteredSuppliers.length,
        requisitionCount: visibleRequisitions.value.length,
        purchaseOrderCount: filteredOrders.length,
        draftRequisitionIds: visibleRequisitions.value
          .filter((r) => r.status === "draft")
          .map((r) => r.id),
        submittedRequisitionIds: visibleRequisitions.value
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
